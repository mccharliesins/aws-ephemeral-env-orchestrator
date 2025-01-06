import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, CreateStackCommand } from '@aws-sdk/client-cloudformation';
import * as crypto from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cfnClient = new CloudFormationClient({});

const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const ttlHours = body.ttlHours || 2; // default 2 hours
        const owner = body.owner || 'unknown';

        // generate unique environment id
        const envId = `env-${crypto.randomBytes(4).toString('hex')}`;
        const stackName = `EphemeralStack-${envId}`;

        // calculate expiration timestamp
        // current time + ttl
        const now = new Date();
        const expiresAt = Math.floor(now.getTime() / 1000) + (ttlHours * 3600);

        // 1. trigger cloudformation creation
        // note: simulation; real implementation would reference synthesized template in s3
        // so we will simulate it or assume the template is uploaded
        //
        // effectively: aws cloudformation create-stack --stack-name ... --template-url ...

        /* 
           note: production implementation
           
           await cfnClient.send(new CreateStackCommand({
             StackName: stackName,
             TemplateURL: 'https://s3.amazonaws.com/.../app-stack.template.json' 
           }));
        */

        // simulating success for demonstration
        console.log(`[simulated] creating stack: ${stackName}`);

        // 2. save metadata to dynamodb
        const item = {
            envId,
            stackName,
            status: 'CREATING',
            owner,
            createdAt: Math.floor(now.getTime() / 1000),
            expiresAt: expiresAt, // ttl for automatic deletion
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
        }));

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'environment creation initiated',
                envId,
                stackName,
                expiresAt: new Date(expiresAt * 1000).toISOString(),
            }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'internal server error' }),
        };
    }
};
// fix applied