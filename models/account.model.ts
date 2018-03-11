interface BaseAccount {
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

export function isPrepaidAccount(account: Account): account is PrepaidAccount {
  return account.type === 'uk_prepaid';
}

export function isRetailAccount(account: Account): account is RetailAccount {
  return account.type === 'uk_retail';
}
