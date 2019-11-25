import { element, by, $ } from 'protractor';

export const ops = element(by.linkText("Operators"));
export const installedOps = element(by.linkText("Installed Operators"));

export const ocsOp = element(by.css('a[data-test-operator-row="Openshift Container Storage Operator"]'));
//Create bs page elements
export const bsStoreName = element(by.css('[placeholder = "my-backingstore"]'));
export const providerDropdown = $('form > div:nth-child(3) > div > div > button');

export const bsStoreLink = $('div > article:nth-child(7) > div.pf-c-card__footer > a');

export const awsProvider = element(by.buttonText('AWS S3'));
export const azureBlob = element(by.buttonText('Azure Blob'));
export const gcs = element(by.buttonText('Google cloud storage'));
export const s3Compatible = element(by.buttonText('S3 Compatible'));
export const pvc = element(by.buttonText('PVC'));

//only for aws
export const regionDropdown = $('form > div:nth-child(4) > div > div > button');
export const useast = $('#us-east-1-link');

export const endpoint = $('form > div:nth-child(5) > input');

//For AWS
export const secretDropdown = $('form > div.pf-c-form__group.nb-bs-form-entry.nb-bs-form-entry--full-width > div > div > div > button');
//export const secretSelect = $('#my-secret');
export const switchToCreds = element(by.buttonText('Switch to Credentials'));
export const accessKey = element(by.css('[aria-label = "Access Key Field"]'));
export const secretKey = element(by.css('[aria-label = "Secret Key Field"]'));
export const targetBucket = element(by.css('[aria-label = "Target Bucket"]'))

//For azure
export const accountName = element(by.css('[aria-label = "Access Key Field"]'));
export const accountKey = element(by.css('[aria-label = "Secret Key Field"]'));

//For pvc
export const scDropdown = $("#sc-dropdown");
export const rbdClass = $('#example-storagecluster-ceph-rbd-link');

//Common
export const createBtn = element(by.buttonText("Create BackingStore"));