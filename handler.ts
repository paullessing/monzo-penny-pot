import { aws, HandlerRequest, HandlerResponse } from 'serverless-api-handlers';
import { config } from './config/config';
import { v4 as uuid } from 'uuid';
import { exchangeAuthCode, getAccounts, getPots, moveMoneyToPot, refreshAuthToken, registerWebhook } from './monzo';
import settingsHtml from './settings.html';
import * as querystring from 'querystring';
import { getUserConfig, getUserConfigByAccountId, setUserConfig } from './database';
import { Account, Pot } from './models';
import { Transaction } from './models/transaction.model';

async function onWebhook(request: HandlerRequest): Promise<HandlerResponse> {
  console.log('\n\n\nWEBHOOK CALLED\n', request.body);

  const result = await roundUp(request);

  return {
    statusCode: result ? 200 : 204
  };
}

async function onLogin(request: HandlerRequest): Promise<HandlerResponse> {
  console.log('\n\n\n============= LOGIN ==========\n');
  const loginUrl = `${config.apiRoot}/login`;

  if (request.queryParameters.hasOwnProperty('code') && request.queryParameters.hasOwnProperty('state')) {

    console.log('got query parameters, exchanging auth code');

    const userConfig = await exchangeAuthCode(request.queryParameters.code as string, loginUrl);

    console.log('New config', userConfig);

    const [accounts, pots] = await Promise.all([getAccounts(userConfig.accessToken), getPots(userConfig.accessToken)]) as any as [Account[], Pot[]];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: settingsHtml({
        userId: userConfig.userId,
        accessToken: userConfig.accessToken,
        accounts,
        pots
      })
    }
  }
  
  console.log(request);
  const state = uuid();
  return {
    statusCode: 302,
    headers: {
      'Location': `https://auth.monzo.com/?client_id=${config.clientId}&redirect_uri=${loginUrl}&response_type=code&state=${state}`
    }
  }
}

interface SetupPostData {
  accessToken: string;
  userId: string;
  accountId: string;
  potId: string;
}

async function onSetup(request: HandlerRequest): Promise<HandlerResponse> {
  let data: SetupPostData;
  try {
    data = querystring.parse(request.body) as any as SetupPostData;
  } catch (e) {
    return {
      statusCode: 400,
      body: 'Invalid body'
    };
  }
  if (!data) {
    return {
      statusCode: 400,
      body: 'Missing body'
    }
  }
  if (!data.accessToken || !data.userId) {
    return {
      statusCode: 400,
      body: 'Missing data'
    };
  }
  if (!data.accountId) {
    return {
      statusCode: 400,
      body: 'Missing accountId'
    };
  }
  if (!data.potId) {
    return {
      statusCode: 400,
      body: 'Missing potId'
    };
  }
  const userConfig = await getUserConfig(data.userId);
  if (!userConfig.accessToken) {
    return {
      statusCode: 401,
      body: 'Unknown user ID'
    };
  }
  if (userConfig.accessToken !== data.accessToken) {
    return {
      statusCode: 403,
      body: 'Invalid token'
    };
  }

  const newUserConfig = await setUserConfig({
    ...userConfig,
    accountId: data.accountId,
    potId: data.potId
  });

  const webhookId = await registerWebhook(newUserConfig);

  if (webhookId) {
    return {
      statusCode: 200,
      body: `Webhook with ID ${webhookId} created`
    };
  } else {
    return {
      statusCode: 200,
      body: 'Webhook already exists'
    };
  }
}

async function roundUp(request: HandlerRequest): Promise<boolean> {
  if (!request.body) {
    console.log('ABORT: No body');
    return false;
  }

  const body: { type: string, data: Transaction } = tryParse(request.body);
  if (!body) {
    console.log('ABORT: Body parse result is empty');
    return false;
  }

  if (body.type !== 'transaction.created') {
    console.log('ABORT: Missing body or wrong type', request.body, request.body.type);
    return false;
  }

  console.log('\n\nTRANSACTION CREATED\n', request);
  const tx: Transaction = body.data;
  // WARNING: NEVER ALLOW POTS TO BE USED HERE - it will cause infinite loops!
  if (tx.scheme !== 'mastercard' || tx.amount >= 0) {
    console.log('ABORT: Wrong scheme or positive amount');
    return false;
  }

  let userConfig = await getUserConfigByAccountId(tx.account_id);
  if (!userConfig) {
    console.log('ABORT: No user config found for account ID', tx.account_id);
    return false;
  }

  const diffAmount = (100 - (Math.abs(tx.amount) % 100)) % 100;

  if (diffAmount < 0 || diffAmount > 100) {
    throw new Error(`Surprising amount: ${diffAmount} from ${tx.amount}`);
  }

  if (diffAmount === 0) {
    console.log('ABORT: Amount is already round');
    return false;
  }

  console.log('Refreshing auth token');
  userConfig = await refreshAuthToken(userConfig.userId);

  console.log(`About to move ${diffAmount} to a pot`);
  const result = await moveMoneyToPot(userConfig, diffAmount, tx.id);

  console.log(`\nSUCCESS: Moved £${(diffAmount / 100).toFixed(2)} to pot!`, result);

  return true;
}

function tryParse<T>(data: string): T | null {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.log('Failed to parse data: "' + data + '"', e);
    return null;
  }
}

export = {
  webhook: aws.wrap(onWebhook),
  login: aws.wrap(onLogin),
  setup: aws.wrap(onSetup)
};
