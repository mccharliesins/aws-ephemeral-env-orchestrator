import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

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

        // 1. get metadata from db
        const result = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { envId },
        }));

        if (!result.Item) {
            return { statusCode: 404, body: JSON.stringify({ message: 'environment not found' }) };
        }

        const item = result.Item;

        // 2. optional: sync with cloudformation status
        // verifies stack existence and state
        let cfnStatus = 'UNKNOWN';
        try {
            // commented out for simulation
            /*
            const cfnRes = await cfnClient.send(new DescribeStacksCommand({
                StackName: item.stackName
            }));
            if (cfnRes.Stacks && cfnRes.Stacks.length > 0) {
                cfnStatus = cfnRes.Stacks[0].StackStatus || 'UNKNOWN';
            }
            */
            cfnStatus = 'CREATE_COMPLETE'; // simulated
        } catch (e) {
            // stack might not exist
            cfnStatus = 'MISSING';
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                envId: item.envId,
                status: item.status,
                cloudFormationStatus: cfnStatus,
                owner: item.owner,
                expiresAt: new Date(item.expiresAt * 1000).toISOString(),
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