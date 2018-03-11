import axios from 'axios';
import { config } from './config/config';
import * as querystring from 'querystring';
import { getUserConfig, setUserConfig, UserConfig } from './database';

export const TOKEN_URL = 'https://api.monzo.com/oauth2/token';
export const ACCOUNTS_URL = 'https://api.monzo.com/accounts';
export const POTS_URL = 'https://api.monzo.com/pots';
export const WEBHOOKS_URL = 'https://api.monzo.com/webhooks';

export interface AuthResult {
  access_token: string,
  client_id: string,
  expires_in: number,
  refresh_token?: string,
  token_type: string,
  user_id: string
}

export interface BaseAccount {
  id: string;
  closed: boolean;
  created: string; // ISO-8601 date
  description: string;
  type: 'uk_prepaid' | 'uk_retail';
}

export interface PrepaidAccount extends BaseAccount {
  type: 'uk_prepaid';
}

export interface RetailAccount extends BaseAccount {
  type: 'uk_retail';
  account_number: string;
  sort_code: string;
}

export type Account = PrepaidAccount | RetailAccount;

export interface Pot {
  id: string;
  name: string;
  style: string;
  balance: number; // In pence
  currency: number;
  created: string; // ISO-8601
  updated: string; // ISO-8601
  deleted: boolean;
}

export async function exchangeAuthCode(code: string, redirectUri: string): Promise<UserConfig> {

  let data: AuthResult;

  try {
    const result = await axios.post<AuthResult>(TOKEN_URL, querystring.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      code
    }));

    data = result.data;
  } catch (e) {
    console.log(`Failed to exchange auth code, status: ${e.code}, response: ${e.response.data}`);
    throw e;
  }

  const userConfig = await getUserConfig(data.user_id);

  return await setUserConfig({
    ...userConfig,
    refreshToken: data.refresh_token,
    accessToken: data.access_token
  });
}

export async function refreshAuthToken(userId: string): Promise<UserConfig> {
  const userConfig = await getUserConfig(userId);

  if (!userConfig.refreshToken) {
    throw new Error('User not found');
  }

  const result = await axios.post<AuthResult>(TOKEN_URL, querystring.stringify({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: userConfig.refreshToken
  }));

  return await setUserConfig({
    ...userConfig,
    refreshToken: result.data.refresh_token,
    accessToken: result.data.access_token
  });
}

export async function getAccounts(accessToken: string, includeClosed?: boolean): Promise<Account[]> {
  const result = await axios.get(ACCOUNTS_URL, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  if (result.data) {
    return result.data.accounts.filter((account: Account) => includeClosed || !account.closed);
  }
  return [];
}

export async function getPots(accessToken: string): Promise<Account[]> {
  const result = await axios.get(POTS_URL, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  if (result.data) {
    return result.data.pots.filter((pot: Pot) => !pot.deleted);
  }
  return [];
}

interface WebhookResult {
  webhook: {
    account_id: string;
    id: string;
    url: string;
  };
}

export async function registerWebhook(userConfig: UserConfig): Promise<string | null> {
  const { webhook, accountId, accessToken } = userConfig;

  if (!accountId || !accessToken) {
    throw new Error('Missing data');
  }

  if (webhook) {
    return null;
  }

  const result = await axios.post<WebhookResult>(WEBHOOKS_URL, querystring.stringify({
      account_id: accountId,
      url: `${config.apiRoot}/webhook`
    }), {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

  const webhookId = result.data.webhook.id;

  await setUserConfig({
    ...userConfig,
    webhook: webhookId
  });

  return webhookId;
}
