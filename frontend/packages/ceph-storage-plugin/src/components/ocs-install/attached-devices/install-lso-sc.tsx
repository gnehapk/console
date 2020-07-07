import * as React from 'react';
import { match } from 'react-router';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { useDispatch } from 'react-redux';
import { Alert, ActionGroup, Button, Form, FormGroup } from '@patternfly/react-core';
import {
  NodeKind,
  StorageClassResourceKind,
  referenceForModel,
  k8sCreate,
  K8sResourceKind,
} from '@console/internal/module/k8s';
import { ListPage } from '@console/internal/components/factory';
import { NodeModel } from '@console/internal/models';
import {
  withHandlePromise,
  HandlePromiseProps,
  history,
  FieldLevelHelp,
  ButtonBar,
} from '@console/internal/components/utils';
import { setFlag } from '@console/internal/actions/features';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { getName } from '@console/shared';
import {
  minSelectedNode,
  storageClassTooltip,
  defaultRequestSize,
} from '../../../constants/ocs-install';
import { NO_PROVISIONER } from '../../../constants';
import { OCSServiceModel } from '../../../models';
import { OCSStorageClassDropdown } from '../../modals/storage-class-dropdown';
import AttachedDevicesNodeTable from './sc-node-list';
import { PVsAvailableCapacity } from '../pvs-available-capacity';
import { OCS_CONVERGED_FLAG, OCS_FLAG } from '../../../features';
import { makeLabelNodesRequest } from '../create-form';
import { lvsResource, scResource } from '../../../constants/resources';
import { getOCSRequestData } from '../ocs-request-data';
import '../ocs-install.scss';
import './attached-devices.scss';

const makeOCSRequest = (
  selectedData: NodeKind[],
  storageClass: StorageClassResourceKind,
): Promise<any> => {
  const promises = makeLabelNodesRequest(selectedData);
  const scName = getName(storageClass);
  const ocsObj = getOCSRequestData(scName, defaultRequestSize.BAREMETAL);

  ocsObj.spec.monDataDirHostPath = '/var/lib/rook';
  ocsObj.spec.storageDeviceSets[0].portable = false;
  console.log(ocsObj, 'ocs');

  return Promise.all(promises).then(() => {
    if (!scName) {
      throw new Error('No StorageClass selected');
    }
    return k8sCreate(OCSServiceModel, ocsObj);
  });
};

export const CreateOCS = withHandlePromise<CreateOCSProps & HandlePromiseProps>((props) => {
  const { handlePromise, errorMessage, inProgress, match, setIsNewSCToBeCreated } = props;
  const { appName, ns } = match.params;
  const [filteredNodes, setFilteredNodes] = React.useState<string[]>([]);
  const [storageClass, setStorageClass] = React.useState<StorageClassResourceKind>(null);
  const [nodes, setNodes] = React.useState<NodeKind[]>([]);
  const [lvsList, setLvsList] = React.useState<K8sResourceKind[]>([]);
  const dispatch = useDispatch();
  const [lvsData, lvsLoaded, lvsLoadError] = useK8sWatchResource<K8sResourceKind[]>(lvsResource);
  // const [scData, scLoaded, scLoadError] = useK8sWatchResource<StorageClassResourceKind[]>(
  //   scResource,
  // );

  // React.useEffect(() => {
  //   if ((scLoadError || scData.length === 0) && scLoaded) {
  //     setIsNoProvSCPresent(false);
  //   } else if (scLoaded) {
  //     const filteredSCData = scData.filter(
  //       (sc: StorageClassResourceKind) => sc?.provisioner === NO_PROVISIONER,
  //     );
  //     if (filteredSCData.length) {
  //       setIsNoProvSCPresent(true);
  //     }
  //   }

  //   return () => {
  //     stopWatchK8sResource(scResource);
  //   };
  // }, [scData, scLoaded, scLoadError]);
  

  const handleStorageClass = (sc: StorageClassResourceKind) => {
    setStorageClass(sc);

    const [lvs] = lvsList.filter((l) => l?.spec?.storageClassName === sc?.metadata?.name);
    setFilteredNodes(
      lvs?.spec?.nodeSelector?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values,
    );
  };

  React.useEffect(() => {
    if ((lvsLoadError || lvsData.length === 0) && lvsLoaded) {
      setLvsList([]);
      setFilteredNodes([]);
    } else if (lvsLoaded) {
      setLvsList(lvsData);
    }
  }, [lvsData, lvsLoaded, lvsLoadError]);

  const submit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    // eslint-disable-next-line promise/catch-or-return
    handlePromise(makeOCSRequest(nodes, storageClass)).then(() => {
      dispatch(setFlag(OCS_CONVERGED_FLAG, true));
      dispatch(setFlag(OCS_FLAG, true));
      history.push(
        `/k8s/ns/${ns}/clusterserviceversions/${appName}/${referenceForModel(
          OCSServiceModel,
        )}/${getName(getOCSRequestData())}`,
      );
    });
  };

  const onlyNoProvSC = React.useCallback(
    (sc: StorageClassResourceKind) => sc?.provisioner === NO_PROVISIONER,
    [],
  );

  const goToCreateSC = () => {
    setIsNewSCToBeCreated(true);
  };

  return (
    <div className="co-m-pane__form">
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
              filter={onlyNoProvSC}
            />
          </div>
          <PVsAvailableCapacity
            replica={getOCSRequestData().spec.storageDeviceSets[0].replica}
            data-test-id="ceph-ocs-install-pvs-available-capacity"
            sc={storageClass}
          />
        </FormGroup>
        <h3 className="co-m-pane__heading co-m-pane__heading--baseline ceph-ocs-install__pane--node--margin">
          <div className="co-m-pane__name">Nodes</div>
        </h3>
        {storageClass ? (
          <FormGroup fieldId="select-nodes">
            <p>
              Nodes will be labeled with{' '}
              <code>cluster.ocs.openshift.io/openshift-storage=&quot;&quot;</code> to create the OCS
              Service.
            </p>
            <p>
              3 selected nodes are used for initial deployment. The remaining selected nodes will be
              used by OpenShift as scheduling targets for OCS scaling.
            </p>
            <ListPage
              kind={NodeModel.kind}
              showTitle={false}
              ListComponent={AttachedDevicesNodeTable}
              customData={{ filteredNodes, nodes, setNodes }}
            />
          </FormGroup>
        ) : (
          <div className="ceph-ocs-install__no-nodes-text--large">Please select a storage class to list the nodes</div>
        )}
        {storageClass && filteredNodes?.length < minSelectedNode && (
          <Alert className="co-alert" variant="danger" title="Minimum Node Requirement" isInline>
            The OCS Storage cluster require a minimum of 3 nodes for the initial deployment. Please
            choose a different storage class or go to create a new volume set that matches the
            minimum node requirement.
            <div>
              <Button component="a" variant="link" onClick={goToCreateSC} className="ceph-ocs-install__create-new-sc-btn">
                Create new volume set instance
              </Button>
            </div>
          </Alert>
        )}
        <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
          <ActionGroup className="pf-c-form">
            <Button
              type="button"
              variant="primary"
              onClick={submit}
              isDisabled={(filteredNodes?.length ?? 0) < minSelectedNode}
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

type CreateOCSProps = {
  match: match<{ appName: string; ns: string }>;
  setIsNewSCToBeCreated?: React.Dispatch<boolean>;
  setIsNoProvSCPresent?: React.Dispatch<boolean>;
};
