import * as _ from 'lodash';
import {
  DashboardsCard,
  DashboardsTab,
  DashboardsOverviewHealthPrometheusSubsystem,
  ModelFeatureFlag,
  ModelDefinition,
  Plugin,
  DashboardsOverviewQuery,
  RoutePage,
} from '@console/plugin-sdk';
import { GridPosition } from '@console/internal/components/dashboard';
import { OverviewQuery } from '@console/internal/components/dashboards-page/overview-dashboard/queries';
import { ClusterServiceVersionModel } from '@console/internal/models';
import * as models from './models';
import {
  CAPACITY_USAGE_QUERIES,
  StorageDashboardQuery,
  STORAGE_HEALTH_QUERIES,
} from './constants/queries';
import { getCephHealthState } from './components/dashboard-page/storage-dashboard/health-card/utils';

type ConsumedExtensions =
  | ModelFeatureFlag
  | ModelDefinition
  | DashboardsTab
  | DashboardsCard
  | DashboardsOverviewHealthPrometheusSubsystem
  | DashboardsOverviewQuery
  | RoutePage;

const CEPH_FLAG = 'CEPH';
// keeping this for testing, will be removed once ocs operator available
const apiObjectRef = 'core.libopenstorage.org~v1alpha1~StorageCluster';
// const apiObjectRef = referenceForModel(models.OCSServiceModel);

const plugin: Plugin<ConsumedExtensions> = [
  {
    type: 'ModelDefinition',
    properties: {
      models: _.values(models),
    },
  },
  {
    type: 'FeatureFlag/Model',
    properties: {
      model: models.CephClusterModel,
      flag: CEPH_FLAG,
    },
  },
  {
    type: 'Dashboards/Tab',
    properties: {
      id: 'persistent-storage',
      title: 'Persistent Storage',
    },
  },
  {
    type: 'Dashboards/Card',
    properties: {
      tab: 'persistent-storage',
      position: GridPosition.MAIN,
      loader: () =>
        import(
          './components/dashboard-page/storage-dashboard/data-resiliency/data-resiliency' /* webpackChunkName: "ceph-data-resiliency-card" */
        ).then((m) => m.DataResiliencyWithResources),
    },
  },
  {
    type: 'Page/Route',
    properties: {
      exact: true,
      path: `/k8s/ns/:ns/${ClusterServiceVersionModel.plural}/:appName/${apiObjectRef}/~new`,
      loader: () =>
        import(
          './components/ocs-install/ocs-install' /* webpackChunkName: "ceph-ocs-service" */
        ).then((m) => m.CreateOCSService),
    },
  },
  {
    type: 'Dashboards/Card',
    properties: {
      tab: 'persistent-storage',
      position: GridPosition.MAIN,
      span: 6,
      loader: () =>
        import(
          './components/dashboard-page/storage-dashboard/capacity-card/capacity-card' /* webpackChunkName: "ceph-storage-capacity-card" */
        ).then((m) => m.default),
    },
  },
  {
    type: 'Dashboards/Card',
    properties: {
      tab: 'persistent-storage',
      position: GridPosition.RIGHT,
      loader: () =>
        import(
          './components/dashboard-page/storage-dashboard/utilization-card/utilization-card' /* webpackChunkName: "ceph-storage-utilization-card" */
        ).then((m) => m.default),
    },
  },
  {
    type: 'Dashboards/Card',
    properties: {
      tab: 'persistent-storage',
      position: GridPosition.RIGHT,
      loader: () =>
        import(
          './components/dashboard-page/storage-dashboard/events-card' /* webpackChunkName: "ceph-storage-events-card" */
        ).then((m) => m.default),
    },
  },
  {
    type: 'Dashboards/Card',
    properties: {
      tab: 'persistent-storage',
      position: GridPosition.LEFT,
      loader: () =>
        import(
          './components/dashboard-page/storage-dashboard/inventory-card' /* webpackChunkName: "ceph-storage-inventory-card" */
        ).then((m) => m.default),
    },
  },
  {
    type: 'Dashboards/Card',
    properties: {
      tab: 'persistent-storage',
      position: GridPosition.MAIN,
      loader: () =>
        import(
          './components/dashboard-page/storage-dashboard/top-consumers-card/top-consumers-card' /* webpackChunkName: "ceph-storage-top-consumers-card" */
        ).then((m) => m.default),
    },
  },
  {
    type: 'Dashboards/Overview/Health/Prometheus',
    properties: {
      title: 'Storage',
      query: STORAGE_HEALTH_QUERIES[StorageDashboardQuery.CEPH_STATUS_QUERY],
      healthHandler: getCephHealthState,
    },
  },
  {
    type: 'Dashboards/Overview/Query',
    properties: {
      queryKey: OverviewQuery.STORAGE_TOTAL,
      query: CAPACITY_USAGE_QUERIES[StorageDashboardQuery.CEPH_CAPACITY_TOTAL],
    },
  },
  {
    type: 'Dashboards/Overview/Query',
    properties: {
      queryKey: OverviewQuery.STORAGE_UTILIZATION,
      query: CAPACITY_USAGE_QUERIES[StorageDashboardQuery.CEPH_CAPACITY_USED],
    },
  },
];

export default plugin;