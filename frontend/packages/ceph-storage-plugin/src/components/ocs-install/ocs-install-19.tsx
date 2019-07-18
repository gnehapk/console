import * as React from 'react';
import * as _ from 'lodash';
import * as classNames from 'classnames';
import { match } from 'react-router';
import { safeDump } from 'js-yaml';
import { sortable } from '@patternfly/react-table';
import { Alert } from '@patternfly/react-core';
import { Set as ImmutableSet } from 'immutable';

import { ButtonBar } from '@console/internal/components/utils/button-bar';
import { history } from '@console/internal/components/utils/router';
import {
  referenceForModel,
  getNodeRoles,
  K8sResourceKind,
  K8sKind,
  k8sGet,
  k8sCreate,
  K8sResourceKindReference,
  Status,
} from '@console/internal/module/k8s';
import {
  ResourceLink,
  BreadCrumbs,
  humanizeBinaryBytes,
} from '@console/internal/components/utils/index';
import { Table, TableRow, TableData, ListPage } from '@console/internal/components/factory';
import { NodeModel, ClusterServiceVersionModel } from '@console/internal/models';
import { ClusterServiceVersionKind } from '@console/internal/components/operator-lifecycle-manager/index';
import { CreateYAML } from '@console/internal/components/create-yaml';
import { OCSServiceModel } from '../../models';

import './ocs-install.scss';

const tableColumnClasses = [
  classNames('col-md-1', 'col-sm-1', 'col-xs-1'),
  classNames('col-md-5', 'col-sm-6', 'col-xs-8'),
  classNames('col-md-2', 'col-sm-3', 'hidden-2'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'hidden-2', 'hidden-xs'),
];

const NodeHeader = () => {
  return [
    {
      title: 'Name',
      sortField: 'metadata.name',
      transforms: [sortable],
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
    }
  ];
};

const getConvertedUnits = (value, initialUnit, preferredUnit) => {
  return (
    humanizeBinaryBytes(_.slice(value, 0, value.length - 2).join(''), initialUnit, preferredUnit)
      .string || '-'
  );
};

const NodeRow: React.FC<NodeRowProps> = ({
  obj: node,
  index,
  key,
  style,
  isSelected,
  onSelect,
}) => {
  const roles = getNodeRoles(node).sort();

  return (
    <TableRow id={node.metadata.uid} index={index} trKey={key} style={style}>
      <TableData className={`pf-c-table__check ${tableColumnClasses[0]}`}>
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(node)} />
      </TableData>
      <TableData className={tableColumnClasses[1]}>
        <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />
      </TableData>
      <TableData className={tableColumnClasses[2]}>{roles.join(', ') || '-'}</TableData>
      <TableData className={tableColumnClasses[3]}>
        {_.get(node.status, 'capacity.cpu') || '-'} CPU
      </TableData>
      <TableData className={tableColumnClasses[4]}>
        {getConvertedUnits(_.get(node.status, 'allocatable.memory'), 'KiB', 'GiB')}
      </TableData>
    </TableRow>
  );
};

export const NodeList: React.FC<NodeListProps> = ({
  data,
  selectedNodes,
  onSelectNode,
  onSelectAll,
}) => {
  let actualData = data || [];
  actualData = data.map((node) => {
    (node as any).selected = selectedNodes.has(node);
    //(node as any).selected = true;
    return node;
  });
  return (
    <Table
      aria-label="Nodes"
      loaded={true}
      data={actualData}
      customData={actualData} // HACK should not be necessary
      Header={NodeHeader}
      Row={(rowProps) =>
        <NodeRow
          {...rowProps}
          isSelected={selectedNodes.has(rowProps.obj.metadata.uid)}
          onSelect={onSelectNode} />}
      onSelect={onSelectAll}
      virtualize
    />
  );
};

export const CreateOCSServiceForm: React.FC<CreateOCSServiceFormProps> = React.memo((props) => {
  const title = 'Create New OCS Service';
  const [error, setError] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);
  // TODO need to track UIDs of selected nodes, instead of node objects themselves
  // this is because data (list of nodes) keeps changing over time, due to table refresh
  const [selectedNodes, setSelectedNodes] = React.useState(ImmutableSet<string>());

  const toggleSelection = (s: ImmutableSet<string>, uid: string) => {
    return s.has(uid) ? s.delete(uid) : s.add(uid);
  }

  const OCSNodeList = (props) => (
    <NodeList
      {...props}
      selectedNodes={selectedNodes}
      onSelectNode={(node: K8sResourceKind) => {
        setSelectedNodes(toggleSelection(selectedNodes, node.metadata.uid));
      }}
      onSelectAll={(event, isSelected) => {
        console.log(props, 'props');
        const nodes = props.Node.data;
        let newSelection = selectedNodes;
        nodes.forEach((node) => {
          //newSelection = toggleSelection(newSelection, node.metadata.uid);
          if(isSelected) {
            newSelection = newSelection.add(node.metadata.uid);
          } else {
            newSelection = newSelection.delete(node.metadata.uid);
          }
        });
        setSelectedNodes(newSelection);
      }} />
  );

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    event.stopPropagation();

    setProgress(true);
    setError('');

    k8sCreate(OCSServiceModel, props.sample, { ns: 'openshift-storage' })
      .then(() => {
        history.push(
          // TODO this will cause URL string to be split across multiple lines
          `/k8s/ns/${props.namespace}/clusterserviceversions/${
            props.clusterServiceVersion.metadata.name
          }/${referenceForModel(OCSServiceModel)}/${props.sample.metadata.name}`,
        );
        setProgress(false);
        setError('');
      })
      .catch((err: Status) => setError(err.message));
  };

  return (
    <div className="ceph-ocs-install__form co-m-pane__body co-m-pane__form">
      <h1 className="co-m-pane__heading co-m-pane__heading--baseline">
        <div className="co-m-pane__name">{title}</div>
        <div className="co-m-pane__heading-link">
          <button className="btn btn-link">Edit YAML</button>
        </div>
      </h1>
      <p className="co-m-pane__explanation">
        OCS runs as a cloud-native service for optimal integration with applications in need of
        storage, and handles the scenes such as provisioning and management.
      </p>
      <form className="co-m-pane__body-group" onSubmit={submit}>
        <div className="form-group co-create-route__name">
          <label className="co-required">Select Nodes</label>
          <div className="help-block" id="select-node-help">
            A minimum of 3 nodes needs to be labeled with role=storage-node in order to create the OCS Service
          </div>
          <Alert
            className="co-alert ceph-ocs-info__alert"
            variant="info"
            title="An AWS bucket will be created to provide the OCS Service."
          />
          <p className="co-legend co-required ceph-ocs-desc__legend">
            Select at least 3 nodes you wish to use.
          </p>
          <ListPage
            kind={NodeModel.kind}
            showTitle={false}
            ListComponent={OCSNodeList} />
        </div>
        <ButtonBar errorMessage={error} inProgress={inProgress}>
          <button type="submit" className="btn btn-primary" id="save-changes">
            Create
          </button>
          <button type="button" className="btn btn-default" onClick={history.goBack}>
            Cancel
          </button>
        </ButtonBar>
      </form>
    </div>
  );
});

export const CreateOCSServiceYAML: React.FC<CreateOCSServiceYAMLProps> = (props) => {
  const template = _.attempt(() => safeDump(props.sample));
  if (_.isError(template)) {
    // eslint-disable-next-line no-console
    console.error('Error parsing example JSON from annotation. Falling back to default.');
  }

  return (
    <CreateYAML
      template={!_.isError(template) ? template : null}
      match={props.match}
      hideHeader={false}
    />
  );
};

/**
 * Component which wraps the YAML editor and form together
 */
export const CreateOCSService: React.FC<CreateOCSServiceProps> = (props) => {
  const [sample, setSample] = React.useState(null);
  const [method, setMethod] = React.useState<'yaml' | 'form'>('form');
  const [clusterServiceVersion, setClusterServiceVersion] = React.useState(null);

  React.useEffect(() => {
    k8sGet(ClusterServiceVersionModel, props.match.params.appName, props.match.params.ns).then(
      (clusterServiceVersionObj) => {
        try {
          setSample(
            JSON.parse(_.get(clusterServiceVersionObj.metadata.annotations, 'alm-examples'))[0],
          );
          setClusterServiceVersion(clusterServiceVersionObj);
        } catch (e) {
          setClusterServiceVersion(null);
          return;
        }
      },
    );
  }, [props.match.params.appName, props.match.params.ns]);

  // const changeToYAMLMethod = (event) => {
  //   event.preventDefault();
  //   setMethod('yaml');
  // };
  return (
    <React.Fragment>
      <div className="co-create-operand__header">
        <div className="co-create-operand__header-buttons">
          {clusterServiceVersion !== null && (
            <BreadCrumbs
              breadcrumbs={[
                {
                  name: clusterServiceVersion.spec.displayName,
                  path: window.location.pathname.replace('/~new', ''),
                },
                { name: `Create ${OCSServiceModel.label}`, path: window.location.pathname },
              ]}
            />
          )}
        </div>
      </div>
      {(method === 'form' && (
        <CreateOCSServiceForm
          namespace={props.match.params.ns}
          operandModel={OCSServiceModel}
          sample={sample}
          clusterServiceVersion={clusterServiceVersion !== null && clusterServiceVersion.metadata}
        />
      )) ||
        (method === 'yaml' && <CreateOCSServiceYAML match={props.match} sample={sample} />)}
    </React.Fragment>
  );
};

type CreateOCSServiceProps = {
  match: match<{ appName: string; ns: string; plural: K8sResourceKindReference }>;
  operandModel: K8sKind;
  sample?: K8sResourceKind;
  namespace: string;
  loadError?: any;
  clusterServiceVersion: ClusterServiceVersionKind;
};

type CreateOCSServiceFormProps = {
  operandModel: K8sKind;
  sample?: K8sResourceKind;
  namespace: string;
  clusterServiceVersion: ClusterServiceVersionKind;
  //changeToYAMLMethod: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

type CreateOCSServiceYAMLProps = {
  sample?: K8sResourceKind;
  match: match<{ appName: string; ns: string; plural: K8sResourceKindReference }>;
};

type NodeRowProps = {
  obj: K8sResourceKind;
  index: number;
  key?: string;
  style: object;
  isSelected: boolean;
  onSelect: (obj: K8sResourceKind) => void;
};

type NodeListProps = {
  data: K8sResourceKind[];
  selectedNodes: ImmutableSet<K8sResourceKind>;
  onSelectNode: (node: K8sResourceKind) => void;
  onSelectAll: (nodes: K8sResourceKind[]) => void;
};
