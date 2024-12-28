import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

export class OrchestratorStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. dynamodb table for state
        // stores metadata (envId, status, expiresAt)
        const table = new dynamodb.Table(this, 'EnvironmentsTable', {
            partitionKey: { name: 'envId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expiresAt', // automatic deletion by dynamodb
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // common lambda props
        const nodeJsFunctionProps: nodejs.NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk', // use the 'aws-sdk' available in the lambda runtime
                ],
            },
            depsLockFilePath: path.join(__dirname, '..', 'package-lock.json'), // ensure deps are locked
            environment: {
                TABLE_NAME: table.tableName,
            },
            runtime: lambda.Runtime.NODEJS_20_X,
        };

        // 2. lambdas
        // create-env: provisions new environments
        const createEnvLambda = new nodejs.NodejsFunction(this, 'CreateEnvFunction', {
            entry: path.join(__dirname, '..', 'api', 'create-env.ts'),
            handler: 'handler',
            ...nodeJsFunctionProps,
        });

        // get-status: checks cloudformation status
        const getStatusLambda = new nodejs.NodejsFunction(this, 'GetStatusFunction', {
            entry: path.join(__dirname, '..', 'api', 'get-status.ts'),
            handler: 'handler',
            ...nodeJsFunctionProps,
        });

        // delete-env: triggers stack deletion
        const deleteEnvLambda = new nodejs.NodejsFunction(this, 'DeleteEnvFunction', {
            entry: path.join(__dirname, '..', 'api', 'delete-env.ts'),
            handler: 'handler',