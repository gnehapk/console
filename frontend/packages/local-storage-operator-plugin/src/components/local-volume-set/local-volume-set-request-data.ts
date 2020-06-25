import { apiVersionForModel } from '@console/internal/module/k8s';
import { LocalVolumeSetModel } from '../../models';
import { LocalVolumeSetKind, DiskType, DiskMechanicalProperty } from './types';
import { State } from './state';
import { MAX_DISK_SIZE, LOCAL_STORAGE_NAMESPACE, LABEL_KEY, LABEL_OPERATOR } from '../../constants';
import { getNodes } from '../../utils';

export const getLocalVolumeSetRequestData = (state: State): LocalVolumeSetKind => {
  const requestData = {
    apiVersion: apiVersionForModel(LocalVolumeSetModel),
    kind: LocalVolumeSetModel.kind,
    metadata: { name: state.volumeSetName, namespace: LOCAL_STORAGE_NAMESPACE },
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
              {
                key: LABEL_KEY,
                operator: LABEL_OPERATOR,
                values: getNodes(state.showNodesListOnLVS, state.nodeNamesForLVS, state.nodeNames),
              },
            ],
          },
        ],
      },
    },
  } as LocalVolumeSetKind;

  if (state.maxDiskLimit) requestData.spec.maxDeviceCount = +state.maxDiskLimit;
  if (state.minDiskSize)
    requestData.spec.deviceInclusionSpec.minSize = state.minDiskSize.toString();
  if (state.maxDiskSize && state.maxDiskSize !== MAX_DISK_SIZE)
    requestData.spec.deviceInclusionSpec.maxSize = state.maxDiskSize.toString();

  return requestData;
};
