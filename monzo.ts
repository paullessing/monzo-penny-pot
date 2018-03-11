import axios from 'axios';
import { config } from './config/config';
import * as querystring from 'querystring';
import { getUserConfig, setUserConfig, UserConfig } from './database';
import { Account, AuthResult, Pot, Webhook } from './models';

export const TOKEN_URL = 'https://api.monzo.com/oauth2/token';
export const ACCOUNTS_URL = 'https://api.monzo.com/accounts';
export const POTS_URL = 'https://api.monzo.com/pots';
export const WEBHOOKS_URL = 'https://api.monzo.com/webhooks';

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

export async function registerWebhook(userConfig: UserConfig): Promise<string | null> {
  const { webhook, accountId, accessToken } = userConfig;

  if (!accountId || !accessToken) {
    throw new Error('Missing data');
  }

  if (webhook) {
    return null;
  }

  const result = await axios.post<{ webhook: Webhook }>(WEBHOOKS_URL, querystring.stringify({
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

export async function moveMoneyToPot(config: UserConfig, amount: number, id: string): Promise<Pot> {
  const url = `${POTS_URL}/${config.potId}/deposit`;

  const dedupeId = `send-${amount}-forTx-${id}`;

  const result = await axios.put<Pot>(url, querystring.stringify({
    source_account_id: config.accountId,
    amount,
    dedupe_id: dedupeId
  }), {
    headers: { 'Authorization': `Bearer ${config.accessToken}` }
  });

  return result.data;
}
