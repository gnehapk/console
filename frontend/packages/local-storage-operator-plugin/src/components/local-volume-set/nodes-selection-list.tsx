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
import { getName, getNodeCPUCapacity, getNodeAllocatableMemory } from '@console/shared';
import { GetRows } from './types';
import './node-selection-list.scss';

const tableColumnClasses = [
  classNames('pf-u-w-30-on-sm'),
  classNames('pf-m-hidden', 'pf-m-visible-on-sm', 'pf-u-w-10-on-sm'),
  classNames('pf-m-hidden', 'pf-m-visible-on-sm', 'pf-u-w-20-on-sm'),
  classNames('pf-m-hidden', 'pf-m-visible-on-sm', 'pf-u-w-20-on-sm'),
  classNames('pf-m-hidden', 'pf-m-visible-on-sm', 'pf-u-w-20-on-sm'),
];

const setTableHeader = () => {
  return [
    {
      title: 'Name',
      sortField: 'metadata.name',
      transforms: [sortable],
      props: { className: tableColumnClasses[0] },
    },
    {
      title: 'CPU',
      props: { className: tableColumnClasses[1] },
    },
    {
      title: 'Memory',
      props: { className: tableColumnClasses[2] },
    },
    {
      title: 'Location',
      props: { className: tableColumnClasses[3] },
    },
    {
      title: 'Taints',
      props: { className: tableColumnClasses[3] },
    },
  ];
};

const getSelected = (selected: NodeKind[], nodeUID: string) =>
  selected.map((node) => node.metadata.uid).includes(nodeUID);

const getRows: GetRows = ({ componentProps, customData }) => {
  const { data: filteredData } = componentProps;
  const { selectedNodes, setVisibleRows, visibleRows } = customData;

  const rows = filteredData.map((node: NodeKind) => {
    const cpuSpec: string = getNodeCPUCapacity(node);
    const memSpec: string = getNodeAllocatableMemory(node);
    const nodeTaints = node.spec?.taints?.length ?? 0;
    const cells: IRow['cells'] = [
      {
        title: <ResourceLink kind="Node" name={getName(node)} title={node.metadata.uid} />,
      },
      {
        title: `${humanizeCpuCores(cpuSpec).string || '-'}`,
      },
      {
        title: humanizeBinaryBytes(convertToBaseValue(memSpec)).string ?? '-',
      },
      {
        title: node.metadata.labels?.['failure-domain.beta.kubernetes.io/zone'] ?? '-',
      },
      {
        title: pluralize(nodeTaints, 'taint'),
      },
    ];
    return {
      cells,
      selected: getSelected(selectedNodes, node.metadata.uid),
      props: {
        id: node.metadata.uid,
      },
    };
  });

  if (!_.isEqual(filteredData, visibleRows)) {
    setVisibleRows(filteredData);
  }
  return rows;
};

export const NodesSelectionList: React.FC<NodesSelectionListProps> = (props) => {
  const { selectedNodes } = props.customData;

  return (
    <>
      <div className="lso-node-selection-table__table--scroll">
        <Table
          {...props}
          aria-label="Select nodes for creating volume filter"
          data-test-id="create-lvs-form-node-selection-table"
          Header={setTableHeader}
          Rows={getRows}
          customData={props.customData}
          virtualize={false}
        />
      </div>
      <Text data-test-id="create-lvs-form-selected-nodes" component="h6">
        {`${pluralize(selectedNodes?.length || 0, 'node')} selected`}
      </Text>
    </>
  );
};

type NodesSelectionListProps = {
  data: NodeKind[];
  customData: {
    selectedNodes: NodeKind[];
    setSelectedNodes: React.Dispatch<React.SetStateAction<NodeKind[]>>;
    visibleRows: NodeKind[];
    setVisibleRows: React.Dispatch<React.SetStateAction<NodeKind[]>>;
  };
};
