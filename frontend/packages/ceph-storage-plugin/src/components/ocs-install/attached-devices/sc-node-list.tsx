import * as React from 'react';
import * as _ from 'lodash';
import * as classNames from 'classnames';
import {
  getName,
  getNodeRoles,
  getNodeCPUCapacity,
  getNodeAllocatableMemory,
} from '@console/shared';
import { humanizeCpuCores, ResourceLink } from '@console/internal/components/utils/';
import { NodeKind } from '@console/internal/module/k8s';
import { Table } from '@console/internal/components/factory';
import { IRow } from '@patternfly/react-table';
import { getConvertedUnits } from '../../../utils/install';
import '../ocs-install.scss';

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

const getRows: GetRows = ({ componentProps, customData }) => {
  const { data } = componentProps;
  let filteredNodes = [];

  if (customData?.filteredNodes.length) {
    filteredNodes = customData.filteredNodes;
  } else {
    filteredNodes = data.map((node: NodeKind) => node.metadata.name);
  }

  const filteredData = data.filter((node: NodeKind) => filteredNodes.includes(getName(node)));

  const rows = filteredData.map((node: NodeKind) => {
    const roles = getNodeRoles(node).sort();
    const cpuSpec: string = getNodeCPUCapacity(node);
    const memSpec: string = getNodeAllocatableMemory(node);
    const cells: IRow['cells'] = [
      {
        title: <ResourceLink kind="Node" name={getName(node)} title={node.metadata.uid} />,
      },
      {
        title: roles.join(', ') || '-',
      },
      {
        title: node.metadata.labels?.['failure-domain.beta.kubernetes.io/zone'] || '-',
      },
      {
        title: `${humanizeCpuCores(cpuSpec).string || '-'}`,
      },
      {
        title: `${getConvertedUnits(memSpec)}`,
      },
    ];
    return {
      cells,
      props: {
        id: node.metadata.uid,
      },
    };
  });

  return rows;
};

const AttachedDevicesNodeTable: React.FC<NodeTableProps> = (props) => (
  <>
    <div className="ceph-node-list__max-height">
      <Table
        aria-label="Node Table"
        data-test-id="attached-devices-nodes-table"
        {...props}
        Rows={getRows}
        Header={getColumns}
        virtualize={false}
      />
    </div>
  </>
);

export default AttachedDevicesNodeTable;

type NodeTableProps = {
  data: NodeKind[];
  filters: { name: string; label: { all: string[] } };
};

type NodeTableRow = {
  cells: IRow['cells'];
  props: {
    id: string;
  };
};

type GetRows = ({
  componentProps,
  customData,
}: {
  componentProps: { data: NodeKind[] };
  customData?: { filteredNodes: string[] };
}) => NodeTableRow[];
