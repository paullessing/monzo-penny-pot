import axios from 'axios';
import { config } from './config/config';
import * as querystring from 'querystring';

export const TOKEN_URL = 'https://api.monzo.com/oauth2/token';

export interface AuthResult {
  access_token: string,
  client_id: string,
  expires_in: number,
  refresh_token: string,
  token_type: string,
  user_id: string
}

export async function getAuthToken(): Promise<string> {
  const result = await axios.post<AuthResult>(TOKEN_URL, querystring.stringify({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken
  }));

  return result.data.access_token;
}
