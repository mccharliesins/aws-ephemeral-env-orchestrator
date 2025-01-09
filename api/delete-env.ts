import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DeleteStackCommand } from '@aws-sdk/client-cloudformation';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cfnClient = new CloudFormationClient({});

const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const envId = event.pathParameters?.id;
        if (!envId) {
            return { statusCode: 400, body: JSON.stringify({ message: 'missing env id' }) };
        }

        // 1. get stack name
        const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { envId },
        }));

        if (!result.Item) {
            return { statusCode: 404, body: JSON.stringify({ message: 'environment not found' }) };
        }
        const stackName = result.Item.stackName;

        // 2. trigger stack deletion
        console.log(`[simulated] deleting stack: ${stackName}`);
        /*
        await cfnClient.send(new DeleteStackCommand({
            StackName: stackName
        }));
        */

        // 3. update status to deleted
        // retain record temporarily for tracking
        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { envId },
            UpdateExpression: 'set #s = :s',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: { ':s': 'DELETED' }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'environment deletion initiated' }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'internal server error' }),
        };
    }
};
// optimized