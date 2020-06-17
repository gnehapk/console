import * as React from 'react';
import * as _ from 'lodash';
import { K8sResourceCommon } from '@console/internal/module/k8s';
import { IRowData } from '@patternfly/react-table';

export const useSelectList = <R extends K8sResourceCommon>(
  visibleRows: R[],
  onRowSelected: any,
  data: R[],
): {
  onSelect: (
    event: React.MouseEvent,
    isSelected: boolean,
    rowIndex: number,
    rowData: IRowData,
  ) => void;
  selectedRows: R[];
  setSelectedRows: React.Dispatch<React.SetStateAction<R[]>>;
} => {
  const [selectedRows, setSelectedRows] = React.useState<R[]>([]);

  const onSelect = (
    _event: React.MouseEvent,
    isSelected: boolean,
    rowIndex: number,
    rowData: IRowData,
  ) => {
    const selectedUIDs = selectedRows?.map((node) => node.metadata.uid) ?? [];
    const visibleUIDs = visibleRows?.map((row) => row.metadata.uid);
    let data = [];
    if (rowIndex === -1) {
      if (isSelected) {
        const uniqueUIDs = _.uniq([...visibleUIDs, ...selectedUIDs]);
        data = _.uniqBy(
          [...visibleRows, ...selectedRows].filter((node) =>
            uniqueUIDs.includes(node.metadata.uid),
          ),
          (n) => n.metadata.uid,
        );
        setSelectedRows(data);
      } else {
        data = _.uniqBy(
          selectedRows.filter((node) => !visibleUIDs.includes(node.metadata.uid)),
          (n) => n.metadata.uid,
        );
        setSelectedRows(data);
      }
    } else {
      const uniqueUIDs = _.xor(selectedUIDs, [rowData?.props?.id]);
      data = _.uniqBy(
        [...visibleRows, ...selectedRows].filter((node) => uniqueUIDs.includes(node.metadata.uid)),
        (n) => n.metadata.uid,
      );
      setSelectedRows(data);
    }
    //onRowSelected(data);
  };
  return {
    onSelect,
    selectedRows,
    setSelectedRows,
  };
};
