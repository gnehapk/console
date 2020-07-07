import * as React from 'react';
import { Form } from '@patternfly/react-core';
import { ChartDonut } from '@patternfly/react-charts';
import { calculateRadius } from '@console/shared';
import { pluralize } from '@console/internal/components/utils/';
import {
  LocalVolumeSetInner,
  LocalVolumeSetHeader,
} from '@console/local-storage-operator-plugin/src/components/local-volume-set/local-volume-set-inner';
import { State, Action } from '../state';

export const CreateLocalVolumeSet: React.FC<CreateLocalVolumeSetProps> = ({ state, dispatch }) => {
  const donutData = state.chartSelectedData
    ? [
        { x: 'Selected', y: state.chartSelectedData },
        { x: 'Available', y: (Number(state.chartTotalData) - Number(state.chartSelectedData)).toFixed(2) },
      ]
    : [{ x: 'Total', y: state.chartTotalData }];

  const { podStatusInnerRadius: innerRadius, podStatusOuterRadius: radius } = calculateRadius(220);
  const availableCapacityString = `${Number(state.chartSelectedData).toFixed(1)} ${
    state.chartDataUnit
  }`;
  const totalCapacityString = `${Number(state.chartTotalData).toFixed(1)} ${state.chartDataUnit}`;

  console.log(state, 'state');
  return (
    <>
      <LocalVolumeSetHeader />
      <div className="ceph-ocs-install__form-wrapper">
        <Form noValidate={false} className="ceph-ocs-install__create-sc-form">
          <LocalVolumeSetInner state={state} dispatch={dispatch} />
        </Form>
        {/* <div className="ceph-ocs-install__chart-wrapper">
          <ChartDonut
            ariaDesc={state.chartSelectedData ? 'Available versus Selected Capacity' : 'Total Capacity'}
            ariaTitle={state.chartSelectedData ? 'Available versus Selected Capacity' : 'Total Capacity'}
            height={220}
            width={220}
            size={130}
            innerRadius={innerRadius}
            radius={radius}
            data={donutData}
            labels={({ datum }) => `${datum.y} ${state.chartDataUnit} ${datum.x}`}
            subTitle={`Out of ${Number(state.chartTotalData).toFixed(1)} ${state.chartDataUnit}`}
            title={state.chartSelectedData ? availableCapacityString : totalCapacityString}
            constrainToVisibleArea={true}
          />
          <div>{pluralize(state.nodeNames.length, 'Node')}</div>
        </div> */}
      </div>
    </>
  );
};

type CreateLocalVolumeSetProps = {
  state: State;
  dispatch: React.Dispatch<Action>;
};
