import * as React from 'react';
import { match as RouterMatch } from 'react-router';
import { ActionGroup, Button, Form } from '@patternfly/react-core';
import {
  resourcePathFromModel,
  BreadCrumbs,
  resourceObjPath,
  withHandlePromise,
  HandlePromiseProps,
  ButtonBar,
} from '@console/internal/components/utils';
import { history } from '@console/internal/components/utils/router';
import {
  k8sCreate,
  k8sPatch,
  referenceFor,
  NodeKind,
  K8sResourceKind,
} from '@console/internal/module/k8s';
import { useK8sWatchResource } from '@console/internal/components/utils/k8s-watch-hook';
import { getName } from '@console/shared';
import { ClusterServiceVersionModel } from '@console/operator-lifecycle-manager';
import { nodeResource } from '../../constants/resources';
import { hasTaints } from '../../utils';
import { AutoDetectVolumeInner, AutoDetectVolumeHeader } from './auto-detect-volume-inner';
import { getDiscoveryRequestData } from './discovery-request-data';
import { LocalVolumeDiscovery as AutoDetectVolumeModel } from '../../models';
import { initialState, reducer, State, Action } from './state';
import { DISCOVERY_CR_NAME, LOCAL_STORAGE_NAMESPACE } from '../../constants';
import { fetchK8s } from '@console/internal/graphql/client';

const AutoDetectVolume: React.FC = withHandlePromise<AutoDetectVolumeProps & HandlePromiseProps>(
  (props) => {
    const { match, handlePromise, inProgress, errorMessage } = props;
    const { appName, ns } = match.params;
    const [state, dispatch] = React.useReducer(reducer, initialState);

    const [nodeData, nodeLoaded, nodeLoadError] = useK8sWatchResource<NodeKind[]>(nodeResource);

    React.useEffect(() => {
      if ((nodeLoadError || nodeData.length === 0) && nodeLoaded) {
        dispatch({ type: 'setAllNodeNamesOnADV', value: [] });
      } else if (nodeLoaded) {
        const names = nodeData.filter((node) => !hasTaints(node)).map((node) => getName(node));
        dispatch({ type: 'setAllNodeNamesOnADV', value: names });
      }
    }, [nodeData, nodeLoaded, nodeLoadError]);

    const onSubmit = (event: React.FormEvent<EventTarget>) => {
      event.preventDefault();

      handlePromise(
        fetchK8s(AutoDetectVolumeModel, DISCOVERY_CR_NAME, LOCAL_STORAGE_NAMESPACE)
          .then((discoveryRes: K8sResourceKind) => {
            const patch = [
              {
                op: 'replace',
                path: `/spec/nodeSelector/nodeSelectorTerms/0/matchExpressions/0/values`,
                value: state.nodeNamesForLVS,
              },
            ];
            return k8sPatch(AutoDetectVolumeModel, discoveryRes, patch);
          })
          .catch(() => {
            const requestData = getDiscoveryRequestData(state);
            return k8sCreate(AutoDetectVolumeModel, requestData);
          })
          .then((resource) => history.push(resourceObjPath(resource, referenceFor(resource))))
          .catch(() => null),
      );
    };

    return (
      <>
        <div className="co-create-operand__header">
          <div className="co-create-operand__header-buttons">
            <BreadCrumbs
              breadcrumbs={[
                {
                  name: 'Local Storage',
                  path: resourcePathFromModel(ClusterServiceVersionModel, appName, ns),
                },
                { name: `Auto Detect Volume`, path: '' },
              ]}
            />
          </div>
          <AutoDetectVolumeHeader />
        </div>
        <Form noValidate={false} className="co-m-pane__body co-m-pane__form" onSubmit={onSubmit}>
          <AutoDetectVolumeInner state={state} dispatch={dispatch} />
          <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
            <ActionGroup>
              <Button
                type="submit"
                variant="primary"
                isDisabled={state.showNodesListOnADV && state.nodeNamesForLVS?.length < 1}
              >
                Create
              </Button>
              <Button type="button" variant="secondary" onClick={history.goBack}>
                Cancel
              </Button>
            </ActionGroup>
          </ButtonBar>
        </Form>
      </>
    );
  },
);

type AutoDetectVolumeProps = {
  match: RouterMatch<{ appName: string; ns: string }>;
} & HandlePromiseProps;

export default AutoDetectVolume;
