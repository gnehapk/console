import * as React from 'react';
import * as _ from 'lodash';
import { Text, pluralize } from '@patternfly/react-core';
import * as classNames from 'classnames';
import { sortable, IRow } from '@patternfly/react-table';
import { Table } from '@console/internal/components/factory';
import {
  ResourceLink,
  humanizeBinaryBytes,
  humanizeCpuCores,
  convertToBaseValue,
} from '@console/internal/components/utils';
import { NodeKind } from '@console/internal/module/k8s';
import {
  getName,
  getNodeRoles,
  getNodeCPUCapacity,
  getNodeAllocatableMemory,
} from '@console/shared';
import { useSelectList } from '@console/shared/src/hooks/select-list';
import { hasTaints } from '@console/ceph-storage-plugin/src/utils/install';
import { GetRows } from './types';
import './node-selection-list.scss';

const tableColumnClasses = [
  classNames('col-md-1', 'col-sm-1', 'col-xs-1'),
  classNames('col-md-4', 'col-sm-8', 'col-xs-11'),
  classNames('col-md-2', 'col-sm-3', 'hidden-xs'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-1', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
];

const getColumns = () => {
  return [
    {
      title: 'Name',
      sortField: 'metadata.name',
      transforms: [sortable],
      props: { className: tableColumnClasses[1] },
    },
    {
      title: 'Role',
      props: { className: tableColumnClasses[2] },
    },
    {
      title: 'Location',
      props: { className: tableColumnClasses[3] },
    },
    {
      title: 'CPU',
      props: { className: tableColumnClasses[4] },
    },
    {
      title: 'Memory',
      props: { className: tableColumnClasses[5] },
    },
  ];
};

const getRows: GetRows = ({ componentProps }, visibleRows, setVisibleRows, selectedNodes) => {
  const { data } = componentProps;

  const filteredData = data.filter((node: NodeKind) => !hasTaints(node));
  const rows = filteredData.map((node: NodeKind) => {
    const cpuSpec: string = getNodeCPUCapacity(node);
    const memSpec: string = getNodeAllocatableMemory(node);
    const roles = getNodeRoles(node).sort();
    const cells: IRow['cells'] = [
      {
        title: <ResourceLink kind="Node" name={getName(node)} title={node.metadata.uid} />,
      },
      {
        title: roles.join(', ') ?? '-',
      },
      {
        title: node.metadata.labels?.['failure-domain.beta.kubernetes.io/zone'] ?? '-',
      },
      {
        title: `${humanizeCpuCores(cpuSpec).string || '-'}`,
      },
      {
        title: humanizeBinaryBytes(convertToBaseValue(memSpec)).string ?? '-',
      },
    ];
    return {
      cells,
      selected: selectedNodes.has(node.metadata.uid),
      props: {
        id: node.metadata.uid,
      },
    };
  });

  const uids = new Set(filteredData.map((n) => n.metadata.uid));

  if (!_.isEqual(uids, visibleRows)) {
    setVisibleRows(uids);
  }
  return rows;
};

export const NodesSelectionList: React.FC<NodesSelectionListProps> = (props) => {
  const [visibleRows, setVisibleRows] = React.useState<Set<string>>();

  const { onSelect, selectedRows: selectedNodes } = useSelectList<NodeKind>(
    props.data,
    visibleRows,
    props.customData.onRowSelected,
  );

  return (
    <>
      <div className="lso-node-selection-table__table--scroll">
        <Table
          {...props}
          aria-label="Select nodes for creating volume filter"
          data-test-id="create-lvs-form-node-selection-table"
          Header={getColumns}
          Rows={(rowProps) => getRows(rowProps, visibleRows, setVisibleRows, selectedNodes)}
          customData={props.customData}
          virtualize={false}
          onSelect={onSelect}
        />
      </div>
      <Text data-test-id="create-lvs-form-selected-nodes" component="h6">
        {pluralize(selectedNodes?.size, 'node')} selected
      </Text>
    </>
  );
};

type NodesSelectionListProps = {
  data: NodeKind[];
  customData: {
    onRowSelected: (nodes: NodeKind[]) => void;
  };
};
