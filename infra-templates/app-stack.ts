import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

// blueprint stack logic
// duplicatable for each ephemeral environment
export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // sample resource for demonstration
        new s3.Bucket(this, 'EphemeralBucket', {
            versioned: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // ensure easy cleanup
            autoDeleteObjects: true, // allow bucket deletion when not empty
        });

        // output stack name for user return
        new cdk.CfnOutput(this, 'StackName', {
            value: this.stackName,
        });
    }
}