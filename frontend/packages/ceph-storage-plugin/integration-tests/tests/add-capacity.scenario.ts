import { execSync } from 'child_process';
import * as _ from 'lodash';
import { browser, ExpectedConditions as until, $ } from 'protractor';
import { click } from '@console/shared/src/test-utils/utils';
import { isNodeReady } from '@console/shared/src/selectors/node';
import {
  clickKebabAction,
  goToInstalledOperators,
  ocsOp,
  storageClusterRow,
  storageClusterView,
} from '../views/add-capacity.view';
import { EXPANDWAIT, KIND, NS, POD_NAME_PATTERNS, SECOND } from '../utils/consts';
import {
  getPodPhase,
  getPodRestartCount,
  isPodPresent,
  testPodIsRunning,
  testPodIsSucceeded,
} from '../utils/helpers';

const storageCluster = JSON.parse(execSync(`kubectl get -o json -n ${NS} ${KIND}`).toString());

let clusterJSON;
let previousCnt;
let previousPods;
let updatedClusterJSON;
let updatedCnt;
let updatedPods;

describe('Check add capacity functionality for ocs service', () => {
  beforeAll(async () => {
    const { name } = storageCluster.items[0].metadata;
    clusterJSON = JSON.parse(execSync(`kubectl get -o json -n ${NS} ${KIND} ${name}`).toString());
    previousCnt = _.get(clusterJSON, 'spec.storageDeviceSets[0].count', undefined);
    const uid = _.get(clusterJSON, 'metadata.uid', undefined).toString();
    previousPods = JSON.parse(execSync(`kubectl get pods -n ${NS} -o json`).toString());

    await goToInstalledOperators();
    await click(ocsOp);
    await click(storageClusterView);

    await clickKebabAction(uid, 'Add Capacity');

    updatedClusterJSON = JSON.parse(
      execSync(`kubectl get -o json -n ${NS} ${KIND} ${name}`).toString(),
    );

    updatedCnt = _.get(updatedClusterJSON, 'spec.storageDeviceSets[0].count');
    console.log(updatedCnt, previousCnt, 'count');
    const statusCol = storageClusterRow(uid).$('td:nth-child(4)');

    // need to wait as cluster states fluctuates for some time. Waiting for 2 secs for the same
    await browser.sleep(2 * SECOND);

    await browser.wait(until.textToBePresentInElement(statusCol, 'Progressing'));
    await browser.wait(
      until.textToBePresentInElement(statusCol.$('span.co-icon-and-text span'), 'Ready'),
    );

    updatedPods = JSON.parse(execSync(`kubectl get pod -o json -n ${NS}`).toString());
  }, EXPANDWAIT);

  it('Newly added capacity should takes into effect at the storage level', () => {
    // by default 2Tib capacity is being added
    expect(updatedCnt - previousCnt).toEqual(1);
  });

  it('New osd pods corresponding to the additional capacity should be in running state', () => {
    const newOSDPods = [];
    const newOSDPreparePods = [];
    updatedPods.items.forEach((pod) => {
      if (!isPodPresent(previousPods, pod.metadata.name)) {
        if (pod.metadata.name.includes(POD_NAME_PATTERNS.ROOK_CEPH_OSD_PREPARE)) {
          console.log(pod.metadata.name);
          newOSDPreparePods.push(pod);
        } else if (pod.metadata.name.includes(POD_NAME_PATTERNS.ROOK_CEPH_OSD)) {
          console.log(pod.metadata.name);
          newOSDPods.push(pod);
        }
      }
    });

    /* since rook-ceph-osd-prepare-ocs-deviceset- keeps changing their last 4 characters,
    hence subtracting the count of previous  rook-ceph-osd-prepare-ocs-deviceset- pods */
    expect(newOSDPods.length).toEqual(3);
    expect(newOSDPreparePods.length - previousCnt * 3).toEqual(3);

    // TODO: Not working as cluster goes into Ready state even when all the new osd pods are not in Running state.
    newOSDPods.forEach((pod) => {
      testPodIsRunning(getPodPhase(pod));
    });

    newOSDPreparePods.forEach((pod) => {
      testPodIsSucceeded(getPodPhase(pod));
    });
  });

  it('No ocs pods should get restarted unexpectedly', () => {
    previousPods.items.forEach((pod) => {
      const prevCnt = getPodRestartCount(pod);
      console.log(prevCnt, 'prevCnt');
      const updatedpod = isPodPresent(updatedPods, pod.metadata.name);
      if (updatedpod) {
        const updatedCnt = getPodRestartCount(updatedpod);
        console.log(updatedCnt, 'updatedCnt');
        expect(prevCnt).toBe(updatedCnt);
      }
    });
  });
  
  it('No ocs nodes should go to NotReady state', () => {
    const nodes = JSON.parse(execSync(`kubectl get nodes -o json`).toString());
    const isAllNodes = nodes.items.every((node) => isNodeReady(node));

    expect(isAllNodes).toEqual(true);
  });
});
