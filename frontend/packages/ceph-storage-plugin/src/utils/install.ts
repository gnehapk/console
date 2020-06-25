import * as _ from 'lodash';
import {
  NodeKind,
  Taint,
  StorageClassResourceKind,
  K8sResourceKind,
} from '@console/internal/module/k8s';
import { ocsTaint, NO_PROVISIONER, AVAILABLE } from '../constants';
import { humanizeBinaryBytes, convertToBaseValue } from '@console/internal/components/utils';
import { NodesDiscoveries } from '../components/ocs-install/attached-devices/create-sc/state';

export const hasTaints = (node: NodeKind) => {
  return !_.isEmpty(node.spec?.taints);
};

export const hasOCSTaint = (node: NodeKind) => {
  const taints: Taint[] = node.spec?.taints || [];
  return taints.some((taint: Taint) => _.isEqual(taint, ocsTaint));
};

export const getConvertedUnits = (value: string) => {
  return humanizeBinaryBytes(convertToBaseValue(value)).string ?? '-';
};

export const filterSCWithNoProv = (sc: StorageClassResourceKind) =>
  sc?.provisioner === NO_PROVISIONER;

export const filterSCWithoutNoProv = (sc: StorageClassResourceKind) =>
  sc?.provisioner !== NO_PROVISIONER;

export const getTotalDeviceCapacity = (list: NodesDiscoveries) => {
  const totalCapacity = list.reduce((res, node) => {
    const nodeCapacity = node.discoveries.reduce((sum, device) => {
      if (device?.status?.state === AVAILABLE) {
        const capacity = Number(convertToBaseValue(device.size));
        return sum + capacity;
      }
      return sum + 0;
    }, 0);
    return res + nodeCapacity;
  }, 0);

  return humanizeBinaryBytes(totalCapacity);
};

export const getAssociatedNodes = (pvs: K8sResourceKind[]): string[] => {
  const nodes = pvs.reduce((res, pv) => {
    const nodeName = pv?.metadata?.labels['kubernetes.io/hostname'];
    if (nodeName) {
      res.add(nodeName);
    }
    return res;
  }, new Set<string>());

  return Array.from(nodes);
};
