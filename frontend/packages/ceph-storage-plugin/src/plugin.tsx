import * as _ from 'lodash-es';

import {
  Plugin,
  ModelFeatureFlag,
  ModelDefinition,
  DashboardsOverviewHealthPrometheusSubsystem,
  HrefNavItem,
  RoutePage,
} from '@console/plugin-sdk';

import * as models from './models';

type ConsumedExtensions =
  | RoutePage
  | HrefNavItem
  | ModelFeatureFlag
  | ModelDefinition
  | DashboardsOverviewHealthPrometheusSubsystem;


const CEPH_FLAG = 'CEPH';

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
    type: 'NavItem/Href',
    properties: {
      section: 'Home',
      componentProps: {
        name: 'Ceph dashboard',
        href: '/test',
      },
    },
  },
  {
    type: 'Page/Route',
    properties: {
      exact: true,
      path: '/test',
      loader: () =>
        import('./components/ocs-install/ocs-install' /* webpackChunkName: "metal3-baremetalhost" */).then(
          (m) => m.createNewOCSCluster,
        ),
    },
      
  },
];

export default plugin;
