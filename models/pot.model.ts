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
