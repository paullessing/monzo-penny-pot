import { DynamoDB } from 'aws-sdk';
import DocumentClient = DynamoDB.DocumentClient;

const docClient = new DocumentClient();

const TABLE_NAME = 'lambda-config';
const CONFIG_ID = 'monzo-penny-pot';

let lastConfig: StoredConfig;

export interface UserConfig {
  userId: string;
  accountId: string | null;
  refreshToken: string;
  accessToken: string | null;
  potId: string | null;
  webhook: string | null;
}

export interface StoredConfig {
  [userId: string]: UserConfig;
}

export async function getConfig(): Promise<StoredConfig> {
  if (lastConfig) {
    return lastConfig;
  }

  const props: DocumentClient.GetItemInput = {
    TableName: TABLE_NAME,
    Key: { id: CONFIG_ID }
  };

  try {
    const result = await docClient.get(props).promise();

    if (!result|| !result.Item || !result.Item.value) {
      return await setConfig({});
    } else {
      lastConfig = result.Item.value;
      return lastConfig;
    }
  } catch (e) {
    console.error('Failed to fetch config', e);
    throw e;
  }
}

export async function getUserConfig(userId: string): Promise<UserConfig> {
  const config = await getConfig();
  return config[userId] || {
    userId: userId,
    potId: null,
    accountId: null,
    webhook: null,
    refreshToken: null,
    accessToken: null
  };
}

export async function getUserConfigByAccountId(accountId: string): Promise<UserConfig | null> {
  const config = await getConfig();
  for (const userId of Object.keys(config)) {
    if (config[userId].accountId === accountId) {
      return config[userId];
    }
  }
  return null;
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

  lastConfig = config;

  return config;
}

export async function setUserConfig(config: UserConfig): Promise<UserConfig> {
  const dbConfig = await getConfig();

  await setConfig({
    ...dbConfig,
    [config.userId]: config
  });

  return config;
}
