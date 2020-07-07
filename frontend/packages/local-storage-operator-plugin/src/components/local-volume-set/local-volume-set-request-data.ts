import { apiVersionForModel } from '@console/internal/module/k8s';
import { LocalVolumeSetModel } from '../../models';
import { LocalVolumeSetKind, DiskType, DiskMechanicalProperty } from './types';
import { State } from './state';

export const getLocalVolumeSetRequestData = (state: State): LocalVolumeSetKind => {
  const requestData = {
    apiVersion: apiVersionForModel(LocalVolumeSetModel),
    kind: LocalVolumeSetModel.kind,
    metadata: { name: state.volumeSetName, namespace: 'local-storage' },
    spec: {
      storageClassName: state.storageClassName || state.volumeSetName,
      volumeMode: state.diskMode,
      deviceInclusionSpec: {
        // Only Raw disk supported for 4.6
        deviceTypes: [DiskType.RawDisk],
        deviceMechanicalProperty:
          state.diskType === 'HDD'
            ? [DiskMechanicalProperty[state.diskType]]
            : [DiskMechanicalProperty.SSD],
      },
      nodeSelector: {
        nodeSelectorTerms: [
          {
            matchExpressions: [
              { key: 'kubernetes.io/hostname', operator: 'In', values: state.nodeNames,
            ],
          },
        ],
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // required else giving type error
  if (state.maxDiskLimit) requestData.spec['maxDeviceCount'] = +state.maxDiskLimit;
  if (state.minDiskSize)
    requestData.spec.deviceInclusionSpec['minSize'] = state.minDiskSize.toString();
  if (state.maxDiskSize && state.maxDiskSize !== 'All')
    requestData.spec.deviceInclusionSpec['maxSize'] = state.maxDiskSize.toString();

  return requestData;
};
