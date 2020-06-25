import * as React from 'react';
import { match as RouterMatch } from 'react-router';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { Alert, Button } from '@patternfly/react-core';
import { k8sList, StorageClassResourceKind } from '@console/internal/module/k8s';
import { history } from '@console/internal/components/utils';
import { StorageClassModel } from '@console/internal/models';
import { useFlag } from '@console/shared/src/hooks/flag';
import { NO_PROVISIONER } from '../../../constants';
import { LSO_FLAG } from '../../../features';
import { CreateOCS } from './install-lso-sc';
import CreateSC from './create-sc/install-lso';

import './attached-devices.scss';

export const CreateOCSOnAttachedDevices: React.FC<CreateOCSOnAttachedDevicesProps> = ({
  match,
}) => {
  const {
    params: { ns, appName },
  } = match;
  const [isNoProvSCPresent, SetIsNoProvSCPresent] = React.useState<boolean>(false);
  const LSOEnabled = useFlag(LSO_FLAG);

  const takeLSOInstallationPage = () => {
    history.push(
      '/operatorhub/all-namespaces?category=Storage&details-item=local-storage-operator-redhat-operators-openshift-marketplace',
    );
  };

  React.useEffect(() => {
    k8sList(StorageClassModel)
      .then((storageClasses: StorageClassResourceKind[]) => {
        const filteredSCData = storageClasses.filter(
          (sc: StorageClassResourceKind) => sc?.provisioner === NO_PROVISIONER,
        );
        if (filteredSCData.length) {
          SetIsNoProvSCPresent(true);
        }
      })
      .catch(() => SetIsNoProvSCPresent(false));
  }, [appName, ns]);

  return (
    <div className="co-m-pane__body">
      {!LSOEnabled && (
        <Alert
          className="co-alert"
          variant="info"
          title="Local Storage Operator Not Installed"
          isInline
        >
          <div>
            Before we can create a storage cluster, the local storage operator needs to be
            installed. When installation is finished come back to OpenShift Container Storage to
            create a storage cluster.
            <div className="ceph-ocs-install__lso-alert">
              <Button type="button" variant="primary" onClick={takeLSOInstallationPage}>
                Install
              </Button>
            </div>
          </div>
        </Alert>
      )}
      {isNoProvSCPresent && LSOEnabled && <CreateOCS match={match} />}
      {LSOEnabled && !isNoProvSCPresent && <CreateSC />}
    </div>
  );
};

type CreateOCSOnAttachedDevicesProps = {
  match: RouterMatch<{ appName: string; ns: string }>;
};
