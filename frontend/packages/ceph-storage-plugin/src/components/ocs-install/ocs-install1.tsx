// import * as React from 'react';
// import * as _ from 'lodash-es';
// import { Alert } from '@patternfly/react-core';
// import { Link } from 'react-router-dom';
// import { ButtonBar } from '@console/internal/components/utils/button-bar';
// import { history } from '@console/internal/components/utils/router';
// import { RadioInput } from '@console/internal/components/radio';
// //import { ipiDeployementModal } from './ipi-deployment/ipi-deployment';
// import './ocs-install.scss';
// import { ConfigMapModel, NodeModel, MachineModel } from '@console/internal/models';
// import { referenceForModel, getNodeRoles, K8sResourceKind, nodeStatus } from '@console/internal/module/k8s';
// import { StatusIconAndText } from '@console/internal/components/utils';
// //import { ClusterVersionModel } from '@console/internal/models';
// import { FirehoseResource, ResourceLink } from '@console/internal/components/utils/index';
// import { Table, TableRow, TableData, ListPage } from '@console/internal/components/factory';
// import * as classNames from 'classnames';
// import { sortable } from '@patternfly/react-table';

// const tableColumnClasses = [
//   classNames('col-md-5', 'col-sm-5', 'col-xs-8'),
//   classNames('col-md-2', 'col-sm-3', 'col-xs-4'),
//   classNames('col-md-2', 'col-sm-4', 'hidden-xs'),
//   classNames('col-md-3', 'hidden-sm', 'hidden-xs'),
// ];

// const NodeTableHeader = () => {
//   return [
//     {
//       title: 'Name', sortField: 'metadata.name', transforms: [sortable],
//       props: { className: tableColumnClasses[0] },
//     },
//     {
//       title: 'Status', sortFunc: 'nodeReadiness', transforms: [sortable],
//       props: { className: tableColumnClasses[1] },
//     },
//     {
//       title: 'Role', sortFunc: 'nodeRoles', transforms: [sortable],
//       props: { className: tableColumnClasses[2] },
//     },
//     {
//       title: 'Machine', sortField: 'metadata.annotations[\'machine.openshift.io/machine\']', transforms: [sortable],
//       props: { className: tableColumnClasses[3] },
//     },
//   ];
// };
// NodeTableHeader.displayName = 'NodeTableHeader';

// const NodeStatus = ({ node }) => <StatusIconAndText status={nodeStatus(node)} />;

// const getMachine = (node: K8sResourceKind) => {
//   const machine = _.get(node, 'metadata.annotations["machine.openshift.io/machine"]');
//   if (!machine) {
//     return null;
//   }

//   const [namespace, name] = machine.split('/');
//   return { namespace, name };
// };

// const NodeTableRow: React.FC<NodeTableRowProps> = ({ obj: node, index, key, style }) => {
//   const machine = getMachine(node);
//   const roles = getNodeRoles(node).sort();
//   return (
//     <TableRow id={node.metadata.uid} index={index} trKey={key} style={style}>
//       <TableData className={tableColumnClasses[0]}>
//         <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />
//       </TableData>
//       <TableData className={tableColumnClasses[1]}>
//         <NodeStatus node={node} />
//       </TableData>
//       <TableData className={tableColumnClasses[2]}>
//         {roles.length ? roles.join(', ') : '-'}
//       </TableData>
//       <TableData className={tableColumnClasses[3]}>
//         {machine && <ResourceLink kind={referenceForModel(MachineModel)} name={machine.name} namespace={machine.namespace} />}
//       </TableData>
//     </TableRow>
//   );
// };
// NodeTableRow.displayName = 'NodeTableRow';
// type NodeTableRowProps = {
//   obj: K8sResourceKind;
//   index: number;
//   key?: string;
//   style: object;
// };

// const filters = [{
//   type: 'node-status',
//   selected: ['Ready', 'Not Ready'],
//   reducer: nodeStatus,
//   items: [
//     { id: 'Ready', title: 'Ready' },
//     { id: 'Not Ready', title: 'Not Ready' },
//   ],
// }];

// const NodesList = props => <Table {...props} aria-label="Nodes" Header={NodeTableHeader} Row={NodeTableRow} virtualize />;

// export class createNewOCSCluster extends React.PureComponent {
//   state = {
//     error: '',
//     inProgress: false,
//     title: 'Create New OCS Service',
//     ipiInstallationMode: true,
//   };

//   submit = (event: React.FormEvent<EventTarget>) => {
//     event.preventDefault();

//     this.setState({ inProgress: true, errorMessage: '' });
//     //TODO: Call the API, once decided
//     // this.handlePromise().then(this.props.close);
//   };

//   updateFlow = () => {
//     let mode = this.state.ipiInstallationMode ? false : true;
//     this.setState({ ipiInstallationMode: mode });
//   };

//   componentDidMount = () => {
//     console.log(referenceForModel(ConfigMapModel));
//     //baseListPages.set(referenceForModel(ConfigMapModel), () => this.abc)

//   };

//   NodeResource: FirehoseResource = {
//     kind: referenceForModel(NodeModel),
//     namespaced: true,
//     namespace: 'openshift-storage',
//     isList: true,
//     prop: 'node',
//   };

//   render() {
//     const { title, error, inProgress, ipiInstallationMode } = this.state;
//     const setAsIPI = ipiInstallationMode;
//     const setAsUPI = !ipiInstallationMode;

//     const props1 = {
//       autoFocus: true,
//       kind: "Node",
//       match: {
//         isExact: true,
//         params: { plural: "nodes" },
//         path: "/k8s/cluster/:plural",
//         url: "/k8s/cluster/nodes",
//       },
//     };

//     return (
//       <div className="co-m-pane__body co-m-pane__form">
//         <h1 className="co-m-pane__heading co-m-pane__heading--baseline">
//           <div className="co-m-pane__name">
//             {title}
//           </div>
//           <div className="co-m-pane__heading-link">
//             <Link to='' id="yaml-link" replace>Edit YAML</Link>
//           </div>
//         </h1>

//         <p className="co-m-pane__explanation">
//           OCS runs as a cloud-native service for optimal integration with applications in need of storage, and handles the scenes such as provisioning and management.
//         </p>
//         <form className="co-m-pane__body-group" onSubmit={this.submit}>
//           <fieldset>
//             <legend className="co-legend co-required">Deployment Type</legend>
//             <RadioInput title="Create new nodes" name="co-deployment-type" id="co-deployment-type__ipi" value="ipi" onChange={this.updateFlow} checked={setAsIPI}
//               desc="3 new nodes and an AWS bucket will be created to provide the OCS Service" />
//             <RadioInput title="Use existing nodes" name="co-deployment-type" id="co-deployment-type__upi" value="upi" onChange={this.updateFlow} checked={setAsUPI}
//               desc="A minimum of 3 nodes needs to be labeled with role=storage-node in order to create the OCS Service" />
//             {setAsUPI && <div className="co-m-radio-desc">
//               <Alert className="co-alert ocs-info__alert" variant="info" title="An AWS bucket will be created to provide the OCS Service." />
//               <p className="co-legend co-required ocs-desc__legend">Select at least 3 nodes you wish to use.</p>
//             </div>}
//             {setAsUPI && <ListPage {...props1} ListComponent={NodesList} rowFilters={filters} />

//             }
//           </fieldset>
//           <ButtonBar errorMessage={error} inProgress={inProgress}>
//             <button type="submit" className="btn btn-primary" id="save-changes">
//               Create
//             </button>
//             <button type="button" className="btn btn-default" onClick={history.goBack}>
//               Cancel
//             </button>
//           </ButtonBar>
//         </form>
//       </div>
//     );
//   }
// };
