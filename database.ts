import { DynamoDB } from 'aws-sdk';
import DocumentClient = DynamoDB.DocumentClient;

const docClient = new DocumentClient();

const TABLE_NAME = 'lambda-config';
const CONFIG_ID = 'monzo-penny-pot';

export interface UserConfig {
  userId: string;
  accountId: string | null;
  refreshToken: string;
  accessToken: string | null;
  potId: string | null;
}

export interface StoredConfig {
  [userId: string]: UserConfig;
}

export async function getConfig(): Promise<StoredConfig> {
  const props: DocumentClient.GetItemInput = {
    TableName: TABLE_NAME,
    Key: { id: CONFIG_ID }
  };

  try {
    const result = await docClient.get(props).promise();

    if (!result|| !result.Item || !result.Item.value) {
      return await setConfig({});
    } else {
      return result.Item.value;
    }
  } catch (e) {
    console.error('Failed to fetch config', e);
    throw e;
  }
}

export async function setConfig(config: StoredConfig): Promise<StoredConfig> {
  const itemToInsert: DocumentClient.PutItemInput = {
    TableName: TABLE_NAME,
    Item: {
      id: CONFIG_ID,
      value: config || {}
    }
  };

  await docClient.put(itemToInsert).promise();
  return config;
}
