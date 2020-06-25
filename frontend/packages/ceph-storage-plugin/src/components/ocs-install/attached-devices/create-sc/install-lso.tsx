import * as React from 'react';
import * as _ from 'lodash';
import { match } from 'react-router';
import { Wizard } from '@patternfly/react-core';
import { history } from '@console/internal/components/utils/router';
import '../attached-devices.scss';

enum CreateStepsSC {
  DISCOVER = 'DISCOVER',
  STORAGECLASS = 'STORAGECLASS',
  STORAGECLUSTER = 'STORAGECLUSTER',
}

const CreateSC: React.FC<CreateSCProps> = ({ match }) => {
  // const [state, dispatch] = React.useReducer(reducer, initialState);
  // const { ns, appName } = match.params;

  const finalStep = () => {
    // dispatch({ type: 'setIsLoading', value: true });
  };

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
        <Wizard
          isCompactNav
          isInPage
          isOpen
          steps={steps}
          onSave={finalStep}
          onClose={() => history.goBack()}
        />
      </div>
    </>
  );
};

type CreateSCProps = {
  match: match<{ appName: string; ns: string }>;
};

export default CreateSC;
