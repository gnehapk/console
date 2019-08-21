import * as React from 'react';
import * as _ from 'lodash';
import { Alert, Button, ActionGroup } from '@patternfly/react-core';
import { ButtonBar } from '@console/internal/components/utils/button-bar';
import { history } from '@console/internal/components/utils/router';
import {
  referenceForModel,
  k8sCreate,
  Status,
  k8sPatch,
  getNodeRoles,
  K8sResourceKind,
  K8sKind,
} from '@console/internal/module/k8s';
import {
  RequestSizeInput,
  SelectorInput,
} from '@console/internal/components/utils/index';
import { ListPage } from '@console/internal/components/factory';
import { NodeModel } from '@console/internal/models';
import { ClusterServiceVersionKind } from '@console/internal/components/operator-lifecycle-manager/index';
import { Tooltip } from '@console/internal/components/utils/tooltip';
import { OCSServiceModel } from '../../models';
import { NodeList } from './node-list';
import { OCSStorageClassDropdown } from './storage-class-dropdown';
import {
  minSelectedNode,
  taintObj,
  labelObj,
  ocsRequestData,
} from '../../constants/ocs-install';

import './ocs-install.scss';

export const OCSContext = React.createContext({});

export const CreateOCSServiceForm: React.FC<CreateOCSServiceFormProps> = React.memo((props) => {
  const title = 'Create New OCS Service';
  const dropdownUnits = {
    TiB: 'TiB',
  };

  const [error, setError] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);
  const [requestSizeUnit, setRequestSizeUnit] = React.useState(dropdownUnits.TiB); // no other unit should be allowed
  const [requestSizeValue, setRequestSizeValue] = React.useState('1');
  const [storageClass, setStorageClass] = React.useState('');
  const [validCapacity, setValidCapacity] = React.useState(true);
  const [createBtnDisabled, setCreateBtnDisabled] = React.useState(true);
  const [selectedNodesCnt, setSelectedNodesCnt] = React.useState(0);
  const [nodes, setNodes] = React.useState([]);

  React.useEffect(() => {
    const selectedNode = _.filter(nodes, 'selected').length;
    setSelectedNodesCnt(selectedNode);
    selectedNode >= minSelectedNode ? setCreateBtnDisabled(false) : setCreateBtnDisabled(true);
  }, [nodes]);

  const handleRequestSizeInputChange = (obj) => {
    setRequestSizeUnit(obj.unit);
    setRequestSizeValue(obj.value);
    obj.value < 1 ? setValidCapacity(false) : setValidCapacity(true);
  };

  const handleStorageClass = (sc) => {
    setStorageClass(_.get(sc, 'metadata.name'));
  };

  // labeling the selected nodes
  const labelNodes = (selectedNode) => {

    const labelPath = '/metadata/labels';
    const labelData = selectedNode.map((node) => {
      const labels = SelectorInput.arrayify(_.get(node, labelPath.split('/').slice(1)));
      const patch = [
        {
          op: labels.length ? 'replace' : 'add',
          value: SelectorInput.objectify(labels),
          path: labelPath,
        },
      ];
      patch[0].value = { ...patch[0].value, ...labelObj };
      return k8sPatch(NodeModel, node, patch);
    })
    return labelData;
  };

  // tainting the selected nodes
  const taintNodes = (selectedNode) => {
    const tainData = selectedNode
      .filter((node) => {
        const roles = getNodeRoles(node);
        // don't taint master nodes as its already tainted
        return roles.indexOf('master') === -1;
      })
      .map((node) => {
        const taints = node.spec.taints
          ? [...node.spec.taints, taintObj]
          : [taintObj];
        const patch = [
          {
            value: taints,
            path: '/spec/taints',
            op: node.spec.taints ? 'replace' : 'add',
          },
        ];
        return k8sPatch(NodeModel, node, patch);
      })

    return tainData;
  };

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    event.stopPropagation();
    setProgress(true);
    setError('');

    const selectedData = _.filter(nodes, 'selected');
    console.log(nodes, 'nodes');
    const promises = [];

    const arr = [...labelNodes(selectedData)];
    console.log(arr, 'label');

    const arr1 = [...taintNodes(selectedData)];
    console.log(arr1, 'taint');

    promises.push(...labelNodes(selectedData));
    promises.push(...taintNodes(selectedData));

    const obj = _.cloneDeep(ocsRequestData);
    // modify the required fields before sending
    obj.spec.dataDeviceSet.count = `${Number(requestSizeValue) * 3}`;
    obj.spec.dataDeviceSet.capacity = `1 ${requestSizeUnit}`;
    obj.spec.dataDeviceSet.storageClassName = storageClass;

    promises.push(k8sCreate(OCSServiceModel, obj));

    Promise.all(promises)
      .then(() => {
        history.push(
          `/k8s/ns/${props.namespace}/clusterserviceversions/${
          props.clusterServiceVersion.metadata.name
          }/${referenceForModel(OCSServiceModel)}/${obj.metadata.name}`,
        );
        setProgress(false);
        setError('');
      })
      .catch((err: Status) => {
        setProgress(false);
        setError(err.message);
      });
  };

  return (
    <div className="ceph-ocs-install__form co-m-pane__body co-m-pane__form">
      <h1 className="co-m-pane__heading co-m-pane__heading--baseline">
        <div className="co-m-pane__name">{title}</div>
      </h1>
      <p className="co-m-pane__explanation">
        OCS runs as a cloud-native service for optimal integration with applications in need of
        storage, and handles the scenes such as provisioning and management.
        </p>
      <form className="co-m-pane__body-group" onSubmit={submit}>
        <div className="form-group co-create-route__name">
          <label className="co-required" htmlFor="select-node-help">
            Select Nodes
            </label>
          <div className="control-label help-block" id="select-node-help">
            A minimum of 3 nodes needs to be labeled with{' '}
            <code>cluster.ocs.openshift.io/openshift-storage=&quot;&quot;</code> in order to create
            the OCS Service.
            </div>
          <Alert
            className="co-alert ceph-ocs-info__alert"
            variant="info"
            title="An AWS bucket will be created to provide the OCS Service."
          />
          <p className="co-legend co-required ceph-ocs-desc__legend">
            Select at least 3 nodes you wish to use.
          </p>
          <OCSContext.Provider value={{nodesHandler: setNodes}}>
            <ListPage kind={NodeModel.kind} showTitle={false} ListComponent={NodeList}/>
          </OCSContext.Provider>
          <p className="control-label help-block" id="nodes-selected">
            {selectedNodesCnt} node(s) selected
            </p>
        </div>
        <h4>OCS Service Capacity</h4>
        <div className="form-group">
          <label className="control-label" htmlFor="request-size-input">
            Requested Capacity
          </label>
          <RequestSizeInput
            name="requestSize"
            required={false}
            onChange={handleRequestSizeInputChange}
            defaultRequestSizeUnit={requestSizeUnit}
            defaultRequestSizeValue={requestSizeValue}
            dropdownUnits={dropdownUnits}
            disabled
          />
          {!validCapacity && <span className="co-error">Minimum allowed value for requested capacity is 1 TiB</span>}
        </div>
        <div className="form-group">
          <Tooltip content="The Storage Class will be used to request storage from the underlying infrastructure to create the backing persistent volumes that will be used to provide the OpenShift Container Storage (OCS) service">
            <OCSStorageClassDropdown
              onChange={handleStorageClass}
              id="storageclass-dropdown"
              required={false}
              name="storageClass"
            />
          </Tooltip>
        </div>
        <ButtonBar errorMessage={error} inProgress={inProgress}>
          <ActionGroup className="pf-c-form">
            <Button type="submit" variant="primary" isDisabled={createBtnDisabled}>
              Create
              </Button>
            <Button type="button" variant="secondary" onClick={history.goBack}>
              Cancel
              </Button>
          </ActionGroup>
        </ButtonBar>
      </form>
    </div>
  );
});

type CreateOCSServiceFormProps = {
  operandModel: K8sKind;
  sample?: K8sResourceKind;
  namespace: string;
  clusterServiceVersion: ClusterServiceVersionKind;
};