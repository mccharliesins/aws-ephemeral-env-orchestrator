import { ScheduledHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DeleteStackCommand } from '@aws-sdk/client-cloudformation';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cfnClient = new CloudFormationClient({});

const TABLE_NAME = process.env.TABLE_NAME || '';

/*
    scheduled cleanup function
    scans for expired environments and triggers destruction
    ensure infrastructure is removed even if dynamodb ttl is delayed
*/
export const handler: ScheduledHandler = async (event) => {
    console.log('reaper execution started');
    
    try {
        const now = Math.floor(Date.now() / 1000);

        // 1. scan for expired items
        // note: scan inefficient for large tables; consider gsi with date
        const result = await docClient.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'expiresAt < :now AND #s <> :deleted',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { 
                ':now': now,
                ':deleted': 'DELETED' 
            }
        }));

        if (!result.Items || result.Items.length === 0) {
            console.log('no expired environments found.');
            return;
        }

        console.log(`found ${result.Items.length} expired environments. terminating...`);

        // 2. terminate each one
        const promises = result.Items.map(async (item) => {
            const stackName = item.stackName;
            const envId = item.envId;

            console.log(`reaping environment: ${envId} (stack: ${stackName})`);

            try {
                // a. delete real infrastructure
                /*
                await cfnClient.send(new DeleteStackCommand({
                    StackName: stackName
                }));
                */
               console.log(`[simulated] delete stack command sent for ${stackName}`);

               // b. mark as deleted in db
               // allow dynamodb ttl to eventually remove the record
               // mark as deleted to prevent reprocessing
               await docClient.send(new DeleteCommand({
                   TableName: TABLE_NAME,
                   Key: { envId }
               }));
               
               console.log(`marked ${envId} as deleted/removed from db`);

            } catch (err) {
                console.error(`failed to reap ${envId}`, err);
            }
        });

        await Promise.all(promises);
        console.log('reaper execution finished');

    } catch (error) {
        console.error('reaper failed', error);
        throw error;
    }
};
console.log("debug");