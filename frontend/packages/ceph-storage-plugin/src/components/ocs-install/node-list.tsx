import * as React from 'react';
import * as _ from 'lodash';
import * as classNames from 'classnames';
import { connect } from 'react-redux';
import {
  Table,
  TableHeader,
  TableBody,
  TableVariant,
} from '@patternfly/react-table';
import { tableFilters } from '@console/internal/components/factory/table-filters';
import { ActionGroup, Button } from '@patternfly/react-core';
import { ButtonBar } from '@console/internal/components/utils/button-bar';
import { history } from '@console/internal/components/utils/router';
import {
  SelectorInput,
  humanizeCpuCores,
  humanizeBinaryBytes,
  ResourceLink,
} from '@console/internal/components/utils/index';
import {
  getNodeRoles,
  k8sCreate,
  k8sPatch,
  NodeKind,
  referenceForModel,
  k8sGet,
  K8sResourceKind,
} from '@console/internal/module/k8s';
import { NodeModel, InfrastructureModel, StorageClassModel } from '@console/internal/models';
import { OCSServiceModel } from '../../models';
import { minSelectedNode, labelObj, ocsRequestData, taintObj } from '../../constants/ocs-install';

const ocsLabel = 'cluster.ocs.openshift.io/openshift-storage';

const infraProvisionerMap = {
  'aws': 'kubernetes.io/aws-ebs',
  'vsphere': 'kubernetes.io/vsphere-volume'
};

const getConvertedUnits = (value, initialUnit) => {
  return (
    humanizeBinaryBytes(_.slice(value, 0, value.length - 2).join(''), initialUnit).string || '-'
  );
};

const tableColumnClasses = [
  classNames('col-md-1', 'col-sm-1', 'col-xs-2'),
  classNames('col-md-5', 'col-sm-6', 'col-xs-8'),
  classNames('col-md-2', 'col-sm-3', 'col-xs-2'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'col-sm-2', 'hidden-xs'),
];

const getColumns = () => {
  return [
    {
      title: 'Name',
      props: { className: tableColumnClasses[1] },
    },
    {
      title: 'Role',
      props: { className: tableColumnClasses[2] },
    },
    {
      title: 'CPU',
      props: { className: tableColumnClasses[3] },
    },
    {
      title: 'Memory',
      props: { className: tableColumnClasses[4] },
    },
  ];
};

// return an empty array when there is no data
const getRows = (nodes) => {
  return nodes.map((node) => {
    const roles = getNodeRoles(node).sort();
    const obj = {
      cells: [],
      selected: false,
      id: node.metadata.name,
      metadata: _.clone(node.metadata),
      spec: _.clone(node.spec),
    };
    obj.cells = [
      {
        title: <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />,
      },
      {
        title: roles.join(', ') || '-',
      },
      {
        title: `${humanizeCpuCores(_.get(node.status, 'capacity.cpu')).string || '-'} CPU`,
      },
      {
        title: `${getConvertedUnits(_.get(node.status, 'allocatable.memory'), 'KiB')}`,
      },
    ];
    return obj;
  });
};

const getFilteredRows = (filters: object, objects: any[]) => {
  if (_.isEmpty(filters)) {
    return objects;
  }

  const allTableFilters = {...tableFilters};
  let filteredObjects = objects;
  _.each(filters, (value, name) => {
    const filter = allTableFilters[name];
    if (_.isFunction(filter)) {
      filteredObjects = _.filter(filteredObjects, (o) => filter(value, o));
    }
  });

  return filteredObjects;
};

const getPreSelectedNodes = (nodes) => {
  nodes.forEach((node) => {
    node.selected = _.has(node, ['metadata', 'labels', ocsLabel]);
  });
};

const stateToProps = (obj, { data = [], filters = {}, staticFilters = [{}] }) => {
  const allFilters = staticFilters ? Object.assign({}, filters, ...staticFilters) : filters;
  const newData = getFilteredRows(allFilters, data);
  return {
    data: newData,
    unfilteredData: data,
  };
};

const CustomNodeTable: React.FC<CustomNodeTableProps> = ({ data, loaded, ocsProps }) => {
  const columns = getColumns();
  const [nodes, setNodes] = React.useState([]);
  const [error, setError] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);
  const [selectedNodesCnt, setSelectedNodesCnt] = React.useState(0);

  let storageClass = '';

  React.useEffect(() => {
    const selectedNode = _.filter(nodes, 'selected').length;
    setSelectedNodesCnt(selectedNode);
  }, [nodes]);

  React.useEffect(() => {
    const formattedNodes = getRows(data);
    // pre-selection of nodes
    if (loaded && !nodes.length) {
      getPreSelectedNodes(formattedNodes);
      setNodes(formattedNodes);
    }
    // for getting nodes
    else if (formattedNodes.length) {
      nodes.forEach((row) => {
        if (row.selected) {
          const index = formattedNodes.findIndex((r) => r.id === row.id);
          formattedNodes[index].selected = true;
        }
      });
      setNodes(formattedNodes);
    }
  }, [data, loaded, nodes]);

  const onSelect = (
    event: React.MouseEvent<HTMLButtonElement>, 
    isSelected: boolean, 
    index: number, 
    node: {id: string}
  ) => {
    event.stopPropagation();
    let formattedNodes;
    if (index === -1) {
      formattedNodes = nodes.map(node => {
        node.selected = isSelected;
        return node;
      });
    } else {
      formattedNodes = [...nodes];
      const nIndex = formattedNodes.findIndex(r => r.id === node.id);
      formattedNodes[nIndex].selected = isSelected;
    }
    setNodes(formattedNodes);
  };

  // labeling the selected nodes
  const makeLabelNodesRequest: Promise<K8sResourceKind>[] = (selectedNode: NodeKind[]) => {
    const labelPath = '/metadata/labels';
    const labelData = selectedNode.map((node: NodeKind) => {
      const labels = SelectorInput.arrayify(_.get(node, labelPath.split('/').slice(1)));
      const lblVal = { ...SelectorInput.objectify(labels), ...labelObj };
      const patch = [
        {
          op: labels.length ? 'replace' : 'add',
          value: lblVal,
          path: labelPath,
        },
      ];
      return k8sPatch(NodeModel, node, patch) as Promise<NodeKind>;
    });
    return labelData;
  };

  // tainting the selected nodes
  const makeTaintNodesRequest = (selectedNode: NodeKind[]) => {
    const taintData = selectedNode
      .filter((node: NodeKind) => {
        const roles = getNodeRoles(node);
        // don't taint master nodes as its already tainted
        return roles.indexOf('master') === -1;
      })
      .map(node => {
        const taints = node.spec && node.spec.taints ? [...node.spec.taints, taintObj] : [taintObj];
        const patch = [
          {
            value: taints,
            path: '/spec/taints',
            op: node.spec.taints ? 'replace' : 'add',
          },
        ];
        return k8sPatch(NodeModel, node, patch);
      });

    return taintData;
  };

  const makeOCSRequest = () =>  {
    const selectedData: NodeKind[] = _.filter(nodes, 'selected');
    let promises = [];

    promises.push(...makeLabelNodesRequest(selectedData));
    promises.push(...makeTaintNodesRequest(selectedData));
    
    const ocsObj = _.cloneDeep(ocsRequestData);
    ocsObj.spec.storageDeviceSets.storageClassName = storageClass;
    promises.push(k8sCreate(OCSServiceModel, ocsObj));

    // Promise.all(promises)
    //   .then(() => {
    //     history.push(
    //       `/k8s/ns/${ocsProps.namespace}/clusterserviceversions/${
    //         ocsProps.clusterServiceVersion.metadata.name
    //       }/${referenceForModel(OCSServiceModel)}/${ocsObj.metadata.name}`,
    //     );
    //     setProgress(false);
    //     setError('');
    //   })
    //   .catch((err) => {
    //     setProgress(false);
    //     setError(err.message);
    //   });
  };

  const submit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setProgress(true);
    setError('');

    let provisioner = [];

    k8sGet(InfrastructureModel, 'cluster')
      .then(infra => {
        provisioner = infraProvisionerMap[_.lowerCase(_.get(infra, 'status.platform'))];
        return k8sGet(StorageClassModel);
      }).then(scData => {
        let scList = _.get(scData, 'items');
        scList = scList.filter(sc => sc.provisioner === provisioner);
        // taking the 1st storage class always
        storageClass = _.get(scList[0], 'metadata.name');
        makeOCSRequest();
      }).catch(err => {
        setProgress(false);
        setError(err.message);
      });
    
  };

  return (
    <>
      <Table
        onSelect={onSelect}
        cells={columns}
        rows={nodes}
        variant={TableVariant.compact}
      >
        <TableHeader />
        <TableBody />
      </Table>
      <p className="control-label help-block" id="nodes-selected">
        {selectedNodesCnt} node(s) selected
      </p>
      <ButtonBar errorMessage={error} inProgress={inProgress}>
        <ActionGroup className="pf-c-form">
          <Button
            type="button"
            variant="primary"
            onClick={submit}
            isDisabled={selectedNodesCnt < minSelectedNode}
          >
            Create
          </Button>
          <Button type="button" variant="secondary" onClick={history.goBack}>
            Cancel
          </Button>
        </ActionGroup>
      </ButtonBar>
    </>
  );
};

export const NodeList = connect<{}, CustomNodeTableProps>(stateToProps)(CustomNodeTable);

type CustomNodeTableProps = {
  data: NodeKind[];
  loaded: boolean;
  ocsProps: ocsPropsType;
};

type ocsPropsType = {
  namespace: string;
  clusterServiceVersion: K8sResourceKind;
};
