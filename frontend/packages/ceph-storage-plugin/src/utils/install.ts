import * as _ from 'lodash';
import { NodeKind, Taint } from '@console/internal/module/k8s';
import { ocsTaint } from '../constants/ocs-install';
import { humanizeBinaryBytes, convertToBaseValue } from '@console/internal/components/utils';

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

export const getTotalDeviceCapacity = (list: any) => {
  return humanizeBinaryBytes(_.reduce(
    list,
    (result, devices, node) => {
      const sum = devices.reduce((sum, device) => {
        if (device?.status?.state === 'Available') {
          const capacity = Number(convertToBaseValue(device.size));
          return sum + capacity;
        } else return sum + 0;
      }, 0);
      return sum;
    },
    0,
  ));
};
