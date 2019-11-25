export const OCS_OP = 'Openshift Container Storage Operator';
export const NS = 'openshift-storage';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

export const STORAGE_CLUSTER_NAME = 'ocs-storagecluster';

export enum POD_NAME_PATTERNS {
  OCS = 'ocs-operator-',
  ROOK = 'rook-ceph-operator-',
  NOOBA_OPERATOR = 'noobaa-operator-',
  NOOBAA_CORE = 'noobaa-core-',
  ROOK_CEPH_MON = 'rook-ceph-mon',
  ROOK_CEPH_MGR = 'rook-ceph-mgr',
  CSI_CEPHFS = 'csi-cephfsplugin-',
  CSI_RBD = 'csi-rbdplugin-',
  ROOK_CEPH_MDS = 'rook-ceph-mds-ocs-storagecluster-cephfilesystem',
  ROOK_CEPH_OSD = 'rook-ceph-osd-',
  ROOK_CEPH_OSD_PREPARE = 'rook-ceph-osd-prepare-',
}

export enum STORAGE_CLASS_PATTERNS {
  RBD = 'ocs-storagecluster-ceph-rbd',
  FS = 'ocs-storagecluster-cephfs',
  NOOBAA = 'noobaa.io',
}

export const OCS_NODE_LABEL = 'cluster.ocs.openshift.io/openshift-storage';

export const KIND = 'storagecluster';
export const EXPANDWAIT = 15 * MINUTE;
export const STORAGECLUSTERTABCNT = 15;
export const CAPACITYUNIT = 'TiB';
export const CAPACITYVALUE = '2';