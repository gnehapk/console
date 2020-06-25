import * as React from 'react';
import * as _ from 'lodash';
import { match } from 'react-router';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { useDispatch } from 'react-redux';
import { Alert, ActionGroup, Button, Form, FormGroup } from '@patternfly/react-core';
import {
  NodeKind,
  k8sPatch,
  k8sCreate,
  referenceForModel,
  StorageClassResourceKind,
} from '@console/internal/module/k8s';
import { ListPage } from '@console/internal/components/factory';
import { NodeModel } from '@console/internal/models';
import { getName, hasLabel } from '@console/shared';
import {
  withHandlePromise,
  HandlePromiseProps,
  history,
  FieldLevelHelp,
  ButtonBar,
} from '@console/internal/components/utils';
import { setFlag } from '@console/internal/actions/features';
import {
  labelTooltip,
  minSelectedNode,
  storageClassTooltip,
  defaultRequestSize,
} from '../../constants/ocs-install';
import { OCSServiceModel } from '../../models';
import { OCSStorageClassDropdown } from '../modals/storage-class-dropdown';
import { OSDSizeDropdown } from '../../utils/osd-size-dropdown';
import { cephStorageLabel } from '../../selectors';
import NodeTable from './node-list';
import { OCS_FLAG, OCS_CONVERGED_FLAG } from '../../features';
import { NO_PROVISIONER } from '../../constants';
import { getOCSRequestData } from './ocs-request-data';

import './ocs-install.scss';

export const makeLabelNodesRequest = (selectedNodes: NodeKind[]): Promise<NodeKind>[] => {
  const patch = [
    {
      op: 'add',
      path: '/metadata/labels/cluster.ocs.openshift.io~1openshift-storage',
      value: '',
    },
  ];
  return _.reduce(
    selectedNodes,
    (accumulator, node) => {
      return hasLabel(node, cephStorageLabel)
        ? accumulator
        : [...accumulator, k8sPatch(NodeModel, node, patch)];
    },
    [],
  );
};

const makeOCSRequest = (
  selectedData: NodeKind[],
  storageClass: StorageClassResourceKind,
  osdSize: string,
): Promise<any> => {
  const promises = makeLabelNodesRequest(selectedData);
  const scName = getName(storageClass);
  const ocsObj = getOCSRequestData(scName, osdSize);

  return Promise.all(promises).then(() => {
    if (!scName) {
      throw new Error('No StorageClass selected');
    }
    return k8sCreate(OCSServiceModel, ocsObj);
  });
};

export const CreateOCSServiceForm = withHandlePromise<
  CreateOCSServiceFormProps & HandlePromiseProps
>((props) => {
  const {
    handlePromise,
    errorMessage,
    inProgress,
    match: {
      params: { appName, ns },
    },
  } = props;
  const [osdSize, setOSDSize] = React.useState(defaultRequestSize.NON_BAREMETAL);
  const [storageClass, setStorageClass] = React.useState<StorageClassResourceKind>(null);
  const dispatch = useDispatch();
  const [nodes, setNodes] = React.useState<NodeKind[]>([]);

  const submit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    // eslint-disable-next-line promise/catch-or-return
    handlePromise(makeOCSRequest(nodes, storageClass, osdSize)).then(() => {
      dispatch(setFlag(OCS_CONVERGED_FLAG, true));
      dispatch(setFlag(OCS_FLAG, true));
      history.push(
        `/k8s/ns/${ns}/clusterserviceversions/${appName}/${referenceForModel(
          OCSServiceModel,
        )}/${getName(getOCSRequestData())}`,
      );
    });
  };

  const handleStorageClass = (sc: StorageClassResourceKind) => {
    setStorageClass(sc);
    setOSDSize(defaultRequestSize.NON_BAREMETAL);
  };

  const filterSC = React.useCallback((sc) => sc?.provisioner !== NO_PROVISIONER, []);

  return (
    <div className="co-m-pane__body co-m-pane__form">
      <Alert
        className="co-alert"
        variant="info"
        title="A bucket will be created to provide the OCS Service."
        isInline
      />
      <h3 className="co-m-pane__heading co-m-pane__heading--baseline ceph-ocs-install__pane--capacity--margin">
        <div className="co-m-pane__name">Capacity</div>
      </h3>
      <Form className="co-m-pane__body-group">
        <FormGroup
          fieldId="select-sc"
          label={
            <>
              Storage Class
              <FieldLevelHelp>{storageClassTooltip}</FieldLevelHelp>
            </>
          }
        >
          <div className="ceph-ocs-install__ocs-service-capacity--dropdown">
            <OCSStorageClassDropdown
              onChange={handleStorageClass}
              data-test-id="ocs-dropdown"
              filter={filterSC}
            />
          </div>
        </FormGroup>
        <FormGroup
          fieldId="select-osd-size"
          label={
            <>
              OCS Service Capacity
              <FieldLevelHelp>{labelTooltip}</FieldLevelHelp>
            </>
          }
        >
          <OSDSizeDropdown
            className="ceph-ocs-install__ocs-service-capacity--dropdown"
            selectedKey={osdSize}
            onChange={setOSDSize}
            data-test-id="osd-dropdown"
          />
        </FormGroup>
        <h3 className="co-m-pane__heading co-m-pane__heading--baseline ceph-ocs-install__pane--node--margin">
          <div className="co-m-pane__name">Nodes</div>
        </h3>
        <FormGroup fieldId="select-nodes">
          <p>
            Selected nodes will be labeled with{' '}
            <code>cluster.ocs.openshift.io/openshift-storage=&quot;&quot;</code> to create the OCS
            Service.
          </p>
          <p className="co-legend" data-test-id="warning">
            Select at least 3 nodes in different failure domains with minimum requirements of 16
            CPUs and 64 GiB of RAM per node.
          </p>
          <p>
            3 selected nodes are used for initial deployment. The remaining selected nodes will be
            used by OpenShift as scheduling targets for OCS scaling.
          </p>
          <ListPage
            kind={NodeModel.kind}
            showTitle={false}
            ListComponent={NodeTable}
            customData={{
              onRowSelected: setNodes,
            }}
          />
        </FormGroup>

        <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
          <ActionGroup className="pf-c-form">
            <Button
              type="button"
              variant="primary"
              onClick={submit}
              isDisabled={(nodes?.length ?? 0) < minSelectedNode}
            >
              Create
            </Button>
            <Button type="button" variant="secondary" onClick={history.goBack}>
              Cancel
            </Button>
          </ActionGroup>
        </ButtonBar>
      </Form>
    </div>
  );
});

type CreateOCSServiceFormProps = {
  match: match<{ appName: string; ns: string }>;
};
