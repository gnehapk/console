import React from 'react';

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
import { fetchAlerts, fetchPrometheusQuery, getAlertManagerBaseURL, getPrometheusBaseURL, stopPrometheusQuery } from '../../../kubevirt/components/dashboards';

const { warn } = console;

const CEPH_PG_CLEAN_AND_ACTIVE_QUERY = 'ceph_pg_clean and ceph_pg_active';
const CEPH_PG_TOTAL_QUERY = 'ceph_pg_total';

const UTILIZATION_IOPS_QUERY = '(sum(rate(ceph_pool_wr[1m])) + sum(rate(ceph_pool_rd[1m])))';
//This query only count the latency for all drives in the configuration. Might go with same for the demo
const UTILIZATION_LATENCY_QUERY = '(quantile(.95,(cluster:ceph_disk_latency:join_ceph_node_disk_irate1m)))';
const UTILIZATION_THROUGHPUT_QUERY = '(sum(rate(ceph_pool_wr_bytes[1m]) + rate(ceph_pool_rd_bytes[1m])))';
const UTILIZATION_RECOVERY_RATE_QUERY = 'sum(ceph_pool_recovering_bytes_per_sec)';
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

const HourMap = {
  "1 Hour": "[60m:10m]",
  "6 Hours": "[360m:60m]",
  "24 Hours": "[1440m:240m]",
};

const PROM_RESULT_CONSTANTS = {
  ocsHealthResponse: 'ocsHealthResponse',
  cephOsdDown: 'cephOsdDown',
  cephOsdUp: 'cephOsdUp',
  iopsUtilization: 'iopsUtilization',
  latencyUtilization: 'latencyUtilization',
  throughputUtilization: 'throughputUtilization',
  recoveryRateUtilization: 'recoveryRateUtilization',
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

const timers = { };
let iopsTimer = null;
let latencyTimer = null;
let throughputTimer = null;
let recoveryRateTimer = null;

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
    this.utilizationCallback = this.utilizationCallback.bind(this);
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

  _getUtilizationQuery(type, duration) {
    switch (type) {
      case 'iops':
        return UTILIZATION_IOPS_QUERY + duration;

      case 'latency':
        return UTILIZATION_LATENCY_QUERY + duration;

      case 'throughput':
        return UTILIZATION_THROUGHPUT_QUERY + duration;

      case 'recoveryRate':
        return UTILIZATION_RECOVERY_RATE_QUERY + duration;

      default:
        return '';
    }
  }

  utilizationCallback(duration) {

    stopPrometheusQuery(timers.iopsTimer);
    stopPrometheusQuery(timers.latencyTimer);
    stopPrometheusQuery(timers.throughputTimer);
    stopPrometheusQuery(timers.recoveryRateTimer);

    fetchPrometheusQuery(this._getUtilizationQuery('iops', HourMap[duration]), response => this.onFetch(PROM_RESULT_CONSTANTS.iopsUtilization, response));
    fetchPrometheusQuery(this._getUtilizationQuery('latency', HourMap[duration]), response => this.onFetch(PROM_RESULT_CONSTANTS.latencyUtilization, response));
    fetchPrometheusQuery(this._getUtilizationQuery('throughput', HourMap[duration]), response => this.onFetch(PROM_RESULT_CONSTANTS.throughputUtilization, response));
    fetchPrometheusQuery(this._getUtilizationQuery('recoveryRate', HourMap[duration]), response => this.onFetch(PROM_RESULT_CONSTANTS.recoveryRateUtilization, response));

  }

  storeTimerId(id, type) {
    timers[type+"Timer"] = id;
  }

  componentDidMount() {
    this._isMounted = true;

    if (getPrometheusBaseURL()) {
      fetchPrometheusQuery(CEPH_STATUS_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.ocsHealthResponse, response));
      fetchPrometheusQuery(CEPH_OSD_DOWN_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.cephOsdDown, response));
      fetchPrometheusQuery(CEPH_OSD_UP_QUERY, response => this.onFetch(PROM_RESULT_CONSTANTS.cephOsdUp, response));

      // fetchPrometheusQuery(this._getUtilizationQuery('iops', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.iopsUtilization, response));
      // fetchPrometheusQuery(this._getUtilizationQuery('latency', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.latencyUtilization, response));
      // fetchPrometheusQuery(this._getUtilizationQuery('throughput', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.throughputUtilization, response));
      // fetchPrometheusQuery(this._getUtilizationQuery('recoveryRate', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.recoveryRateUtilization, response));

      fetchPrometheusQuery(this._getUtilizationQuery('iops', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.iopsUtilization, response), id => this.storeTimerId(id, 'iops'));
      fetchPrometheusQuery(this._getUtilizationQuery('latency', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.latencyUtilization, response), id => this.storeTimerId(id, 'latency'));
      fetchPrometheusQuery(this._getUtilizationQuery('throughput', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.throughputUtilization, response), id => this.storeTimerId(id, 'throughput'));
      fetchPrometheusQuery(this._getUtilizationQuery('recoveryRate', '[360m:60m]'), response => this.onFetch(PROM_RESULT_CONSTANTS.recoveryRateUtilization, response), id => this.storeTimerId(id, 'recoveryRate'));

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
          utilizationCallback: this.utilizationCallback,
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