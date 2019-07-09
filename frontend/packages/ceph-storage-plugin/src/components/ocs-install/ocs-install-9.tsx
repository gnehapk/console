import * as React from 'react';
import * as _ from 'lodash-es';
import { Alert } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ButtonBar } from '@console/internal/components/utils/button-bar';
import { history } from '@console/internal/components/utils/router';
import { RadioInput } from '@console/internal/components/radio';
//import { ipiDeployementModal } from './ipi-deployment/ipi-deployment';
import './ocs-install.scss';
import { ConfigMapModel, NodeModel, MachineModel } from '@console/internal/models';
import { referenceForModel, getNodeRoles, K8sResourceKind, nodeStatus, k8sGet } from '@console/internal/module/k8s';
import { StatusIconAndText } from '@console/internal/components/utils';
//import { ClusterVersionModel } from '@console/internal/models';
import { FirehoseResource, ResourceLink } from '@console/internal/components/utils/index';
import { Table, TableRow, TableData, ListPage } from '@console/internal/components/factory';
import * as classNames from 'classnames';
import { sortable } from '@patternfly/react-table';
import { watchK8sList } from '@console/internal/actions/k8s';
import { withDashboardResources, DashboardItemProps } from '@console/internal/components/dashboards-page/with-dashboard-resources';

const nodeProps = {
  kind: "Node",
  match: {
    isExact: true,
    params: { plural: "nodes" },
    path: "/k8s/cluster/:plural",
    url: "/k8s/cluster/nodes",
  },
};

const nodeResource: FirehoseResource = {
  kind: referenceForModel(NodeModel),
  namespaced: false,
  name: 'nodes',
  isList: true,
  prop: 'nodes',
};

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

// const getConfigMaps = () => {
//   k8sGet(ConfigMapModel, null, 'openshift-storage').then(configMaps => {
//     console.log(configMaps, 'configmaps')
//     configMaps.items.forEach(config => {
//       const nodeName = config.metadata.labels && config.metadata.labels['rook.io/node'];
      
//       if(typeof nodeName !== 'undefined') {
//         configMapsForAllNodes[nodeName] = configMaps.items.filter(config => {
//           return config.metadata.labels && config.metadata.labels['rook.io/node'] === nodeName;
//         });
//       }
//     });

//     console.log(configMapsForAllNodes, 'maps');
//   });
// };

const NodeTableRow: React.FC<NodeTableRowProps> = ({ obj: node, index, key, style }) => {
  const roles = getNodeRoles(node).sort();
  //const devicesCount = configMapsForAllNodes[node.metadata.name].length || 0;
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
        0 Selected
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

const NodesList = props => <Table {...props} Header={NodeTableHeader} Row={NodeTableRow} aria-label="Nodes" />;

export class createNewOCSCluster extends React.PureComponent {
  state = {
    error: '',
    inProgress: false,
    title: 'Create New OCS Service',
    ipiInstallationMode: true,

  };

  componentDidMount() {
    //console.log(referenceForModel(ConfigMapModel));
    //baseListPages.set(referenceForModel(ConfigMapModel), () => this.abc)
    //getConfigMaps();

    console.log(this.props, 'props');
    //this.props.watchK8sResource(nodeResource);

  };

  submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();

    this.setState({ inProgress: true, errorMessage: '' });
    //TODO: Call the API, once decided
    // this.handlePromise().then(this.props.close);
  };

  onSelect = (event, isSelected, rowIndex, rowData, extraData) => {
    console.log(isSelected, rowIndex, 'logs');
  };

  updateFlow = () => {
    console.log('updateDlow');
    let mode = this.state.ipiInstallationMode ? false : true;
    this.setState({ ipiInstallationMode: mode });
  };

  render() {
    const { title, error, inProgress, ipiInstallationMode } = this.state;
    const setAsIPI = ipiInstallationMode;
    const setAsUPI = !ipiInstallationMode;
    // const resources = this.props.resources;
    // const nodeList = _.get(resources, 'nodes');
    // const nodeProps = _.get(nodeList, 'data') as K8sResourceKind;

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
            <RadioInput title="Create new nodes" name="co-deployment-type" id="co-deployment-type__ipi" value="ipi" onChange={this.updateFlow} checked={setAsIPI}
              desc="3 new nodes and an AWS bucket will be created to provide the OCS Service" />
            <RadioInput title="Use existing nodes" name="co-deployment-type" id="co-deployment-type__upi" value="upi" onChange={this.updateFlow} checked={setAsUPI}
              desc="A minimum of 3 nodes needs to be labeled with role=storage-node in order to create the OCS Service" />
            {setAsUPI && <div className="co-m-radio-desc">
              <Alert className="co-alert ocs-info__alert" variant="info" title="An AWS bucket will be created to provide the OCS Service." />
              <p className="co-legend co-required ocs-desc__legend">Select at least 3 nodes you wish to use.</p>
            </div>}
            {setAsUPI && <ListPage {...nodeProps} showTitle={false} ListComponent={NodesList} />

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

//export const createNewOCSCluster = withDashboardResources(createNewOCSClusterService);
