import { execSync } from 'child_process';
import * as _ from 'lodash';
import { browser, ExpectedConditions as until } from 'protractor';
import { appHost } from '@console/internal-integration-tests/protractor.conf';
import { click } from '@console/shared/src/test-utils/utils';
import { isNodeReady } from '@console/shared/src/selectors/node';
import {
  addCapacityLbl,
  addCapacityBtn,
  ocsOp,
  storageClusterView,
  storageClusterRow,
} from '../views/add-capacity.view';


const toolBox = {
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "rook-ceph-tools-1",
    "namespace": "openshift-storage",
    "labels": {
      "app": "rook-ceph-tools"
    }
  },
  "spec": {
    "replicas": 1,
    "selector": {
      "matchLabels": {
        "app": "rook-ceph-tools"
      }
    },
    "template": {
      "metadata": {
        "labels": {
          "app": "rook-ceph-tools"
        }
      },
      "spec": {
        "dnsPolicy": "ClusterFirstWithHostNet",
        "containers": [
          {
            "name": "rook-ceph-tools",
            "image": "rook/ceph:master",
            "command": [
              "/tini"
            ],
            "args": [
              "-g",
              "--",
              "/usr/local/bin/toolbox.sh"
            ],
            "imagePullPolicy": "IfNotPresent",
            "env": [
              {
                "name": "ROOK_ADMIN_SECRET",
                "valueFrom": {
                  "secretKeyRef": {
                    "name": "rook-ceph-mon",
                    "key": "admin-secret"
                  }
                }
              }
            ],
            "securityContext": {
              "privileged": true
            },
            "volumeMounts": [
              {
                "mountPath": "/dev",
                "name": "dev"
              },
              {
                "mountPath": "/sys/bus",
                "name": "sysbus"
              },
              {
                "mountPath": "/lib/modules",
                "name": "libmodules"
              },
              {
                "name": "mon-endpoint-volume",
                "mountPath": "/etc/rook"
              }
            ]
          }
        ],
        "hostNetwork": true,
        "volumes": [
          {
            "name": "dev",
            "hostPath": {
              "path": "/dev"
            }
          },
          {
            "name": "sysbus",
            "hostPath": {
              "path": "/sys/bus"
            }
          },
          {
            "name": "libmodules",
            "hostPath": {
              "path": "/lib/modules"
            }
          },
          {
            "name": "mon-endpoint-volume",
            "configMap": {
              "name": "rook-ceph-mon-endpoints",
              "items": [
                {
                  "key": "data",
                  "path": "mon-endpoints"
                }
              ]
            }
          }
        ]
      }
    }
  }
}

const namespace = 'openshift-storage';
const kind = 'storagecluster';
const storageCluster = JSON.parse(
  execSync(`kubectl get -o json -n ${namespace} ${kind}`).toString(),
);

let clusterJSON;
let previousCnt;
let previousPods;
let updatedClusterJSON;
let updatedCnt;
let updatedPods;
const cephValue = JSON.parse(
  execSync(`kubectl get cephCluster -n ${namespace} -o json`).toString(),
);

describe('Check availability of cluster', () => {
  if (cephValue.items[0]) {
    it('Should check if the cluster is healthy before expansion', () => {
      expect(cephValue.items[0].status.ceph.health).not.toBe('HEALTH_ERR');
    });
  } else {
    it('Should state that cluster doesnt exist', () => {
      expect(cephValue.items[0]).toBe(undefined);
    });
  }
});

if (cephValue.items[0]) {
  describe('Check add capacity functionality for ocs service', () => {
    beforeAll(async () => {
      // check whether the cluster is present or not, and check for its ready state
      // if not present exit and console that no cluster is present, will be send in next PR

      const { name } = storageCluster.items[0].metadata;
      clusterJSON = JSON.parse(
        execSync(`kubectl get -o json -n ${namespace} ${kind} ${name}`).toString(),
      );
      //execSync(`echo '${JSON.stringify(toolBox)}' | kubectl create -f -`);
      previousCnt = _.get(clusterJSON, 'spec.storageDeviceSets[0].count', undefined);
      const uid = _.get(clusterJSON, 'metadata.uid', undefined).toString();
      previousPods = JSON.parse(execSync(`kubectl get pods -n ${namespace} -o json`).toString());

      await browser.get(
        `${appHost}/k8s/ns/openshift-storage/operators.coreos.com~v1alpha1~ClusterServiceVersion`,
      );

      await click(ocsOp);
      await click(storageClusterView);

      await browser.wait(until.presenceOf(storageClusterRow(uid)));
      const kebabMenu = storageClusterRow(uid).$('button[data-test-id="kebab-button"]');

      await click(kebabMenu);
      await click(addCapacityLbl);
      // await click(addCapacityBtn);

      updatedClusterJSON = JSON.parse(
        execSync(`kubectl get -o json -n ${namespace} ${kind} ${name}`).toString(),
      );

      updatedCnt = _.get(updatedClusterJSON, 'spec.storageDeviceSets[0].count', undefined);
      const statusCol = storageClusterRow(uid).$('td:nth-child(4)');

      // need to wait as cluster states fluctuates for some time. Waiting for 2 secs for the same
      browser.sleep(2000);

      await browser.wait(until.textToBePresentInElement(statusCol, 'Progressing'));
      await browser.wait(
        until.textToBePresentInElement(statusCol.$('span.co-icon-and-text span'), 'Ready'),
      );

      updatedPods = JSON.parse(execSync(`kubectl get pod -o json -n ${namespace}`).toString());
    }, 150000);

    it('Newly added capacity should takes into effect at the storage level', () => {
      // by default 2Tib capacity is being added
      expect(updatedCnt - previousCnt).toEqual(1);
    });

    it('New osd pods corresponding to the additional capacity should be in running state', () => {
      const isPodPresent = (podName) =>
        previousPods.items.find((pod) => pod.metadata.name === podName) !== undefined;

      const newPods = [];
      updatedPods.items.forEach((pod) => {
        if (!isPodPresent(pod.metadata.name) && pod.metadata.name.startsWith('rook-ceph-osd')) {
          newPods.push(pod.metadata.name);
        }
      });

      /* since rook-ceph-osd-prepare-ocs-deviceset- keeps changing their last 4 characters,
      hence subtracting the count of previous  rook-ceph-osd-prepare-ocs-deviceset- pods */
      expect(newPods.length - previousCnt * 3).toEqual(6);
    });

    it('Ceph cluster should be healthy after expansion', () => {
      const cephValueAfter = JSON.parse(
        execSync(`kubectl get cephCluster -n ${namespace} -o json`).toString(),
      );
      expect(cephValueAfter.items[0].status.ceph.health).not.toBe('HEALTH_ERR');
    });

    it('No ocs pods should get restarted unexpectedly', () => {
      const isAllPodRunning = previousPods.items.every(
        (pod) => pod.status.phase === 'Running' || pod.status.phase === 'Succeeded',
      );
      expect(isAllPodRunning).toEqual(true);
    });

    it('No OCP/OCS nodes should go to NotReady state', () => {
      const nodes = JSON.parse(execSync(`kubectl get nodes -o json`).toString());
      const isAllNodes = nodes.items.every((node) => isNodeReady(node));

      expect(isAllNodes).toEqual(true);
    });
  });
}