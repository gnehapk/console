import * as React from 'react';
import * as _ from 'lodash';
import * as classNames from 'classnames';
import { connect } from 'react-redux';
import {
  IDecorator,
  ISortBy,
  sortable,
  SortByDirection,
  Table,
  TableBody,
  TableHeader,
  TableVariant,
} from '@patternfly/react-table';

import { humanizeBinaryBytes, ResourceLink } from '@console/internal/components/utils/index';
import { getNodeRoles, K8sResourceKind } from '@console/internal/module/k8s';
import { tableFilters } from '@console/internal/components/factory/table-filters';
import { OCSContext } from './create-form';

const ocsLabel = "cluster.ocs.openshift.io/openshift-storage";

const getConvertedUnits = (value, initialUnit, preferredUnit) => {
  return (
    humanizeBinaryBytes(_.slice(value, 0, value.length - 2).join(''), initialUnit, preferredUnit)
      .string || '-'
  );
};

const tableColumnClasses = [
  classNames('col-md-1', 'col-sm-1', 'col-xs-1'),
  classNames('col-md-5', 'col-sm-6', 'col-xs-8'),
  classNames('col-md-2', 'col-sm-3', 'hidden-2'),
  classNames('col-md-2', 'hidden-sm', 'hidden-xs'),
  classNames('col-md-2', 'hidden-2', 'hidden-xs'),
];

const getColumns = () => {
  return [
    {
      title: 'Name',
      sortField: 'metadata.name',
      transforms: [sortable as (v: any) => IDecorator],
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
    },
  ];
};

const getRows = (nodes) => {
  return nodes.map((node) => {
    const roles = getNodeRoles(node).sort();
    const obj = { cells: [], selected: false, id: node.metadata.name, metadata: _.clone(node.metadata), spec: _.clone(node.spec)};
    obj.cells = [
      {
        title: <ResourceLink kind="Node" name={node.metadata.name} title={node.metadata.uid} />,
      },
      {
        title: roles.join(', ') || '-',
      },
      {
        title: `${_.get(node.status, 'capacity.cpu') || '-'} CPU`,
      },
      {
        title: `${getConvertedUnits(_.get(node.status, 'allocatable.memory'), 'KiB', 'GiB')}`,
      },
    ];
    return obj;
  });
};

const getAllTableFilters = (rowFilters) => ({
  ...tableFilters,
});

const getFilteredRows = (_filters, rowFilters, objects) => {
  if (_.isEmpty(_filters)) {
    return objects;
  }

  const allTableFilters = getAllTableFilters(rowFilters);
  let filteredObjects = objects;
  _.each(_filters, (value, name) => {
    const filter = allTableFilters[name];
    if (_.isFunction(filter)) {
      filteredObjects = _.filter(filteredObjects, o => filter(value, o));
    }
  });

  return filteredObjects;
};

const getPreSelectedNodes = (nodes) => {
  nodes.forEach((node) => {
    node.selected = _.get(node, `metadata.labels['${ocsLabel}']`) !== undefined;
  });
};

// used redux for filtering of nodes
const stateToProps = ({ }, {
  data = [],
  filters = {},
  staticFilters = [{}],
  rowFilters = [] }) => {
  const allFilters = staticFilters ? Object.assign({}, filters, ...staticFilters) : filters;
  let newData = getFilteredRows(allFilters, rowFilters, data);
  return {
    data: newData,
    unfilteredData: data,
  };
};

const CustomNodeTable: React.FC<CustomNodeTableProps> = ({ data, context, loaded }) => {
  const columns = getColumns();
  const [rows, setRows] = React.useState([]);
  const [sortBy, setSortBy] = React.useState<ISortBy>({ index: 0, direction: 'asc' });

  React.useEffect(() => {
    //calls when the data is called for 1st time
    const formattedRows = getRows(data);
    if (loaded && !rows.length) {
      // pre-select the nodes if alreday labeled
      getPreSelectedNodes(formattedRows);
      setRows(formattedRows);
    } else {
      //const newRows = getRows(data);
      // restore the selection state of node if selected
      if (data.length) {
        rows.forEach(row => {
          if (row.selected) {
            const index = formattedRows.findIndex(r => r.id === row.id);
            formattedRows[index].selected = true;
          }
        })
      }
      setRows(formattedRows);
    }
    // updating the nodes of create-form component
    context.nodesHandler(rows);
  }, [data]);

  const onSort = (e, index, direction) => {
    e.preventDefault();
    // sorting by node's name which is stored in id
    const sortedRows = rows.sort((r1, r2) =>
      r1.id < r1.id ? -1 : r1.id > r2.id ? 1 : 0,
    );
    setRows(direction === SortByDirection.asc ? sortedRows : sortedRows.reverse());
    setSortBy({ index, direction });
  };

  const onSelect = (event, isSelected, rowId) => {
    let newrows;
    if (rowId === -1) {
      newrows = rows.map((oneRow) => {
        oneRow.selected = isSelected;
        return oneRow;
      });
    } else {
      newrows = [...rows];
      newrows[rowId].selected = isSelected;
    }
    context.nodesHandler(newrows);
    setRows(newrows);
  };


  return (
    <Table
      onSelect={onSelect}
      cells={columns}
      rows={rows}
      sortBy={sortBy}
      onSort={onSort}
      variant={TableVariant.compact}
    >
      <TableHeader />
      <TableBody />
    </Table>
  );
};

const NodeTable = connect<{}, {}, CustomNodeTableProps>(stateToProps)(CustomNodeTable);

export const NodeList: React.FC<NodeListProps> = (props) => {
  return <OCSContext.Consumer>
    {(context: ContextType) => {
      return <NodeTable {...props} context={context} />
    }}
  </OCSContext.Consumer>
};

type NodeListProps = {
  data: K8sResourceKind[];
  loaded: boolean;
};

type CustomNodeTableProps = {
  context: ContextType;
  data: K8sResourceKind[];
  loaded: boolean;
};

type ContextType = {
  nodesHandler: (value: any[] | ((prevVar: any[]) => any[])) => void
};
