import { browser, ExpectedConditions as until, $ } from 'protractor';
import * as crudView from '@console/internal-integration-tests/views/crud.view';
import * as sideNavView from '@console/internal-integration-tests/views/sidenav.view';
import { namespaceDropdown, openshiftStorageItem } from './installFlow.view';
import { click } from '@console/shared/src/test-utils/utils';
import { CAPACITYUNIT, CAPACITYVALUE, STORAGECLUSTERTABCNT } from '../utils/consts';

export const ocsOp = $('a[data-test-operator-row="Openshift Container Storage Operator"]');
export const storageClusterView = $(`ul.co-m-horizontal-nav__menu li:nth-child(${STORAGECLUSTERTABCNT}) a`);
export const kebabMenu = $('button[data-test-id="kebab-button"]');
export const actionForLabel = (label: string) => $(`button[data-test-action="${label}"]`);
export const confirmButton = $('#confirm-action');
export const storageClusterRow = (uid) => $(`tr[data-id='${uid}']`);

const capacityValueInput = $('input.add-capacity-modal__input--width');
const capacityUnitButton = $('button[data-test-id="dropdown-button"] .pf-c-dropdown__toggle-text');

export const clickKebabAction = async (uid: string, actionLabel: string, confirm?: boolean) => {
  await browser.wait(until.presenceOf(storageClusterRow(uid)));
  const kebabMenu = storageClusterRow(uid).$('button[data-test-id="kebab-button"]');
  await click(kebabMenu);
  await click(actionForLabel(actionLabel));
  
  if (confirm !== false) {
    await verifyFields();
    await click(confirmButton);
  }
};

const verifyFields = async () => {
  await browser.wait(until.presenceOf(capacityValueInput));
  await browser.wait(until.presenceOf(capacityUnitButton));
  expect(capacityUnitButton.getText()).toEqual(CAPACITYUNIT);
  expect(capacityValueInput.getAttribute('value')).toBe(CAPACITYVALUE);
};

export const goToInstalledOperators = async () => {
  await browser.wait(until.and(crudView.untilNoLoadersPresent));
  await sideNavView.clickNavLink(['Operators', 'Installed Operators']);
  await browser.wait(until.and(crudView.untilNoLoadersPresent));
  await browser.wait(until.visibilityOf(namespaceDropdown));
  await namespaceDropdown.click();
  await browser.wait(until.elementToBeClickable(openshiftStorageItem));
  await openshiftStorageItem.click();
  await browser.wait(until.and(crudView.untilNoLoadersPresent));
};