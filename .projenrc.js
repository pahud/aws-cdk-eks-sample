const { AwsCdkTypeScriptApp } = require('projen');
const { Automation } = require('projen-automate-it');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.82.0',
  name: 'aws-cdk-eks-sample',
  cdkDependencies: [
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-eks',
  ],
  dependabot: false,
  defaultReleaseBranch: 'main',
  deps: ['projen-automate-it'],
});

const automation = new Automation(project, { automationToken: AUTOMATION_TOKEN });
automation.autoApprove();
automation.autoMerge();
automation.projenYarnUpgrade();
automation.projenYarnUpgrade('projenYarnUpgradeWithTest', { yarnTest: true });

const common_exclude = ['cdk.out', 'cdk.context.json', 'images', 'yarn-error.log'];
project.npmignore.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);

project.synth();
