import { aws, HandlerRequest, HandlerResponse } from 'serverless-api-handlers';
import { config } from './config/config';
import { v4 as uuid } from 'uuid';
import { exchangeAuthCode } from './monzo';

async function onWebhook(request: HandlerRequest): Promise<HandlerResponse> {
  // TODO: Get Monzo Types and respond to webhook
  console.log(request);
  return {
    statusCode: 200
  };
}

async function onLogin(request: HandlerRequest): Promise<HandlerResponse> {
  const loginUrl = `${config.apiRoot}/login`;

  if (request.queryParameters.hasOwnProperty('code') && request.queryParameters.hasOwnProperty('state')) {
    const userConfig = await exchangeAuthCode(request.queryParameters.code as string, loginUrl);

    console.log('New config', userConfig);

    return {
      statusCode: 302,
      headers: {
        'Location': `${loginUrl}?userId
      }
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

export = {
  webhook: aws.wrap(onWebhook),
  login: aws.wrap(onLogin)
};
