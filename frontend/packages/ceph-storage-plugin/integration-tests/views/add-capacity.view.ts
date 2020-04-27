import { browser, ExpectedConditions as until, $ } from 'protractor';
import * as crudView from '@console/internal-integration-tests/views/crud.view';
import * as sideNavView from '@console/internal-integration-tests/views/sidenav.view';
import { click, getOperatorHubCardIndex } from '@console/shared/src/test-utils/utils';
import { CAPACITY_UNIT, CAPACITY_VALUE, OCS_OP } from '../utils/consts';
import { namespaceDropdown, openshiftStorageItem } from './installFlow.view';

export const ocsOp = $(`a[data-test-operator-row='${OCS_OP}']`);
export const getStorageClusterLink = async () => {
  const index = await getOperatorHubCardIndex('Storage Cluster');
  const link = $(`article:nth-child(${index + 1}) a`);
  return link;
};
export const actionForLabel = (label: string) => $(`button[data-test-action='${label}']`);
export const confirmButton = $('#confirm-action');
export const storageClusterRow = (uid) => $(`tr[data-id='${uid}']`);
export const storageClusterNav = $('a[data-test-id="horizontal-link-Storage Cluster"]');
export const scDropdown = $('button[id="ceph-sc-dropdown"]');
export const getSCOption = (scName: string) => $(`a[id='${scName}-link']`);

const capacityValueInput = $('input.ceph-add-capacity__input');
const totalRequestedcapacity = $('div.ceph-add-capacity__input--info-text strong');

export const verifyFields = async () => {
  await browser.wait(until.presenceOf(capacityValueInput));
  await browser.wait(until.presenceOf(totalRequestedcapacity));
  expect(capacityValueInput.getAttribute('value')).toBe(CAPACITY_VALUE);
  expect(totalRequestedcapacity.getText()).toEqual(`6 ${CAPACITY_UNIT}`);
};

export const clickKebabAction = async (uid: string, actionLabel: string) => {
  await browser.wait(until.presenceOf(storageClusterRow(uid)));
  const kebabMenu = storageClusterRow(uid).$('button[data-test-id="kebab-button"]');
  await click(kebabMenu);
  const lbl = actionForLabel(actionLabel);
  await click(lbl);
};

export const goToInstalledOperators = async () => {
  await browser.wait(until.and(crudView.untilNoLoadersPresent));
  await sideNavView.clickNavLink(['Operators', 'Installed Operators']);
  await browser.wait(until.and(crudView.untilNoLoadersPresent));
  await click(namespaceDropdown);
  await click(openshiftStorageItem);
  await browser.wait(until.and(crudView.untilNoLoadersPresent));
};
