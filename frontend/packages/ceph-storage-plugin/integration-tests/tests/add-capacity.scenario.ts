import { execSync } from 'child_process';
import { browser, ExpectedConditions as until , $} from 'protractor';
import { appHost, testName } from '@console/internal-integration-tests/protractor.conf';
import * as _ from 'lodash';
import { ClusterServiceVersionModel } from '@console/operator-lifecycle-manager/src/models';
import { referenceForModel } from '@console/internal/module/k8s';
import * as models from './models';

import {
  ocsOp,
  storageClusterView,
  addCapacityLbl,
  addCapacityBtn,
} from '../views/add-capacity.view';

const OCS_SERVICE_NAME = 'OpenShift Container Storage';
const STATUS_HEALTHY = 'healthy';
const namespace = 'openshift-storage';
const kind = 'storagecluster';
const name = 'ocs-storagecluster';
let clusterJSON, previousCnt;

describe('Check add capacity functionality for ocs service', () => {
  const testCSV = {
    apiVersion: 'ocs.openshift.io/v1',
    kind: 'StorageCluster',
    metadata: {
      name: 'ocs-teststoragecluster',
      namespace: 'openshift-storage',
    },
    spec: {
      manageNodes: false,
      storageDeviceSets: [
        {
          name: 'ocs-deviceset',
          count: 1,
          replica: 3,
          resources: {},
          placement: {},
          portable: true,
          dataPVCTemplate: {
            spec: {
              storageClassName: '',
              accessModes: ['ReadWriteOnce'],
              volumeMode: 'Block',
              resources: {
                requests: {
                  storage: '2Ti',
                },
              },
            },
          },
        },
      ],
    },
  };

  beforeAll(async () => {
    execSync(`echo '${JSON.stringify(testCSV)}' | kubectl create -f -`);
    
    clusterJSON = JSON.parse(
      execSync(`kubectl get -o json -n ${namespace} ${kind} ${name}`).toString(),
    );
    previousCnt = _.get(clusterJSON, 'spec.storageDeviceSets[0].count', undefined);
    const uid = _.get(clusterJSON, 'metadata.uid', undefined);
    console.log(uid, '====uid');
    
    await browser.get(
      `${appHost}/k8s/ns/openshift-storage/operators.coreos.com~v1alpha1~ClusterServiceVersion`,
    );
    await browser.wait(until.presenceOf(ocsOp));
    await ocsOp.click();
    await browser.wait(until.presenceOf(storageClusterView));
    await storageClusterView.click();
    const storagecluster = $(`tr[data-id=${uid}`);
    await browser.wait(until.presenceOf(storagecluster));
    const kebabMenu = storagecluster.$('button[data-test-id="kebab-button"]');
    await kebabMenu.click();
    await browser.wait(until.presenceOf(addCapacityLbl));
    await addCapacityLbl.click();
    await browser.wait(until.presenceOf(addCapacityBtn));
    browser.sleep(3000);
  });

  it('Should update the count by 1, if adding 2 TiB capacity', async () => {
    // by default 2Tib capacity is being added
    await addCapacityBtn.click();
    const updatedClusterJSON = JSON.parse(
      execSync(
      `kubectl get -o json -n ${namespace} ${kind} ${name}`,
      ).toString()
    );
    const updatedCnt = _.get(updatedClusterJSON, 'spec.storageDeviceSets[0].count', undefined);
    
    console.log(previousCnt);
    console.log('=========');
    console.log(updatedClusterJSON, updatedCnt);
    expect(updatedCnt-previousCnt).toEqual(1);
  });

  it('Should update the count by 1, if adding 2 TiB capacity', async () => {
    // by default 2Tib capacity is being added
    await addCapacityBtn.click();
    const updatedClusterJSON = JSON.parse(
      execSync(
      `kubectl get -o json -n ${namespace} ${kind} ${name}`,
      ).toString()
    );
    const updatedCnt = _.get(updatedClusterJSON, 'spec.storageDeviceSets[0].count', undefined);
    
    console.log(previousCnt);
    console.log('=========');
    console.log(updatedClusterJSON, updatedCnt);
    expect(updatedCnt-previousCnt).toEqual(1);
  });

  afterAll(async () => {
    execSync(`echo '${JSON.stringify(testCSV)}' | kubectl delete -f -`);
  });
});
