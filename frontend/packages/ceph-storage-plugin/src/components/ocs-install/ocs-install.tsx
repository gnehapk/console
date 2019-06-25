import * as React from 'react';
import { ipiDeployementModal } from './ipi-deployment/ipi-deployment';


export class createNewOCSCluster extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  click = () => {
    ipiDeployementModal({
    });
  }

  render() {
    return (
      <button onClick={this.click}>Launch Modal</button>
    );
  }
};
