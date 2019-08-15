import { K8sResourceKind } from '@console/internal/module/k8s';

export const minSelectedNode = 3;
export const taintObj = {
  key: 'node.ocs.openshift.io/storage',
  value: 'true',
  effect: 'NoSchedule',
};
export const labelObj = { 'cluster.ocs.openshift.io/openshift-storage': '' };

export const ocsRequestData: K8sResourceKind = {
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
      count: '3',
      capacity: '1 TiB',
      storageClassName: '',
      placement: {
        podAntiAffinity: {
          preferredDuringSchedulingIgnoredDuringExecution: {
            weight: 100,
            podAffinityTerm: {
              labelSelector: {
                matchExpressions: {
                  key: 'cluster.ocs.openshift.io/openshift-storage',
                  operator: 'Exists',
                },
              },
            },
          },
        },
      },
    },
  },
};
