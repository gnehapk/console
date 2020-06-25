import * as React from 'react';
import { Wizard } from '@patternfly/react-core';
import { history } from '@console/internal/components/utils/router';
import '../attached-devices.scss';

enum CreateStepsSC {
  DISCOVER = 'DISCOVER',
  STORAGECLASS = 'STORAGECLASS',
  STORAGECLUSTER = 'STORAGECLUSTER',
}

const CreateSC = () => {
  const steps = [
    {
      id: CreateStepsSC.DISCOVER,
      name: 'Discover Disks',
      component: <div>Discover Disks</div>,
      enableNext: true,
    },
    {
      id: CreateStepsSC.STORAGECLASS,
      name: 'Create Storage Class',
      component: <div>Storage Class</div>,
      enableNext: true,
    },
    {
      id: CreateStepsSC.STORAGECLUSTER,
      name: 'Create Storage Cluster',
      component: <div>Create Storage Cluster</div>,
      enableNext: true,
    },
  ];

  return (
    <>
      <div className="ceph-create-sc-wizard">
        <Wizard isCompactNav isInPage isOpen steps={steps} onClose={() => history.goBack()} />
      </div>
    </>
  );
};

export default CreateSC;
