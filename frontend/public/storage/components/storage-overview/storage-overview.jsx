import React from 'react';
import {
  StorageOverview as KubevirtStorageOverview,
  ClusterOverviewContext,
  getResource,
  StorageTopConsumersStats,
} from 'kubevirt-web-ui-components';

import {
  CephClusterModel,
  NodeModel,
  PodModel,
  PersistentVolumeClaimModel,
  VirtualMachineModel,
  InfrastructureModel,
} from '../../../models';

import { WithResources } from '../../../kubevirt/components/utils/withResources';
import { LoadingInline } from '../../../kubevirt/components/utils/okdutils';
import { coFetchJSON } from '../../../co-fetch';

const REFRESH_TIMEOUT = 30000;

const resourceMap = {
  nodes: {
    resource: getResource(NodeModel, { namespaced: false }),
  },
  pods: {
    resource: getResource(PodModel),
  },
  pvcs: {
    resource: getResource(PersistentVolumeClaimModel),
  },
  vms: {
    resource: getResource(VirtualMachineModel),
  },
  infrastructure: {
    resource: getResource(InfrastructureModel, {
      namespaced: false,
      name: 'cluster',
      isList: false,
    }),
  },
  cephCluster: {
    resource: getResource(CephClusterModel),
  },
};

const getInventoryData = resources => {
  const inventory = {};
  if (resources.nodes) {
    inventory.nodes = {
      data: resources.nodes,
      title: 'Hosts',
      kind: NodeModel.kind,
    };
  }
  if (resources.pods) {
    inventory.pods = {
      data: resources.pods,
      title: 'Pods',
      kind: PodModel.kind,
    };
  }
  if (resources.pvcs) {
    inventory.pvcs = {
      data: resources.pvcs,
      title: 'PVCs',
      kind: PersistentVolumeClaimModel.kind,
    };
  }
  if (resources.vms) {
    inventory.vms = {
      data: resources.vms,
      title: 'VMs',
      kind: VirtualMachineModel.kind,
    };
  }

  return {
    inventory,
    loaded: !!inventory,
    heading: 'OCS Inventory',
  };
};

export class StorageOverview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.setConsumersData = this._setConsumersData.bind(this);
  }

  _setConsumersData(key, response) {
    this.setState(state => ({
      consumersData: {
        ...state.consumersData,
        [key]: response,
      },
    }));
  }

  fetchPrometheusQuery(query, callback) {
    const promURL = window.SERVER_FLAGS.prometheusBaseURL;
    const url = `${promURL}/api/v1/query?query=${encodeURIComponent(query)}`;
    coFetchJSON(url).then(result => {
      if (this._isMounted) {
        callback(result);
      }
    }).then(() => {
      if (this._isMounted) {
        setTimeout(() => this.fetchPrometheusQuery(query, callback), REFRESH_TIMEOUT);
      }
    });
  }

  componentDidMount() {
    this._isMounted = true;

    //this.fetchPrometheusQuery(CONSUMERS_CPU_QUERY, response => this.setConsumersData('workloadCpuResults', response));
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const inventoryResourceMapToProps = resources => {
      return {
        value: {
          detailsData: {
            LoadingComponent: LoadingInline,
            storageCluster: resources.cephCluster,
            ...this.state.detailsData,
          },
          inventoryData: getInventoryData(resources), // k8s object loaded via WithResources
          StorageTopConsumersStats, // TODO: mock, replace by real data and remove from web-ui-components

          consumersData: {
            ...this.state.consumersData,
            LoadingComponent: LoadingInline,
          },

        },
      };
    };

    return (
      <WithResources
        resourceMap={resourceMap}
        resourceToProps={inventoryResourceMapToProps}
      >
        <ClusterOverviewContext.Provider>
          <KubevirtStorageOverview />
        </ClusterOverviewContext.Provider>
      </WithResources>
    );
  }
}
