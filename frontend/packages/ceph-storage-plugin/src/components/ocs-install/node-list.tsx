import * as React from 'react';
import * as _ from 'lodash';

import * as classNames from 'classnames';
import { sortable } from '@patternfly/react-table';

import {
  ResourceLink,
  humanizeBinaryBytes,
} from '@console/internal/components/utils/index';
import { getNodeRoles, K8sResourceKind } from '@console/internal/module/k8s';
import { Table, TableRow, TableData } from '@console/internal/components/factory';

const tableColumnClasses = [
  classNames('col-md-1', 'col-sm-1', 'col-xs-1'),
  classNames('col-md-5', 'col-sm-6', 'col-xs-8'),
  classNames('col-md-2', 'col-sm-3', 'hidden-2'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'hidden-2', 'hidden-xs'),
];

const NodeTableHeader = () => {
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
      title: 'CPU',
      props: { className: tableColumnClasses[3] },
    },
    {
      title: 'Memory',
      props: { className: tableColumnClasses[4] },
    }
  ];
};
NodeTableHeader.displayName = 'NodeTableHeader';

const getConvertedUnits = (value, initialUnit, preferredUnit) => {
  return (
    humanizeBinaryBytes(_.slice(value, 0, value.length - 2).join(''), initialUnit, preferredUnit)
      .string || '-'
  );
};

export const NodeTableRow: React.FC<NodeTableRowProps> = React.memo(({
  obj: node,
  index,
  key,
  style,
  customData,
  onSelect,
}) => {
  const roles = getNodeRoles(node).sort();
  const isChecked = customData.length > index ? customData[index].selected : false;

  return (
    <TableRow id={node.metadata.uid} index={index} trKey={key} style={style}>
      <TableData className={`pf-c-table__check ${tableColumnClasses[0]}`}>
        <input
          type="checkbox"
          checked={isChecked}
          name={`checkbox${index}`}
          onChange={(e) => {
            onSelect(e, e.target.checked, index);
          }}
        />
      </TableData>
      <TableData className={tableColumnClasses[1]}>
        <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />
      </TableData>
      <TableData className={tableColumnClasses[2]}>{roles.join(', ') || '-'}</TableData>
      <TableData className={tableColumnClasses[3]}>
        {_.get(node.status, 'capacity.cpu') || '-'} CPU
        </TableData>
      <TableData className={tableColumnClasses[4]}>
        {getConvertedUnits(_.get(node.status, 'allocatable.memory'), 'KiB', 'GiB')}
      </TableData>
    </TableRow>
  );
});

export const NodeList: React.FC<NodeListProps> = React.memo((props) => {

  return (
    <Table
      {...props}
      customData={props.customData}
      loaded={true}
      Header={NodeTableHeader}
      Row={(nodeProps) => <NodeTableRow {...nodeProps} onSelect={props.onSelect} />} // this is the correct select callback for single row
      aria-label="Nodes"
      onSelect={props.onSelect} // this is the selectAll callback for virtualized tables
    />
  );
});

type NodeTableRowProps = {
  obj: K8sResourceKind;
  index: number;
  key?: string;
  style: object;
  customData?: any;
  onSelect?: Function;
};

type NodeListProps = {
  customData?: any;
  onSelect: (event: React.MouseEvent<HTMLButtonElement>, isSelected: boolean, virtualRowIndex: number) => void;
  onSelectAll: (event: React.MouseEvent<HTMLButtonElement>, isSelected: boolean, virtualRowIndex: number) => void;
  data: Record<string, any>[];
  updateSelectedNodes: (customData: Array<Object>) => void;
};