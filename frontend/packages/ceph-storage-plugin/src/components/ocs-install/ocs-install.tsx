import * as React from 'react';
import * as _ from 'lodash';

import { match } from 'react-router';
import { safeDump } from 'js-yaml';
import { Alert, Button, ActionGroup } from '@patternfly/react-core';

import { ButtonBar } from '@console/internal/components/utils/button-bar';
import { history } from '@console/internal/components/utils/router';
import {
  referenceForModel,
  K8sResourceKind,
  K8sKind,
  k8sGet,
  k8sCreate,
  K8sResourceKindReference,
  Status,
} from '@console/internal/module/k8s';
import { BreadCrumbs, RequestSizeInput } from '@console/internal/components/utils/index';
import { ListPage } from '@console/internal/components/factory';
import { NodeModel, ClusterServiceVersionModel } from '@console/internal/models';
import { ClusterServiceVersionKind } from '@console/internal/components/operator-lifecycle-manager/index';
import { CreateYAML } from '@console/internal/components/create-yaml';
import { StorageClassDropdown } from '@console/internal/components/utils/storage-class-dropdown';
import { OCSServiceModel } from '../../models';
import { NodeList } from './node-list';
import './ocs-install.scss';
import { Tooltip } from '@console/internal/components/utils/tooltip';

export const CreateOCSServiceForm: React.FC<CreateOCSServiceFormProps> = React.memo((props) => {
  const title = 'Create New OCS Service';
  const dropdownUnits = {
    TiB: 'TiB',
  };

  const [error, setError] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);
  const [requestSizeUnit, setRequestSizeUnit] = React.useState(dropdownUnits.TiB); //no other unit should be allowed
  const [requestSizeValue, setRequestSizeValue] = React.useState('1');
  const [storageClass, setStorageClass] = React.useState('');
  const [createBtnDisabled, setCreateBtnDisabled] = React.useState(true);
  const [selectedNodesCnt, setSelectedNodesCnt] = React.useState(0);
  

  // must initialize like this w/ at least one item, current bug in pf-react row.every for selectAll
  // setting a dummy value for now
  const initialSelectionState = [{ selected: false }];
  let [selectedNodeData, setSelectedNodeData] = React.useState(initialSelectionState);

  const onSelect = (event: React.MouseEvent<HTMLButtonElement>, isSelected: boolean, virtualRowIndex: number, data: Array<any>) => {
    event.preventDefault();
    let newSelectedRowData = _.cloneDeep(selectedNodeData);

    // clone `data` in case previous Firehose updates added elements, preserve existing selection state
    // use findIndex to findout the exact node selected, 59 episode, use set to keep selected nodes
    _.each(data, (row, index: number) => {
      if (index < newSelectedRowData.length) {
        // preserve existing selection state
        newSelectedRowData[index] = {
          ...row,
          uid: row.metadata.uid,
          selected: newSelectedRowData[index].selected,
        };
      } else {
        // set initial selection state from storage here if necessary...for now, initialize it false
        newSelectedRowData.push({ ...row, uid: row.metadata.uid, selected: false });
      }
    });

    if (virtualRowIndex !== -1) {
      // set the selection based on virtualRowIndex node, it should exist in the array now
      newSelectedRowData[virtualRowIndex].selected = isSelected;
    } else {
      // selectAll
      newSelectedRowData = _.map(newSelectedRowData, (row) => ({ ...row, selected: isSelected }));
    }
    setSelectedNodeData(newSelectedRowData);

    setSelectedNodesCnt(_.filter(newSelectedRowData, 'selected').length);
  };

  React.useEffect(() => {
    selectedNodesCnt >= 3 ? setCreateBtnDisabled(false) : setCreateBtnDisabled(true);
  }, [selectedNodesCnt]);

  const handleRequestSizeInputChange = obj => {
    setRequestSizeUnit(obj.unit);
    setRequestSizeValue(obj.value);
  };

  const handleStorageClass = storageClass => {
    setStorageClass(_.get(storageClass, 'metadata.name'));
  };

  const updateSelectedNodes = data => {
    setSelectedNodeData(data);
    setSelectedNodesCnt(_.filter(data, 'selected').length);
  };

  const OCSNodeList = props => (
    <NodeList
      {...props}
      data={props.data}
      customData={selectedNodeData}

      onSelect={(event, isSelected, virtualRowIndex) => onSelect(event, isSelected, virtualRowIndex, props.data)}

    // onSingleSelect={(event, isSelected, virtualRowIndex) => {
    //   event.preventDefault();
    //   onSelect(event, isSelected, virtualRowIndex, props.data);
    // }}
    // onSelectAll={(event, isSelected, virtualRowIndex) => {
    //   event.preventDefault();
    //   onSelect(event, isSelected, virtualRowIndex, props.data);
    // }} 
    />
  );

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    event.stopPropagation();
    setProgress(true);
    setError('');

    const obj = {
      apiVersion: 'ocs.openshift.io/v1alpha1',
      kind: 'StorageCluster',
      metadata: {
        name: 'openshift-storage',
        namespace: 'openshift-storage',
      },
      spec: {
        managedNodes: false,
        dataDeviceSet: {
          name: 'openshift-storage-data-set',
          count: `${Number(requestSizeValue) * 3}${requestSizeUnit}`,
          capacity: '1 TiB',
          storageClassName: storageClass,
          placement: {
            podAntiAffinity: {
              preferredDuringSchedulingIgnoredDuringExecution: {
                weight: 100,
                podAffinityTerm: {
                  labelSelector: {
                    matchExpressions: {
                      key: 'ocs.openshift.io/cluster',
                      operator: 'In',
                      values: 'openshift-storage',
                    }
                  }
                }
              }
            }
          }
        }
      }
    } as K8sResourceKind;

    k8sCreate(OCSServiceModel, obj, { ns: 'openshift-storage' })
      .then(() => {
        history.push(
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
        {/* <div className="co-m-pane__heading-link">
          <button className="btn btn-link">Edit YAML</button>
        </div> */}
      </h1>
      <p className="co-m-pane__explanation">
        OCS runs as a cloud-native service for optimal integration with applications in need of
        storage, and handles the scenes such as provisioning and management.
      </p>
      <form className="co-m-pane__body-group" onSubmit={submit}>
        <div className="form-group co-create-route__name">
          <label className="co-required">Select Nodes</label>
          <div className="help-block" id="select-node-help">
            A minimum of 3 nodes needs to be labeled with <code>cluster.ocs.openshift.io/openshift-storage=""</code> in order to create the OCS Service.
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
          <p className="help-block" id="nodes-selected">
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
          />
        </div>
        <div className="form-group">
          <Tooltip content="The Storage Class will be used to request storage from the underlying infrastructure to create the backing persistent volumes that will be used to provide the OpenShift Container Storage (OCS) service">
            <StorageClassDropdown
              onChange={handleStorageClass}
              id="storageclass-dropdown"
              required={false}
              name="storageClass"
            />
          </Tooltip>
        </div>
        <ButtonBar errorMessage={error} inProgress={inProgress}>
          <ActionGroup className="pf-c-form">
            <Button
              type="submit"
              variant="primary"
              isDisabled={createBtnDisabled}>
              Create
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={history.goBack}>
              Cancel
            </Button>
          </ActionGroup>
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
export const CreateOCSService: React.FC<CreateOCSServiceProps> = React.memo((props) => {
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
      <div className="ceph-yaml__link">{method === 'form' && <button className="btn btn-link" onClick={() => setMethod('yaml')}>Edit YAML</button>}</div>
      {(method === 'form' && (
        <CreateOCSServiceForm
          namespace={props.match.params.ns}
          operandModel={OCSServiceModel}
          sample={sample}
          clusterServiceVersion={clusterServiceVersion !== null && clusterServiceVersion.metadata}
        //changeToYAMLMethod={changeToYAMLMethod}
        />
      )) ||
        (method === 'yaml' && <CreateOCSServiceYAML match={props.match} sample={sample} />)}
    </React.Fragment>
  );
});

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
