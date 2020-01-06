import * as React from 'react';
import * as _ from 'lodash';
import { Form, FormGroup, TextInput } from '@patternfly/react-core';
import {
  convertToBaseValue,
  humanizeBinaryBytes,
  LoadingInline,
  ResourceIcon,
  withHandlePromise,
} from '@console/internal/components/utils/index';
import {
  createModalLauncher,
  ModalBody,
  ModalSubmitFooter,
  ModalTitle,
  ModalComponentProps,
} from '@console/internal/components/factory';
import { k8sCreate, K8sResourceKind } from '@console/internal/module/k8s';
import { PersistentVolumeClaimModel } from '@console/internal/models/index';
import { HandlePromiseProps } from '@console/internal/components/utils/promise-component';
import { usePrometheusPoll } from '@console/internal/components/graphs/prometheus-poll-hook';
import { PrometheusEndpoint } from '@console/internal/components/graphs/helpers';
import { getInstantVectorStats } from '@console/internal/components/graphs/utils';
import { DataPoint } from '@console/internal/components/graphs/index';
import { getPVCUsedCapacityQuery } from '../../../constants/queries';
import './_clone-pvc-modal.scss';

const accessModeRadios = Object.freeze({
  ReadWriteOnce: 'Single User (RWO)',
  ReadWriteMany: 'Shared Access (RWX)',
  ReadOnlyMany: 'Read Only (ROX)',
});

const ClonePVCModal = withHandlePromise((props: ClonePVCModalProps) => {
  const { close, cancel, resource, handlePromise, errorMessage, inProgress } = props;
  const pvcName: string = resource.metadata.name;
  const [submitDisabled, setSubmitDisabled] = React.useState(false);
  const [clonePVCName, setClonePVCName] = React.useState(`${pvcName}-clone`);

  const pvcUsedCapacityQuery: string = getPVCUsedCapacityQuery(pvcName);

  const [response, error, loading] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: pvcUsedCapacityQuery,
  });

  const pvcUsedCapacityQueryResult: DataPoint[] = getInstantVectorStats(
    response,
    null,
    humanizeBinaryBytes,
  );
  const pvcUsedCapacity: string = _.get(pvcUsedCapacityQueryResult[0], 'label')
    ? _.get(pvcUsedCapacityQueryResult[0], 'label')
    : 'No Data';

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();

    const pvcCloneObj = {
      apiVersion: PersistentVolumeClaimModel.apiVersion,
      kind: PersistentVolumeClaimModel.kind,
      metadata: {
        name: clonePVCName,
        namespace: resource.metadata.namespace,
      },
      spec: {
        storageClassName: resource.spec.storageClassName,
        dataSource: {
          name: pvcName,
          kind: PersistentVolumeClaimModel.kind,
          apiGroup: '',
        },
        accessModes: resource.spec.accessModes,
        resources: {
          requests: {
            storage: resource.spec.resources.requests.storage,
          },
        },
      },
    };

    handlePromise(k8sCreate(PersistentVolumeClaimModel, pvcCloneObj))
      .then(() => {
        close();
      })
      .catch((err) => {
        setSubmitDisabled(true);
        throw err;
      });
  };

  return (
    <Form onSubmit={submit}>
      <div className="modal-content modal-content--no-inner-scroll">
        <ModalTitle>Clone</ModalTitle>
        <ModalBody>
          <FormGroup label="Name" isRequired fieldId="ceph-clone-pvc-modal__name">
            <TextInput
              isRequired
              type="text"
              id="ceph-clone-pvc-modal__name"
              name="ceph-clone-pvc-modal__name"
              value={clonePVCName}
              onChange={(value) => setClonePVCName(value)}
            />
          </FormGroup>
          <div className="ceph-clone-pvc-modal__details">
            <p className="text-muted ceph-clone-pvc-modal__details-label">PVC Details</p>
            <div className="ceph-clone-pvc-modal__details-section">
              <div>
                <div>
                  <p className="ceph-clone-pvc-modal__details-label">Namespace</p>
                  <p>
                    <ResourceIcon kind="Namespace" />
                    {resource.metadata.namespace}
                  </p>
                </div>
                <div>
                  <p className="ceph-clone-pvc-modal__details-label">Storage Class</p>
                  <p>
                    <ResourceIcon kind="StorageClass" />
                    {resource.spec.storageClassName}
                  </p>
                </div>
              </div>
              <div>
                <div>
                  <p className="ceph-clone-pvc-modal__details-label">Requested Capacity</p>
                  <p>
                    {
                      humanizeBinaryBytes(
                        convertToBaseValue(resource.spec.resources.requests.storage),
                      ).string
                    }
                  </p>
                </div>
                <div>
                  <p className="ceph-clone-pvc-modal__details-label">Used Capacity</p>
                  {!loading && !error && pvcUsedCapacity}
                  {loading && <LoadingInline />}
                  {!loading && error && 'No Data'}
                </div>
              </div>
              <div>
                <div>
                  <p className="ceph-clone-pvc-modal__details-label">Access Mode</p>
                  <p>{accessModeRadios[resource.spec.accessModes]}</p>
                </div>
                <div>
                  <p className="ceph-clone-pvc-modal__details-label">Volume Mode</p>
                  <p>{resource.spec.volumeMode}</p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalSubmitFooter
          inProgress={inProgress}
          errorMessage={errorMessage}
          submitText="Clone"
          cancel={cancel}
          submitDisabled={submitDisabled}
        />
      </div>
    </Form>
  );
});

export type ClonePVCModalProps = {
  resource?: K8sResourceKind;
} & HandlePromiseProps &
  ModalComponentProps;

export default createModalLauncher(ClonePVCModal);
