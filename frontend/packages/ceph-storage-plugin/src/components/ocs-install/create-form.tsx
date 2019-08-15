import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { K8sResourceKind, K8sKind } from '@console/internal/module/k8s';
import { ListPage } from '@console/internal/components/factory';
import { NodeModel } from '@console/internal/models';
import { ClusterServiceVersionKind } from '@console/internal/components/operator-lifecycle-manager/index';
import { NodeList } from './node-list';

import './ocs-install.scss';

export const CreateOCSServiceForm: React.FC<CreateOCSServiceFormProps> = (props) => {
  const title = 'Create New OCS Service';

  return (
    <div className="ceph-ocs-install__form co-m-pane__body co-m-pane__form">
      <h1 className="co-m-pane__heading co-m-pane__heading--baseline">
        <div className="co-m-pane__name">{title}</div>
      </h1>
      <p className="co-m-pane__explanation">
        OCS runs as a cloud-native service for optimal integration with applications in need of
        storage, and handles the scenes such as provisioning and management.
      </p>
      <form className="co-m-pane__body-group">
        <div className="form-group co-create-route__name">
          <label className="co-required" htmlFor="select-node-help">
            Select Nodes
          </label>
          <div className="control-label help-block" id="select-node-help">
            A minimum of 3 nodes needs to be labeled with{' '}
            <code>cluster.ocs.openshift.io/openshift-storage=&quot;&quot;</code> in order to create
            the OCS Service.
          </div>
          <Alert
            className="co-alert ceph-ocs-info__alert"
            variant="info"
            title="An AWS bucket will be created to provide the OCS Service."
          />
          <p className="co-legend co-required ceph-ocs-desc__legend">
            Select at least 3 nodes you wish to use.
          </p>
          <ListPage
            kind={NodeModel.kind}
            showTitle={false}
            ListComponent={(nodeProps) => <NodeList {...nodeProps} ocsProps={props} />}
          />
        </div>
      </form>
    </div>
  );
};

type CreateOCSServiceFormProps = {
  operandModel: K8sKind;
  sample?: K8sResourceKind;
  namespace: string;
  clusterServiceVersion: ClusterServiceVersionKind;
};
