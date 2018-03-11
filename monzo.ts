import axios from 'axios';
import { config } from './config/config';
import * as querystring from 'querystring';
import { getConfig, setConfig, UserConfig } from './database';

export const TOKEN_URL = 'https://api.monzo.com/oauth2/token';

export interface AuthResult {
  access_token: string,
  client_id: string,
  expires_in: number,
  refresh_token?: string,
  token_type: string,
  user_id: string
}

export async function exchangeAuthCode(code: string, redirectUri: string): Promise<UserConfig> {

  const [result, dbConfig] = await Promise.all([
    axios.post<AuthResult>(TOKEN_URL, querystring.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      code
    })),
    getConfig()
  ]);

  const data = result.data;

  if (dbConfig[data.user_id]) {
    dbConfig[data.user_id].refreshToken = data.refresh_token;
    dbConfig[data.user_id].accessToken = data.access_token;
  } else {
    dbConfig[data.user_id] = {
      userId: data.user_id,
      potId: null,
      accountId: null,
      refreshToken: data.refresh_token,
      accessToken: data.access_token
    }
  }

  await setConfig(dbConfig);

  return dbConfig[data.user_id];
}

export async function refreshAuthToken(userId: string): Promise<UserConfig> {
  const dbConfig = await getConfig();

  const userConfig = dbConfig[userId];
  if (!userConfig) {
    throw new Error('User not found');
  }

  const result = await axios.post<AuthResult>(TOKEN_URL, querystring.stringify({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: userConfig.refreshToken
  }));

  dbConfig[result.data.user_id] = {
    ...dbConfig[result.data.user_id],
    refreshToken: result.data.refresh_token,
    accessToken: result.data.access_token
  };

  await setConfig(dbConfig);

  return dbConfig[result.data.user_id];
}
