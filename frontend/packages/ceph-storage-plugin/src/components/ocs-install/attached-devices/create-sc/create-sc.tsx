import * as React from 'react';
import * as _ from 'lodash';
import { match, Route } from 'react-router';
import { Wizard, WizardFooter, WizardContextConsumer, Button, Alert } from '@patternfly/react-core';
import { history } from '@console/internal/components/utils/router';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import {
  k8sCreate,
  k8sPatch,
  referenceFor,
  NodeKind,
  K8sResourceKind,
  k8sGet,
} from '@console/internal/module/k8s';
import { fetchK8s } from '@console/internal/graphql/client';
import { getName } from '@console/shared';
import {
  LocalVolumeDiscovery,
  LocalVolumeDiscoveryResult,
  LocalVolumeSetModel,
} from '@console/local-storage-operator-plugin/src/models';
import { getDiscoveryRequestData } from '@console/local-storage-operator-plugin/src/components/auto-detect-volume/discovery-request-data';
import { getLocalVolumeSetRequestData } from '@console/local-storage-operator-plugin/src/components/local-volume-set/local-volume-set-request-data';
import {
  LOCAL_STORAGE_NAMESPACE,
  DISCOVERY_CR_NAME,
} from '@console/local-storage-operator-plugin/src/constants';
import { initialState, reducer, State, Action, discoveries } from './state';
import { AutoDetectVolume } from './wizard-pages/auto-detect-volume';
import { CreateLocalVolumeSet } from './wizard-pages/create-local-volume-set';
import { nodeResource } from '../../../../constants/resources';
import { hasTaints, getTotalDeviceCapacity } from '../../../../utils/install';
import { CreateOCS } from '../install-lso-sc';
import '../attached-devices.scss';

enum CreateStepsSC {
  DISCOVER = 'DISCOVER',
  STORAGECLASS = 'STORAGECLASS',
  STORAGECLUSTER = 'STORAGECLUSTER',
}

const CreateSC: React.FC<CreateSCProps> = ({ match }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  const [nodeData, nodeLoaded, nodeLoadError] = useK8sWatchResource<NodeKind[]>(nodeResource);

  // displaying node names for discovery step
  React.useEffect(() => {
    if ((nodeLoadError || nodeData.length === 0) && nodeLoaded) {
      dispatch({ type: 'setAllNodeNamesOnADV', value: [] });
    } else if (nodeLoaded) {
      const names = nodeData.filter((node) => !hasTaints(node)).map((node) => getName(node));
      dispatch({ type: 'setAllNodeNamesOnADV', value: names });
    }
  }, [nodeData, nodeLoaded, nodeLoadError]);

  const steps = [
    {
      id: CreateStepsSC.DISCOVER,
      name: 'Discover Disks',
      component: <AutoDetectVolume state={state} dispatch={dispatch} />,
    },
    {
      id: CreateStepsSC.STORAGECLASS,
      name: 'Create Storage Class',
      component: <CreateLocalVolumeSet dispatch={dispatch} state={state} />,
    },
    {
      id: CreateStepsSC.STORAGECLUSTER,
      name: 'Create Storage Cluster',
      component: <CreateOCS match={match} />,
    },
  ];

  const getDisabledCondition = (activeStep) => {
    if (activeStep.id === CreateStepsSC.DISCOVER && state.showNodesListOnADV)
      return state.nodeNamesForLVS.length < 1;
    else if (activeStep.id === CreateStepsSC.STORAGECLASS) {
      if(!state.volumeSetName.trim().length) return true;
      if (state.showNodesListOnLVS) return state.nodeNames.length < 1;
      return !state.volumeSetName.trim().length;
    }
    return false;
  };

  const CustomFooter = (
    <div>
      {state.isLoading && state.error && (
        <Alert
          className="co-alert ceph-ocs-install__wizard--alert"
          variant="danger"
          title="An error occured"
          isInline
        >
          {state.error}
        </Alert>
      )}
      <WizardFooter>
        <WizardContextConsumer>
          {({ activeStep, goToStepByName, goToStepById, onNext, onBack, onClose }) => {
            if (activeStep.id !== CreateStepsSC.STORAGECLUSTER) {
              return (
                <>
                  <Button
                    variant="primary"
                    type="submit"
                    onClick={() => makeCall(activeStep, onNext, state, dispatch)}
                    className={
                      state.isLoading || getDisabledCondition(activeStep) ? 'pf-m-disabled' : ''
                    }
                  >
                    Next
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onBack}
                    className={activeStep.id === CreateStepsSC.STORAGECLASS ? '' : 'pf-m-disabled'}
                  >
                    Back
                  </Button>
                  <Button variant="link" onClick={onClose}>
                    Cancel
                  </Button>
                </>
              );
            }
          }}
        </WizardContextConsumer>
      </WizardFooter>
    </div>
  );

  return (
    <>
      <div className="ceph-create-sc-wizard">
        <Wizard steps={steps} onClose={() => history.goBack()} footer={CustomFooter} />
      </div>
    </>
  );
};

const makeCall = (activeStep, onNext, state: State, dispatch: React.Dispatch<Action>) => {
  if (activeStep.id === CreateStepsSC.DISCOVER) {
    makeAutoDiscoveryCall(onNext, state, dispatch);
  } else if (activeStep.id === CreateStepsSC.STORAGECLASS) {
    makeLocalVolumeSetCall(onNext, state, dispatch);
  }
};

const makeAutoDiscoveryCall = (onNext, state: State, dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'setIsLoading', value: true });
  fetchK8s(LocalVolumeDiscovery, DISCOVERY_CR_NAME, LOCAL_STORAGE_NAMESPACE)
    .then((discoveryRes: K8sResourceKind) => {
      let nodes = new Set(discoveryRes?.spec?.nodeSelector?.nodeSelectorTerms?.[0]?.matchExpressions?.[0]?.values);
      state.nodeNamesForLVS.forEach(name => nodes.add(name));
      const patch = [
        {
          op: 'replace',
          path: `/spec/nodeSelector/nodeSelectorTerms/0/matchExpressions/0/values`,
          value: Array.from(nodes)
        },
      ];
      return k8sPatch(LocalVolumeDiscovery, discoveryRes, patch);
    })
    .catch(() => {
      const requestData = getDiscoveryRequestData(state);
      return k8sCreate(LocalVolumeDiscovery, requestData);
    })
    .then(() => {
      // TODO: Watch resources
      const names = state.nodeNamesForLVS;
      const promises: Promise<discoveries>[] = names.map((name) => {
        return fetchK8s(LocalVolumeDiscoveryResult, null, LOCAL_STORAGE_NAMESPACE, null,
          {labelSelector: `device-discovery-node=${name}`},
        );
      });
      return Promise.all(promises);
    })
    .then((discoveries) => {
      const nodesDiscoveries = {};
      discoveries.forEach((discovery) => {
        nodesDiscoveries[discovery?.items?.[0]?.spec?.nodeName] = discovery?.items?.[0]?.status?.discoveredDevices ?? [];
      });
      dispatch({type: 'setNodesDiscoveries', value: nodesDiscoveries});
      console.log(nodesDiscoveries);
      const capacity = getTotalDeviceCapacity(nodesDiscoveries);
      dispatch({type: 'setChartTotalData', value: capacity?.value});
      dispatch({type: 'setChartDataUnit', unit: capacity?.unit});
      console.log(capacity);
      console.log(state, 'before');
      onNext();
    })
    .catch((err) => {
      dispatch({ type: 'setError', value: err.message });
    })
    .finally(() => dispatch({ type: 'setIsLoading', value: false }));
};

const makeLocalVolumeSetCall = (onNext, state: State, dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'setIsLoading', value: true });
  const requestData = getLocalVolumeSetRequestData(state);
  k8sCreate(LocalVolumeSetModel, requestData)
    .then(() => {
      onNext();
    })
    .catch((err) => dispatch({ type: 'setError', value: err.message }))
    .finally(() => dispatch({ type: 'setIsLoading', value: false }));
};

type CreateSCProps = {
  match: match<{ appName: string; ns: string }>;
};

export default CreateSC;
