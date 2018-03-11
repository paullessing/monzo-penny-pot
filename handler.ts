import { aws, HandlerRequest, HandlerResponse } from 'serverless-api-handlers';
import { config } from './config/config';
import { v4 as uuid } from 'uuid';
import { exchangeAuthCode, getAccounts, getPots, registerWebhook } from './monzo';
import settingsHtml from './settings.html';
import * as querystring from 'querystring';
import { getUserConfig, setUserConfig } from './database';
import { Account, Pot } from './models';

async function onWebhook(request: HandlerRequest): Promise<HandlerResponse> {
  // TODO: Get Monzo Types and respond to webhook
  console.log(request);
  return {
    statusCode: 200
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

export = {
  webhook: aws.wrap(onWebhook),
  login: aws.wrap(onLogin),
  setup: aws.wrap(onSetup)
};
