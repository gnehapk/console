import { K8sResourceKindReference } from '@console/internal/module/k8s';
import { Extension } from './extension';

namespace ExtensionProperties {
  export interface PersistentVolumeClaimAction {
    /** the kind this action is for */
    kind: K8sResourceKindReference;
    /** label of action */
    label: string;
    /** API group of the resource */
    apiGroup: string;
    /** action callback */
    callback: (kind: K8sResourceKindReference, obj: any) => () => any;
  }
}

export interface PersistentVolumeClaimAction
  extends Extension<ExtensionProperties.PersistentVolumeClaimAction> {
  type: 'PersistentVolumeClaim/Action';
}

export const isPersistentVolumeClaimAction = (e: Extension): e is PersistentVolumeClaimAction =>
  e.type === 'PersistentVolumeClaim/Action';
