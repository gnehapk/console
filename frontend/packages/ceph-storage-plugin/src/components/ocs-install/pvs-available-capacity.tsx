import * as React from 'react';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { StorageClassResourceKind, K8sResourceKind } from '@console/internal/module/k8s';
import { humanizeBinaryBytes } from '@console/internal/components/utils/';
import { getName } from '@console/shared';
import { pvResource } from '../../constants/resources';
import { calcPVsCapacity, getSCAvailablePVs } from '../../selectors';
import '../modals/add-capacity-modal/_add-capacity-modal.scss';
import './pvs-available-capacity.scss';

export const PVsAvailableCapacity: React.FC<PVAvaialbleCapacityProps> = ({ replica, sc }) => {
  const [data, loaded, loadError] = useK8sWatchResource<K8sResourceKind[]>(pvResource);
  let availableCapacity: string = '';

  if (loaded && data) {
    const pvs = getSCAvailablePVs(data, getName(sc));
    availableCapacity = humanizeBinaryBytes(calcPVsCapacity(pvs)).string;
  }

  return (
    <div className="ceph-add-capacity__current-capacity">
      <div className="text-secondary ceph-add-capacity__current-capacity--text">
        <strong>Available capacity:</strong>
      </div>
      {!loaded && (
        <div className="skeleton-text ceph-pvs-available-capacity__current-capacity--loading" />
      )}
      {(loadError || data.length === 0) && loaded && (
        <div className="text-muted">Not Available</div>
      )}
      {loaded && `${availableCapacity} / ${replica} replicas`}
    </div>
  );
};

type PVAvaialbleCapacityProps = {
  replica: string;
  sc: StorageClassResourceKind;
};
