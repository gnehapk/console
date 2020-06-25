import { K8sResourceKind } from '@console/internal/module/k8s';

export const getOCSRequestData = (scName?: string, storage?: string): K8sResourceKind => ({
  apiVersion: 'ocs.openshift.io/v1',
  kind: 'StorageCluster',
  metadata: {
    name: 'ocs-storagecluster',
    namespace: 'openshift-storage',
  },
  spec: {
    manageNodes: false,
    storageDeviceSets: [
      {
        name: 'ocs-deviceset',
        count: 1,
        replica: 3,
        resources: {},
        placement: {},
        portable: true,
        dataPVCTemplate: {
          spec: {
            storageClassName: scName,
            accessModes: ['ReadWriteOnce'],
            volumeMode: 'Block',
            resources: {
              requests: {
                storage,
              },
            },
          },
        },
      },
    ],
  },
});
