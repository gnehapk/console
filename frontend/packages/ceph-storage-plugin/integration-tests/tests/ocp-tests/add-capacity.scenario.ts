import { execSync } from 'child_process';
import * as _ from 'lodash';
import { browser, ExpectedConditions as until } from 'protractor';
import { click } from '@console/shared/src/test-utils/utils';
import { isNodeReady } from '@console/shared/src/selectors/node';
import { PodKind } from '@console/internal/module/k8s';
import { getName } from '@console/shared/src/selectors/common';
import {
  confirmButton,
  clickKebabAction,
  goToInstalledOperators,
  ocsOp,
  storageClusterRow,
  verifyFields,
  getStorageClusterLink,
} from '../../views/add-capacity.view';
import {
  CLUSTER_STATUS,
  EXPAND_WAIT,
  KIND,
  NS,
  OSD,
  SECOND,
  MINUTE,
} from '../../utils/consts';
import {
  createOSDTreeMap,
  getIds,
  getNewOSDIds,
  NodeType,
  FormattedOsdTreeType,
} from '../../utils/helpers';

const storageCluster = JSON.parse(execSync(`kubectl get -o json -n ${NS} ${KIND}`).toString());
const cephValue = JSON.parse(execSync(`kubectl get cephCluster -n ${NS} -o json`).toString());
const clusterStatus = storageCluster.items[0];
const cephHealth = cephValue.items[0];

const expansionObjects: ExpansionObjectsType = {
  clusterJSON: {},
  previousCnt: 0,
  updatedCnt: 0,
  updatedClusterJSON: {},
  previousPods: { items: [] },
  updatedPods: { items: [] },
  previousOSDTree: { nodes: [] },
  updatedOSDTree: { nodes: [] },
  formattedOSDTree: {},
  previousOSDIds: [],
  newOSDIds: [],
};

// describe('Check availability of ocs cluster', () => {
//   if (clusterStatus) {
//     it('Should check if the ocs cluster is Ready for expansion', () => {
//       expect(_.get(clusterStatus, 'status.phase')).toBe(CLUSTER_STATUS.READY);
//     });
//   } else {
//     it('Should state that ocs cluster is not ready for expansion', () => {
//       expect(clusterStatus).toBeUndefined();
//     });
//   }
// });

// describe('Check availability of Ceph cluster', () => {
//   if (cephHealth) {
//     it('Check if the Ceph cluster is healthy before expansion', () => {
//       expect(cephHealth.status.ceph.health).not.toBe(CLUSTER_STATUS.HEALTH_ERROR);
//     });
//   } else {
//     it('Should state that Ceph cluster doesnt exist', () => {
//       expect(cephHealth).toBeUndefined();
//     });
//   }
// });

//if (clusterStatus && cephHealth) {
  describe('Check add capacity functionality for ocs service', () => {
    beforeAll(async () => {
      [expansionObjects.clusterJSON] = storageCluster.items;
      const name = getName(expansionObjects.clusterJSON);
      expansionObjects.previousCnt = _.get(
        expansionObjects.clusterJSON,
        'spec.storageDeviceSets[0].count',
      );
      const uid = _.get(expansionObjects.clusterJSON, 'metadata.uid').toString();
    
      await goToInstalledOperators();
      await click(ocsOp);
      const storageClusterLink = await getStorageClusterLink();
      await click(storageClusterLink);

      await clickKebabAction(uid, 'Add Capacity');
      await verifyFields();
      await click(confirmButton);

      const statusCol = storageClusterRow(uid).$('td:nth-child(3)');

      // need to wait as cluster states fluctuates for some time. Waiting for 2 secs for the same
      // await browser.sleep(2 * SECOND);

      // await browser.wait(until.textToBePresentInElement(statusCol, CLUSTER_STATUS.PROGRESSING));
      // await browser.wait(
      //   until.textToBePresentInElement(
      //     statusCol.$('span.co-icon-and-text span'),
      //     CLUSTER_STATUS.READY,
      //   ),
      // );

      expansionObjects.updatedClusterJSON = JSON.parse(
        execSync(`kubectl get -o json -n ${NS} ${KIND} ${name}`).toString(),
      );
      expansionObjects.updatedCnt = _.get(
        expansionObjects.updatedClusterJSON,
        'spec.storageDeviceSets[0].count',
      );

    }, 2 * MINUTE);

    it('Newly added capacity should takes into effect at the storage level', () => {
      // by default 2Tib capacity is being added
      expect(expansionObjects.updatedCnt - expansionObjects.previousCnt).toEqual(1);
    });


  });
//}

type PodType = {
  items: PodKind[];
};

type ExpansionObjectsType = {
  clusterJSON: {};
  previousCnt: number;
  updatedCnt: number;
  updatedClusterJSON: {};
  previousPods: PodType;
  updatedPods: PodType;
  previousOSDTree: { nodes: NodeType[] };
  updatedOSDTree: { nodes: NodeType[] };
  formattedOSDTree: FormattedOsdTreeType;
  previousOSDIds: number[];
  newOSDIds: number[];
};
