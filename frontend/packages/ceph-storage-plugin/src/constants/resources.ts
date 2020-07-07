import { FirehoseResource } from '@console/internal/components/utils/index';
import { referenceForModel } from '@console/internal/module/k8s/k8s';
import { PersistentVolumeModel, StorageClassModel, NodeModel } from '@console/internal/models';
import { WatchK8sResource } from '@console/internal/components/utils/k8s-watch-hook';
import { LocalVolumeSetModel } from '@console/local-storage-operator-plugin/src/models';
import { CephClusterModel } from '../models';
import { LSO_NAMESPACE } from '.';

export const cephClusterResource: FirehoseResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
  prop: 'ceph',
};

export const pvResource: WatchK8sResource = {
  kind: PersistentVolumeModel.kind,
  namespaced: false,
  isList: true,
};

export const scResource: WatchK8sResource = {
  kind: StorageClassModel.kind,
  namespaced: false,
  isList: true,
};

export const lvsResource: WatchK8sResource = {
  kind: referenceForModel(LocalVolumeSetModel),
  namespace: LSO_NAMESPACE,
  isList: true,
};

export const nodeResource: WatchK8sResource = {
  kind: NodeModel.kind,
  namespaced: false,
  isList: true,
};
