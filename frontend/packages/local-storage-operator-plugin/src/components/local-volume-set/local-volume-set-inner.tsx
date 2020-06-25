import * as React from 'react';
import {
  FormGroup,
  TextInput,
  Radio,
  Expandable,
  TextInputTypes,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { Dropdown } from '@console/internal/components/utils';
import { ListPage } from '@console/internal/components/factory';
import { k8sList, NodeKind } from '@console/internal/module/k8s';
import { getName } from '@console/shared';
import { NodeModel } from '@console/internal/models';
import { hasTaints } from '@console/ceph-storage-plugin/src/utils/install';
import { NodesSelectionList } from './nodes-selection-list';
import { DiskType, DiskMode } from './types';
import { State, Action } from './state';
import './create-local-volume-set.scss';

export const diskModeDropdownItems = {
  [DiskMode.BLOCK]: 'Block',
  [DiskMode.FILESYSTEM]: 'Filesystem',
};

export const diskTypeDropdownItems = {
  [DiskType.SSD]: 'SSD / NVMe',
  [DiskType.HDD]: 'HDD',
};

const diskSizeUnitOptions = {
  TiB: 'TiB',
  GiB: 'GiB',
};

let allNodeNames: string[] = [];

export const LocalVolumeSetInner: React.FC<LocalVolumeSetInnerProps> = (props) => {
  const { dispatch, state, match } = props;
  const { ns, appName } = match;

  React.useEffect(() => {
    k8sList(NodeModel).then((nodes: NodeKind[]) => {
      allNodeNames = nodes.filter((node) => !hasTaints(node)).map((node) => getName(node));
      dispatch({ type: 'setNodeNames', value: allNodeNames });
    });
  }, [ns, appName, dispatch]);

  React.useEffect(() => {
    if (!state.showNodesList) {
      dispatch({ type: 'setNodeNames', value: allNodeNames });
    }
  }, [dispatch, state.showNodesList]);

  const toggleShowNodesList = () => {
    dispatch({ type: 'setShowNodesList', value: !state.showNodesList });
  };

  const onMaxSizeChange = (size: string) => {
    if (size !== 'All' && (isNaN(Number(size)) || Number(size) < state.minDiskSize)) {
      dispatch({ type: 'setIsValidMaxSize', value: false });
    } else {
      dispatch({ type: 'setIsValidMaxSize', value: true });
    }
    dispatch({ type: 'setMaxDiskSize', value: size });
  };

  return (
    <>
      <FormGroup label="Volume Set Name" isRequired fieldId="create-lvs--volume-set-name">
        <TextInput
          type={TextInputTypes.text}
          id="create-lvs--volume-set-name"
          value={state.volumeSetName}
          onChange={(name: string) => dispatch({ type: 'setVolumeSetName', name })}
          isRequired
        />
      </FormGroup>
      <FormGroup label="Storage Class Name" fieldId="create-lvs--storage-class-name">
        <TextInput
          type={TextInputTypes.text}
          id="create-lvs--storage-class-name"
          value={state.storageClassName}
          onChange={(name: string) => dispatch({ type: 'setStorageClassName', name })}
        />
      </FormGroup>
      <Text component={TextVariants.h3} className="lso-create-lvs__filter-volumes-text--margin">
        Filter Disks
      </Text>
      <FormGroup label="Node Selector" fieldId="create-lvs--radio-group-node-selector">
        <div id="create-lvs--radio-group-node-selector">
          <Radio
            label="All nodes"
            name="nodes-selection"
            id="create-lvs--radio-all-nodes"
            className="lso-create-lvs__all-nodes-radio--padding"
            value="allNodes"
            onChange={toggleShowNodesList}
            description="Selecting all nodes will search for available disks storage on all nodes."
            defaultChecked
          />
          <Radio
            label="Select nodes"
            name="nodes-selection"
            id="create-lvs--radio-select-nodes"
            value="selectedNodes"
            onChange={toggleShowNodesList}
            description="Selecting nodes allow you to limit the search for available disks to specific nodes."
          />
        </div>
      </FormGroup>
      {state.showNodesList && (
        <ListPage
          showTitle={false}
          kind={NodeModel.kind}
          ListComponent={NodesSelectionList}
          customData={{
            onRowSelected: (selectedNodes: NodeKind[]) => {
              const nodes = selectedNodes.map((n) => getName(n));
              dispatch({ type: 'setNodeNames', value: nodes });
            },
          }}
        />
      )}
      <FormGroup label="Disk Type" fieldId="create-lvs--disk-type-dropdown">
        <Dropdown
          id="create-lvs--disk-type-dropdown"
          dropDownClassName="dropdown--full-width"
          items={diskTypeDropdownItems}
          title={diskTypeDropdownItems[state.diskType]}
          selectedKey={state.diskType}
          onChange={(type: DiskType) => dispatch({ type: 'setDiskType', value: type })}
        />
      </FormGroup>
      <Expandable toggleText="Advanced" data-test-id="create-lvs-form-advanced">
        <FormGroup
          label="Disk Mode"
          fieldId="create-lso--disk-mode-dropdown"
          className="lso-create-lvs__disk-mode-dropdown--margin"
        >
          <Dropdown
            id="create-lso--disk-mode-dropdown"
            dropDownClassName="dropdown--full-width"
            items={diskModeDropdownItems}
            title={diskModeDropdownItems[state.diskMode]}
            selectedKey={state.diskMode}
            onChange={(mode: DiskMode) => dispatch({ type: 'setDiskMode', value: mode })}
          />
        </FormGroup>
        <FormGroup
          label="Disk Size"
          fieldId="create-lvs--disk-size"
          className="lso-create-lvs__disk-size-form-group--margin"
        >
          <div id="create-lvs--disk-size" className="lso-create-lvs__disk-size-form-group-div">
            <FormGroup
              label="Min"
              fieldId="create-lvs--min-disk-size"
              className="lso-create-lvs__disk-size-form-group-max-min-input"
            >
              <TextInput
                type={TextInputTypes.number}
                id="create-lvs--min-disk-size"
                value={state.minDiskSize}
                onChange={(size: string) => {
                  dispatch({ type: 'setMinDiskSize', value: size });
                }}
              />
            </FormGroup>
            <div>-</div>
            <FormGroup
              label="Max"
              fieldId="create-lvs--max-disk-size"
              className="lso-create-lvs__disk-size-form-group-max-min-input"
            >
              <TextInput
                type={TextInputTypes.text}
                id="create-lvs--max-disk-size"
                value={state.maxDiskSize}
                isValid={state.isValidMaxSize}
                className="lso-create-lvs__disk-size-form-group-max-input"
                onChange={onMaxSizeChange}
              />
            </FormGroup>
            <Dropdown
              id="create-lvs--disk-size-unit-dropdown"
              items={diskSizeUnitOptions}
              title={state.diskSizeUnit}
              selectedKey={state.diskSizeUnit}
              onChange={(unit: string) => {
                dispatch({ type: 'setDiskSizeUnit', value: unit });
              }}
            />
          </div>
        </FormGroup>
        <FormGroup label="Max Disk Limit" fieldId="create-lvs--max-disk-limit">
          <p className="help-block lso-create-lvs__max-disk-limit-help-text--margin">
            Disk limit will set the maximum number of PVs to create on a node. If the field is
            empty, will create PVs for all available disks on the matching nodes.
          </p>
          <TextInput
            type={TextInputTypes.number}
            id="create-lvs--max-disk-limit"
            value={state.maxDiskLimit}
            onChange={(maxLimit) => dispatch({ type: 'setMaxDiskLimit', value: maxLimit })}
          />
        </FormGroup>
      </Expandable>
    </>
  );
};

type LocalVolumeSetInnerProps = {
  match: { appName: string; ns: string };
  state: State;
  dispatch: React.Dispatch<Action>;
};

export const LocalVolumeSetHeader = () => (
  <>
    <h1 className="co-create-operand__header-text">Local Volume Set</h1>
    <p className="help-block">
      A Local Volume Set allows you to filter a set of storage volumes, group them and create a
      dedicated storage class to consume storage for them.
    </p>
  </>
);
