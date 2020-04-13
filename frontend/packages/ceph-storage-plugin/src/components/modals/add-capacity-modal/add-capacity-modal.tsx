import * as React from 'react';
import * as _ from 'lodash';
import * as classNames from 'classnames';
import {
  FieldLevelHelp,
  withHandlePromise,
  humanizeBinaryBytes,
} from '@console/internal/components/utils/index';
import {
  createModalLauncher,
  ModalBody,
  ModalSubmitFooter,
  ModalTitle,
} from '@console/internal/components/factory';
import { usePrometheusPoll } from '@console/internal/components/graphs/prometheus-poll-hook';
import { k8sPatch, StorageClassResourceKind, K8sResourceKind } from '@console/internal/module/k8s';
import { PrometheusEndpoint } from '@console/internal/components/graphs/helpers';
import { getName } from '@console/shared';
import { OCSServiceModel } from '../../../models';
import { OSD_CAPACITY_SIZES } from '../../../utils/osd-size-dropdown';
import { CEPH_STORAGE_NAMESPACE, NO_PROVISIONER } from '../../../constants';
import { labelTooltip, pvsCapacityState } from '../../../constants/ocs-install';
import { CAPACITY_USAGE_QUERIES, StorageDashboardQuery } from '../../../constants/queries';
import { OCSStorageClassDropdown } from '../storage-class-dropdown';
import './_add-capacity-modal.scss';
import { calcPVsCapacity, getSCAvailablePVs } from '../../../selectors';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { pvResource } from '../../../constants/resources';

const getProvisionedCapacity = (value: number) => (value % 1 ? (value * 3).toFixed(2) : value * 3);

export const AddCapacityModal = withHandlePromise((props: AddCapacityModalProps) => {
  const { ocsConfig, close, cancel } = props;

  const [response, loadError, loading] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    namespace: CEPH_STORAGE_NAMESPACE,
    query: CAPACITY_USAGE_QUERIES[StorageDashboardQuery.CEPH_CAPACITY_USED],
  });
  const [storageClass, setStorageClass] = React.useState<StorageClassResourceKind>(null);
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setError] = React.useState('');
  const [pvsAvailableCapacity, setPVsAvailableCapacity] = React.useState<React.ReactText>(
    pvsCapacityState.LOADING,
  );

  const osdSizeWithUnit = _.get(
    ocsConfig,
    'spec.storageDeviceSets[0].dataPVCTemplate.spec.resources.requests.storage',
  );
  const presentCount = _.get(ocsConfig, 'spec.storageDeviceSets[0].count');
  const capacity = _.get(response, 'data.result[0].value[1]');

  const osdSizeWithoutUnit = OSD_CAPACITY_SIZES[osdSizeWithUnit]?.size;
  const provisionedCapacity = getProvisionedCapacity(osdSizeWithoutUnit);

  const pvResult = useK8sWatchResource<K8sResourceKind[]>(pvResource);

  let currentCapacity: React.ReactNode;

  if (loading) {
    currentCapacity = (
      <div className="skeleton-text ceph-add-capacity__current-capacity--loading" />
    );
  } else if (loadError || !capacity || !presentCount || !osdSizeWithoutUnit) {
    currentCapacity = <div className="text-muted">Not available</div>;
  } else {
    currentCapacity = (
      <div className="text-muted">
        <strong>{`${humanizeBinaryBytes(capacity / 3).string} / ${presentCount *
          osdSizeWithoutUnit} TiB`}</strong>
      </div>
    );
  }

  const handleStorageClass = (sc: StorageClassResourceKind) => {
    setStorageClass(sc);
    const provisioner: string = sc?.provisioner;

    if (provisioner === NO_PROVISIONER) {
      const [pvsData, pvsLoaded, pvsLoadError] = pvResult;

      if (pvsLoaded && pvsData) {
        const pvs = getSCAvailablePVs(pvsData, getName(sc));
        const availableCapacity = humanizeBinaryBytes(calcPVsCapacity(pvs)).string;
        setPVsAvailableCapacity(availableCapacity);
      } else if (pvsLoadError || pvsData.length) {
        setPVsAvailableCapacity(pvsCapacityState.NOT_AVAILABLE);
      }
    }
  };

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();
    setProgress(true);
    const patch = {
      op: 'replace',
      path: `/spec/storageDeviceSets/0/count`,
      value: presentCount + 1,
    };
    console.log(patch, 'patch');
    // props
    //   .handlePromise(k8sPatch(OCSServiceModel, ocsConfig, [patch]))
    //   .then(() => {
    //     setProgress(false);
    //     close();
    //   })
    //   .catch((error) => {
    //     setError(error);
    //     setProgress(false);
    //   });
  };

  return (
    <form onSubmit={submit} className="modal-content modal-content--no-inner-scroll">
      <ModalTitle>Add Capacity</ModalTitle>
      <ModalBody>
        Adding capacity for <strong>{getName(ocsConfig)}</strong>, may increase your cloud expenses.
        <div className="ceph-add-capacity__modal">
          <div
            className={classNames(
              'ceph-add-capacity_sc-dropdown',
              storageClass?.provisioner === NO_PROVISIONER
                ? ''
                : 'ceph-add-capacity_sc-dropdown__margin',
            )}
          >
            <OCSStorageClassDropdown onChange={handleStorageClass} />
          </div>
          {storageClass?.provisioner === NO_PROVISIONER ? (
            <div
              className="ceph-add-capacity__current-capacity"
              data-test-id="ceph-add-capacity-pvs-available-capacity"
            >
              <div className="text-secondary ceph-add-capacity__current-capacity--text">
                <strong>Available capacity:</strong>
              </div>
              {`${pvsAvailableCapacity} / ${ocsConfig.spec.storageDeviceSets[0].replica} replicas`}
            </div>
          ) : (
            <div data-test-id="ceph-add-capacity-raw-capacity">
              <label className="control-label" htmlFor="requestSize">
                Raw Capacity
                <FieldLevelHelp>{labelTooltip}</FieldLevelHelp>
              </label>
              <div className="ceph-add-capacity__form">
                <input
                  className={classNames('pf-c-form-control', 'ceph-add-capacity__input')}
                  type="number"
                  name="requestSize"
                  value={osdSizeWithoutUnit}
                  required
                  disabled
                />
                <div className="ceph-add-capacity__input--info-text">
                  x 3 replicas = <strong>{provisionedCapacity} TiB</strong>
                </div>
              </div>
              <div className="ceph-add-capacity__current-capacity">
                <div className="text-secondary ceph-add-capacity__current-capacity--text">
                  <strong>Currently Used:</strong>
                </div>
                {currentCapacity}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalSubmitFooter
        inProgress={inProgress}
        errorMessage={errorMessage}
        submitText="Add"
        cancel={cancel}
      />
    </form>
  );
});

export type AddCapacityModalProps = {
  kind?: any;
  ocsConfig?: any;
  handlePromise: <T>(promise: Promise<T>) => Promise<T>;
  cancel?: () => void;
  close?: () => void;
};

export const addCapacityModal = createModalLauncher(AddCapacityModal);
