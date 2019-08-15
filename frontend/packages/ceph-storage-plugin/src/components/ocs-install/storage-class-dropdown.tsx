import * as React from 'react';
import * as _ from 'lodash';
import { Firehose } from '@console/internal/components/utils';
import { SCDropdown } from '@console/internal/components/utils/storage-class-dropdown';
import { K8sResourceKind } from '@console/internal/module/k8s';

const cephStorageProvisioners = ['ceph.rook.io/block', 'cephfs.csi.ceph.com', 'rbd.csi.ceph.com'];

export const OCSStorageClassDropdown = (props) => (
  <Firehose resources={[{ kind: 'StorageClass', prop: 'StorageClass', isList: true }]}>
    <StorageClassDropdown {...props} />
  </Firehose>
);

const StorageClassDropdown = (props) => {
  const getFilteredStorageClassData = (storageClassData: K8sResourceKind[]): K8sResourceKind[] =>
    storageClassData.filter(
      (sc: K8sResourceKind) => !cephStorageProvisioners.includes(_.get(sc, 'provisioner')),
    );

  const scConfig = _.cloneDeep(props);
  const scLoaded = _.get(scConfig.resources.StorageClass, 'loaded');
  const scData = _.get(scConfig.resources.StorageClass, 'data', []) as K8sResourceKind[];
  const filteredSCData = getFilteredStorageClassData(scData);

  if (scLoaded) {
    scConfig.resources.StorageClass.data = filteredSCData;
  }

  return <SCDropdown {...scConfig} />;
};
