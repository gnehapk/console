import * as React from 'react';
import * as _ from 'lodash-es';
import * as classNames from 'classnames';
import { match } from 'react-router';
import { sortable } from '@patternfly/react-table';

import { Alert } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ButtonBar } from '@console/internal/components/utils/button-bar';
import { history } from '@console/internal/components/utils/router';
import { RadioInput } from '@console/internal/components/radio';
import './ocs-install.scss';
import { referenceForModel, getNodeRoles, K8sResourceKind, K8sKind, k8sGet, k8sCreate, K8sResourceKindReference, Status } from '@console/internal/module/k8s';
import { ResourceLink } from '@console/internal/components/utils/index';
import { Table, TableRow, TableData, ListPage } from '@console/internal/components/factory';
import { ConfigMapModel, NodeModel, ClusterServiceVersionModel } from '@console/internal/models';
import { OCSModel } from '../../models';
import { ClusterServiceVersionKind } from '@console/internal/components/operator-lifecycle-manager/index';

const tableColumnClasses = [
  classNames('col-md-2', 'col-sm-5', 'col-xs-8'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'col-sm-3', 'hidden-xs'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'col-sm-4', 'col-xs-4'),
];

const NodeTableHeader = () => {
  return [
    {
      title: 'Name', sortField: 'metadata.name', transforms: [sortable],
      props: { className: tableColumnClasses[0] },
    },
    {
      title: 'Role',
      props: { className: tableColumnClasses[1] },
    },
    {
      title: 'CPU',
      props: { className: tableColumnClasses[2] },
    },
    {
      title: 'Memory',
      props: { className: tableColumnClasses[3] },
    },
    {
      title: 'Capacity',
      props: { className: tableColumnClasses[4] },
    },
    {
      title: 'Devices',
      props: { className: tableColumnClasses[5] },
    },
  ];
};
NodeTableHeader.displayName = 'NodeTableHeader';
const configMapsForAllNodes = {};

const getConfigMaps = () => {
  k8sGet(ConfigMapModel, null, 'openshift-storage').then(configMaps => {
    console.log(configMaps, 'configmaps')
    configMaps.items.forEach(config => {
      const nodeName = config.metadata.labels && config.metadata.labels['rook.io/node'];

      if (typeof nodeName !== 'undefined') {
        configMapsForAllNodes[nodeName] = (JSON.parse(config.data.devices)).length;
      }

    });

    console.log(configMapsForAllNodes, 'maps');
  });
};

const NodeTableRows = (componentProps) => {
  return _.map(componentProps.data, obj => {
    if (obj && obj.metadata) {
      const cells = NodeTableRow(obj);
      const uid = obj.metadata.uid;
      const selected = false;
      return {
        selected,
        cells,
        uid,
      };
    }
  });
};

const NodeTableRow: React.FC<NodeTableRowProps> = ({ obj: node, index, key, style }) => {
  const roles = getNodeRoles(node).sort();
  const devicesCount = configMapsForAllNodes[node.metadata.name] || 0;

  return (
    <TableRow id={node.metadata.uid} index={index} trKey={key} style={style}>
      {/* <TableData className="pf-c-table__check">
          <input aria-labelledby="simple-node1" name="checkrow1" type="checkbox" />
       </TableData> */}
      <TableData className={tableColumnClasses[0]}>
        <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />
      </TableData>
      <TableData className={tableColumnClasses[1]}>
        {roles.length ? roles.join(', ') : '-'}
      </TableData>
      <TableData className={tableColumnClasses[2]}>
        {node.status && node.status.capacity ? node.status.capacity.cpu : '-'}
      </TableData>
      <TableData className={tableColumnClasses[3]}>
        {node.status && node.status.allocatable ? node.status.allocatable.memory : '-'}
      </TableData>
      <TableData className={tableColumnClasses[4]}>
        {node.status && node.status.capacity ? node.status.capacity.memory : '-'}
      </TableData>
      <TableData className={tableColumnClasses[5]}>
        {devicesCount} Selected
      </TableData>
    </TableRow>
  );
};

NodeTableRow.displayName = 'NodeTableRow';
type NodeTableRowProps = {
  obj: K8sResourceKind;
  index: number;
  key?: string;
  style: object;
};

export class CreateOCSService extends React.PureComponent<CreateOCSServiceProps> {
  state = {
    error: '',
    inProgress: false,
    title: 'Create New OCS Service',
    ipiInstallationMode: false,
    sample: '',

  };

  componentDidMount() {
    k8sGet(ClusterServiceVersionModel, this.props.match.params.appName, this.props.match.params.ns)
      .then(clusterServiceVersionObj => {
        this.setState({ sample: JSON.parse(_.get(clusterServiceVersionObj.metadata.annotations, 'alm-examples'))[0] });
        console.log(this.state.sample, 'sample');
      });
  };

  setError = (msg) => {
    this.setState({ error: msg });
  };

  onSelect = (event, isSelected, rowIndex, rowData, extraData) => {
    console.log(rowIndex, rowData, 'rowData');
  };

  submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();

    this.setState({ inProgress: true, error: '' });

    k8sCreate(OCSModel, this.state.sample)
      .then(() => history.push(`/k8s/ns/${this.props.namespace}/clusterserviceversions/${this.props.clusterServiceVersion.metadata.name}/${referenceForModel(OCSModel)}/${this.state.sample.metadata.name}`))
      .catch((err: Status) => this.setError(err.message));

  };

  updateMode = () => {
    console.log('updateDlow');
    let mode = this.state.ipiInstallationMode ? false : true;
    this.setState({ ipiInstallationMode: mode }, () => {
      if (!this.state.ipiInstallationMode) {
        getConfigMaps();
      }
    });
  };

  render() {
    const { title, error, inProgress, ipiInstallationMode } = this.state;
    const setAsIPI = ipiInstallationMode;
    const setAsUPI = !ipiInstallationMode;

    const NodesList = props => <Table {...props} Header={NodeTableHeader} Row={NodeTableRow} aria-label="Nodes" virtualize />;

    return (
      <div className="co-m-pane__body co-m-pane__form">
        <h1 className="co-m-pane__heading co-m-pane__heading--baseline">
          <div className="co-m-pane__name">
            {title}
          </div>
          <div className="co-m-pane__heading-link">
            <Link to='' id="yaml-link" replace>Edit YAML</Link>
          </div>
        </h1>

        <p className="co-m-pane__explanation">
          OCS runs as a cloud-native service for optimal integration with applications in need of storage, and handles the scenes such as provisioning and management.
        </p>
        <form className="co-m-pane__body-group" onSubmit={this.submit}>
          <fieldset>
            <legend className="co-legend co-required">Deployment Type</legend>
            <RadioInput title="Create new nodes" name="co-deployment-type" id="co-deployment-type__ipi" value="ipi" onChange={this.updateMode} checked={setAsIPI}
              desc="3 new nodes and an AWS bucket will be created to provide the OCS Service" />
            <RadioInput title="Use existing nodes" name="co-deployment-type" id="co-deployment-type__upi" value="upi" onChange={this.updateMode} checked={setAsUPI}
              desc="A minimum of 3 nodes needs to be labeled with role=storage-node in order to create the OCS Service" />
            {setAsUPI && <div className="co-m-radio-desc">
              <Alert className="co-alert ocs-info__alert" variant="info" title="An AWS bucket will be created to provide the OCS Service." />
              <p className="co-legend co-required ocs-desc__legend">Select at least 3 nodes you wish to use.</p>
            </div>}
            {setAsUPI && <ListPage kind={NodeModel.kind} showTitle={false} ListComponent={NodesList} />

            }
          </fieldset>
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
  }
};

type CreateOCSServiceProps = {
  match: match<{ appName: string, ns: string, plural: K8sResourceKindReference }>,
  operandModel: K8sKind;
  clusterServiceVersion: ClusterServiceVersionKind;
  sample?: K8sResourceKind;
  namespace: string;
};