import { execSync } from 'child_process';
import * as _ from 'lodash';
import { browser, ExpectedConditions as until } from 'protractor';
import { click } from '@console/shared/src/test-utils/utils';
import { getName } from '@console/shared/src/selectors/common';
import {
  confirmButton,
  clickKebabAction,
  goToInstalledOperators,
  ocsOp,
  storageClusterNav,
  scDropdown,
  getSCOption,
  verifyFields,
} from '../../views/add-capacity.view';
import { KIND, NS, SECOND, STORAGE_CLUSTER_NAME } from '../../utils/consts';
import { ExpansionObjectsType } from '../2-tests/add-capacity.scenario';

const storageCluster = JSON.parse(execSync(`kubectl get -o json -n ${NS} ${KIND}`).toString());
let defaultSC = '';

const expansionObjects: ExpansionObjectsType = {
  clusterJSON: {},
  previousCnt: 0,
  updatedCnt: 0,
  updatedClusterJSON: {},
};

describe('Check add capacity functionality for ocs service', () => {
  beforeAll(async () => {
    [expansionObjects.clusterJSON] = storageCluster.items;
    const uid = _.get(expansionObjects.clusterJSON, 'metadata.uid').toString();

    await goToInstalledOperators();
    await click(ocsOp);
    await browser.wait(until.presenceOf(storageClusterNav));
    await click(storageClusterNav);
    await clickKebabAction(uid, 'Add Capacity');
    await click(scDropdown);
  });

  describe('For Non Baremetal infra(Cloud and VMWare)', () => {
    beforeAll(async () => {
      [expansionObjects.clusterJSON] = storageCluster.items;
      const name = getName(expansionObjects.clusterJSON);
      expansionObjects.previousCnt = _.get(
        expansionObjects.clusterJSON,
        'spec.storageDeviceSets[0].count',
      );
      // eslint-disable-next-line no-useless-escape
      defaultSC = execSync(`kubectl get storageclasses | grep -Po '\\w+(?=.*default)'`)
        .toString()
        .trim();
      await click(getSCOption(defaultSC));
      await verifyFields();
      await click(confirmButton);

      await browser.sleep(5 * SECOND);

      expansionObjects.updatedClusterJSON = JSON.parse(
        execSync(`kubectl get -o json -n ${NS} ${KIND} ${name}`).toString(),
      );
      expansionObjects.updatedCnt = _.get(
        expansionObjects.updatedClusterJSON,
        'spec.storageDeviceSets[0].count',
      );
    });

    it('Newly added capacity should takes into effect at the storage level', () => {
      // by default 2Tib capacity is being added
      expect(expansionObjects.updatedCnt - expansionObjects.previousCnt).toEqual(1);
    });

    it('Selected storage class should be sent in the YAML', () => {
      const storageCR = JSON.parse(
        execSync(`kubectl get storageclusters ${STORAGE_CLUSTER_NAME} -n ${NS} -o json`).toString(),
      );
      const scFromYAML =
        storageCR?.spec?.storageDeviceSets?.[0]?.dataPVCTemplate?.spec?.storageClassName;
      expect(defaultSC).toEqual(scFromYAML);
    });
  });
});
