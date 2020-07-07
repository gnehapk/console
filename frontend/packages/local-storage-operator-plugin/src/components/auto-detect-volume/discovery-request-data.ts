import { apiVersionForModel } from '@console/internal/module/k8s';
import { LocalVolumeDiscovery as AutoDetectVolumeModel } from '../../models';
import { DISCOVERY_CR_NAME, LOCAL_STORAGE_NAMESPACE } from '../../constants';
import { K8sResourceCommon } from '@console/internal/module/k8s';

export const getDiscoveryRequestData = ({
  showNodesListOnADV,
  nodeNamesForLVS,
  allNodeNamesOnADV,
}: {
  showNodesListOnADV: boolean;
  nodeNamesForLVS: string[];
  allNodeNamesOnADV: string[];
}): AutoDetectVolumeKind => ({
  apiVersion: apiVersionForModel(AutoDetectVolumeModel),
  kind: AutoDetectVolumeModel.kind,
  metadata: { name: DISCOVERY_CR_NAME, namespace: LOCAL_STORAGE_NAMESPACE },
  spec: {
    nodeSelector: {
      nodeSelectorTerms: [
        {
          matchExpressions: [
            {
              key: 'kubernetes.io/hostname',
              operator: 'In',
              values: nodeNamesForLVS,
            },
          ],
        },
      ],
    },
  },
});

type AutoDetectVolumeKind = K8sResourceCommon & {
  spec: {
    nodeSelector?: {
      nodeSelectorTerms: [
        {
          matchExpressions: [{ key: string; operator: string; values: string[] }];
        },
      ];
    };
  };
};
