import React from 'react';
import { get } from 'lodash';

import {
  StorageOverview as KubevirtStorageOverview,
  StorageOverviewContext,
  getResource,
  STORAGE_PROMETHEUS_QUERIES,
} from 'kubevirt-web-ui-components';

import {
  CephClusterModel,
  NodeModel,
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
  PodModel,
} from '../../../models';

import { WithResources } from '../../../kubevirt/components/utils/withResources';
import { LoadingInline } from '../../../kubevirt/components/utils/okdutils';
import { EventStream } from '../../../components/events';
import { EventsInnerOverview } from '../../../kubevirt/components/cluster/events-inner-overview';
import { LazyRenderer } from '../../../kubevirt/components/utils/lazyRenderer';
import { fetchAlerts, fetchPrometheusQuery, getAlertManagerBaseURL, getPrometheusBaseURL } from '../../../kubevirt/components/dashboards';
import { LemonIcon } from '@patternfly/react-icons';

const { warn } = console;

const CEPH_PG_CLEAN_AND_ACTIVE_QUERY = 'ceph_pg_clean and ceph_pg_active';
const CEPH_PG_TOTAL_QUERY = 'ceph_pg_total';

const UTILIZATION_IOPS_QUERY = '(sum(rate(ceph_pool_wr[1m])) + sum(rate(ceph_pool_rd[1m])))[24h:10m]';
//This query only count the latency for all drives in the configuration. Might go with same for the demo
const UTILIZATION_LATENCY_QUERY = '(quantile(.95,(cluster:ceph_disk_latency:join_ceph_node_disk_irate1m)))[24h:10m]';
const UTILIZATION_THROUGHPUT_QUERY = '(sum(rate(ceph_pool_wr_bytes[1m]) + rate(ceph_pool_rd_bytes[1m])))[24h:10m]';
const UTILIZATION_RECOVERY_RATE_QUERY = 'sum(ceph_pool_recovering_bytes_per_sec)[24h:10m]';
const CONSUMERS_PROJECT_REQUESTED_CAPACITY_QUERY = '(sort(topk(5, sum(avg_over_time(kube_persistentvolumeclaim_resource_requests_storage_bytes[1h]) * on (namespace,persistentvolumeclaim) group_left(storageclass) kube_persistentvolumeclaim_info) by (namespace))))[10m:1m]';
const CONSUMERS_PROJECT_USED_CAPACITY_QUERY = '(sort(topk(5, sum(avg_over_time(kubelet_volume_stats_used_bytes[1h]) * on (namespace,persistentvolumeclaim) group_left(storageclass) kube_persistentvolumeclaim_info) by (namespace))))[10m:1m]';
const CONSUMERS_SLCLASSES_REQUESTED_CAPACITY_QUERY = '(sort(topk(5, sum(avg_over_time(kube_persistentvolumeclaim_resource_requests_storage_bytes[1h]) * on (namespace,persistentvolumeclaim) group_left(storageclass) kube_persistentvolumeclaim_info) by (storageclass))))[10m:1m]';
const CONSUMERS_SLCLASSES_USED_CAPACITY_QUERY = '(sort(topk(5, sum(avg_over_time(kubelet_volume_stats_used_bytes[1h]) * on (namespace,persistentvolumeclaim) group_left(storageclass) kube_persistentvolumeclaim_info) by (storageclass))))[10m:1m]';
const CONSUMERS_PODS_REQUESTED_CAPACITY_QUERY = '(sort(topk(5, sum(avg_over_time(kube_persistentvolumeclaim_resource_requests_storage_bytes[1h]) * on (namespace,persistentvolumeclaim) group_left(pod) kube_pod_spec_volumes_persistentvolumeclaims_info) by (pod))))[10m:1m]';
const CONSUMERS_PODS_USED_CAPACITY_QUERY = '(sort(topk(5, sum(avg_over_time(kubelet_volume_stats_used_bytes[1h]) * on (namespace,persistentvolumeclaim) group_left(pod) kube_pod_spec_volumes_persistentvolumeclaims_info) by (pod))))[10m:1m]';
const {
  CEPH_STATUS_QUERY,
  CEPH_OSD_UP_QUERY,
  CEPH_OSD_DOWN_QUERY,
  STORAGE_CEPH_CAPACITY_TOTAL_QUERY,
  STORAGE_CEPH_CAPACITY_USED_QUERY,
} = STORAGE_PROMETHEUS_QUERIES;

const PROM_RESULT_CONSTANTS = {
  ocsHealthResponse: 'ocsHealthResponse',
  cephOsdDown: 'cephOsdDown',
  cephOsdUp: 'cephOsdUp',
  iopsUtilizationForOneHr: 'iopsUtilizationForOneHr',
  iopsUtilizationForSixHr: 'iopsUtilizationForSixHr',
  iopsUtilizationForTwentyFourHr: 'iopsUtilizationForTwentyFourHr',
  latencyUtilizationForOneHr: 'latencyUtilizationForOneHr',
  latencyUtilizationForSixHr: 'latencyUtilizationForSixHr',
  latencyUtilizationForTwentyFourHr: 'latencyUtilizationForTwentyFourHr',
  throughputUtilizationForOneHr: 'throughputUtilizationForOneHr',
  throughputUtilizationForSixHr: 'throughputUtilizationForSixHr',
  throughputUtilizationForTwentyFourHr: 'throughputUtilizationForTwentyFourHr',
  recoveryRateUtilizationForOneHr: 'recoveryRateUtilizationForOneHr',
  recoveryRateUtilizationForSixHr: 'recoveryRateUtilizationForSixHr',
  recoveryRateUtilizationForTwentyFourHr: 'recoveryRateUtilizationForTwentyFourHr',
  capacityTotal: 'capacityTotal',
  capacityUsed: 'capacityUsed',
  cleanAndActivePgRaw: 'cleanAndActivePgRaw',
  totalPgRaw: 'totalPgRaw',
  projectsRequestedCapacity: 'projectsRequestedCapacity',
  projectsUsedCapacity: 'projectsUsedCapacity',
  slClassesRequestedCapacity: 'slClassesRequestedCapacity',
  slClassesUsedCapacity: 'slClassesUsedCapacity',
  podsRequestedCapacity: 'podsRequestedCapacity',
  podsUsedCapacity: 'podsUsedCapacity',
};

const resourceMap = {
  nodes: {
    resource: getResource(NodeModel, { namespaced: false }),
  },
  pvs: {
    resource: getResource(PersistentVolumeModel),
  },
  pvcs: {
    resource: getResource(PersistentVolumeClaimModel),
  },
  cephCluster: {
    resource: getResource(CephClusterModel),
  },
};

const pvcFilter = ({ kind }) => PersistentVolumeClaimModel.kind === kind;
const podFilter = ({ kind, namespace }) => PodModel.kind === kind && namespace === 'openshift-storage';

const EventStreamComponent = () => <EventStream scrollableElementId="events-body" InnerComponent={EventsInnerOverview} overview={true} namespace={undefined} filter={[pvcFilter, podFilter]} />;

export class StorageOverview extends React.Component {
  constructor(props) {
    super(props);


    let initializePrometheus;

    if (!getPrometheusBaseURL()) {
      warn('Prometheus BASE URL is missing!');
      initializePrometheus = {}; // data loaded
    }

    if (!getAlertManagerBaseURL()) {
      warn('Alert Manager BASE URL is missing!');
    }
    this.state = {
      ...Object.keys(PROM_RESULT_CONSTANTS).reduce((initAcc, key) => {
        initAcc[PROM_RESULT_CONSTANTS[key]] = initializePrometheus;
        return initAcc;
      }, {}),
    };

    this.onFetch = this._onFetch.bind(this);
  }

  _onFetch(key, response) {
    if (this._isMounted) {
      this.setState({
        [key]: response,
      });
      return true;
    }
    return false;
  }

  setUtilizationData(type, dataForOneHr, dataForSixHr, dataForTwentyFourHr) {
    switch (type) {
      case 'iops':
        this._onFetch(PROM_RESULT_CONSTANTS.iopsUtilizationForOneHr, dataForOneHr);
        this._onFetch(PROM_RESULT_CONSTANTS.iopsUtilizationForSixHr, dataForSixHr);
        this._onFetch(PROM_RESULT_CONSTANTS.iopsUtilizationForTwentyFourHr, dataForTwentyFourHr);

      case 'latency':
        this._onFetch(PROM_RESULT_CONSTANTS.latencyUtilizationForOneHr, dataForOneHr);
        this._onFetch(PROM_RESULT_CONSTANTS.latencyUtilizationForSixHr, dataForSixHr);
        this._onFetch(PROM_RESULT_CONSTANTS.latencyUtilizationForTwentyFourHr, dataForTwentyFourHr);

      case 'throughput':
        this._onFetch(PROM_RESULT_CONSTANTS.throughputUtilizationForOneHr, dataForOneHr);
        this._onFetch(PROM_RESULT_CONSTANTS.throughputUtilizationForSixHr, dataForSixHr);
        this._onFetch(PROM_RESULT_CONSTANTS.throughputUtilizationForTwentyFourHr, dataForTwentyFourHr);

      case 'recoveryRate':
        this._onFetch(PROM_RESULT_CONSTANTS.recoveryRateUtilizationForOneHr, dataForOneHr);
        this._onFetch(PROM_RESULT_CONSTANTS.recoveryRateUtilizationForSixHr, dataForSixHr);
        this._onFetch(PROM_RESULT_CONSTANTS.recoveryRateUtilizationForTwentyFourHr, dataForTwentyFourHr);

    }
  }

  getUtilizationStats(stats, len, decrementBy) {
    let count = 0;
    let i;
    let data = [];

    for (i = len - 1; count < 6; i -= decrementBy) {
      if (typeof stats[i] !== 'undefined') {
        data.unshift(stats[i]);
        count++;
      } else {
        break;
      }
    }

    return data;
  }

  createUtilizationData(type, data) {
    const values = get(data, 'data.result[0].values');
    const len = values.length;
    const dataForOneHr = this.getUtilizationStats(values, len, 1);
    const dataForSixHr = this.getUtilizationStats(values, len, 6);
    const dataForTwentyFourHr = this.getUtilizationStats(values, len, 24);

    this.setUtilizationData(type, dataForOneHr, dataForSixHr, dataForTwentyFourHr);
    console.log(dataForOneHr, dataForSixHr, dataForTwentyFourHr, "data");
  }

  componentDidMount() {
    this._isMounted = true;

    if (getPrometheusBaseURL()) {
      fetchPrometheusQuery(CEPH_STATUS_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.ocsHealthResponse, response));
      fetchPrometheusQuery(CEPH_OSD_DOWN_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.cephOsdDown, response));
      fetchPrometheusQuery(CEPH_OSD_UP_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.cephOsdUp, response));

      fetchPrometheusQuery(UTILIZATION_IOPS_QUERY, response => this.createUtilizationData('iops', response));
      fetchPrometheusQuery(UTILIZATION_LATENCY_QUERY, response => this.createUtilizationData('latency', response));
      fetchPrometheusQuery(UTILIZATION_THROUGHPUT_QUERY, response => this.createUtilizationData('throughput', response));
      fetchPrometheusQuery(UTILIZATION_RECOVERY_RATE_QUERY, response => this.createUtilizationData('recoveryRate', response));

      fetchPrometheusQuery(STORAGE_CEPH_CAPACITY_TOTAL_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.capacityTotal, response));
      fetchPrometheusQuery(STORAGE_CEPH_CAPACITY_USED_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.capacityUsed, response));
      fetchPrometheusQuery(CEPH_PG_CLEAN_AND_ACTIVE_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.cleanAndActivePgRaw, response));
      fetchPrometheusQuery(CEPH_PG_TOTAL_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.totalPgRaw, response));

      fetchPrometheusQuery(CONSUMERS_PROJECT_REQUESTED_CAPACITY_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.projectsRequestedCapacity, response));
      fetchPrometheusQuery(CONSUMERS_PROJECT_USED_CAPACITY_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.projectsUsedCapacity, response));
      fetchPrometheusQuery(CONSUMERS_SLCLASSES_REQUESTED_CAPACITY_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.slClassesRequestedCapacity, response));
      fetchPrometheusQuery(CONSUMERS_SLCLASSES_USED_CAPACITY_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.slClassesUsedCapacity, response));
      fetchPrometheusQuery(CONSUMERS_PODS_REQUESTED_CAPACITY_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.podsRequestedCapacity, response));
      fetchPrometheusQuery(CONSUMERS_PODS_USED_CAPACITY_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.podsUsedCapacity, response));
    }

    if (getAlertManagerBaseURL()) {
      fetchAlerts(result => this.onFetch('alertsResponse', result));
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const inventoryResourceMapToProps = resources => {
      return {
        value: {
          LoadingComponent: LoadingInline,
          ...resources,
          ...this.state,
          EventStreamComponent,
        },
      };
    };

    return (
      <WithResources
        resourceMap={resourceMap}
        resourceToProps={inventoryResourceMapToProps}
      >
        <LazyRenderer>
          <StorageOverviewContext.Provider>
            <KubevirtStorageOverview />
          </StorageOverviewContext.Provider>
        </LazyRenderer>
      </WithResources>
    );
  }
}
