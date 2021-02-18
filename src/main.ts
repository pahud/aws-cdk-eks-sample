import * as ec2 from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
import { App, Construct, Stack, StackProps } from '@aws-cdk/core';

const DEFAULT_INSTANCE_TYPES = [
  new ec2.InstanceType('m5.large'),
  new ec2.InstanceType('c5.large'),
  new ec2.InstanceType('t3.large'),
];

export interface EksClusterProps {
  readonly vpc?: ec2.IVpc;
}

export class EksCluster extends Construct {
  constructor(scope: Construct, id: string, props: EksClusterProps = {}) {
    super(scope, id);

    const vpc = props.vpc ?? new ec2.Vpc(this, 'Vpc', { natGateways: 1 });
    const spotOnly = this.node.tryGetContext('spot_only') == '1' ? true : false;
    const instanceTypes = this.node.tryGetContext('instance_type') ?
      [this.node.tryGetContext('instance_type')] : DEFAULT_INSTANCE_TYPES;
    const defaultCapacity: number = this.node.tryGetContext('default_capacity') || 2;
    const version = eks.KubernetesVersion.V1_19

    // create cluster only. We'll create MNG later.
    const cluster = new eks.Cluster(this, 'Cluster', {
      vpc,
      version,
      defaultCapacity: 0,
    });

    if (spotOnly) {
      // create a spot managed nodegroup
      cluster.addNodegroupCapacity('MNG', {
        capacityType: eks.CapacityType.SPOT,
        instanceTypes,
        desiredSize: Number(defaultCapacity),
      });
    } else {
      // create a on-demand managed nodegroup
      cluster.addNodegroupCapacity('MNG', {
        capacityType: eks.CapacityType.ON_DEMAND,
        instanceTypes,
        desiredSize: Number(defaultCapacity),
      });
    }
  }
}

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    new EksCluster(this, 'EksCluster', {
      vpc: getOrCreateVpc(this),
    });

  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

const stackName = app.node.tryGetContext('stackName') || 'cdk-eks-demo-stack';

new MyStack(app, stackName, { env: devEnv });

app.synth();

function getOrCreateVpc(scope: Construct): ec2.IVpc {
  // use an existing vpc or create a new one
  return scope.node.tryGetContext('use_default_vpc') === '1' ?
    ec2.Vpc.fromLookup(scope, 'Vpc', { isDefault: true }) :
    scope.node.tryGetContext('use_vpc_id') ?
      ec2.Vpc.fromLookup(scope, 'Vpc', { vpcId: scope.node.tryGetContext('use_vpc_id') }) :
      new ec2.Vpc(scope, 'Vpc', { maxAzs: 3, natGateways: 1 });
}

