type UNKNOWN = any;
export type ISO_8601 = string;

export interface Transaction {
  id: string;
  created: ISO_8601;
  description: string;
  account_id: string;

  amount: number; // positive for money in, negative for money out
  currency: string; // Account currency
  local_amount: number; // Amount in currency spent
  local_currency: string; // Currency spent
  fees: UNKNOWN; // {};

  merchant: string | null; // merchant ID or null

  notes: string;
  metadata: {
    notes?: string;

    p2p_transfer_id?: 'p2p_00009UTHitHwLGhT8brCtN';

    // Card Auth Transaction
    hide_amount?: 'true' | 'false';
    hide_transaction?: 'true' | 'false';

    // Mastercard Transaction
    mastercard_auth_message_id?: string;
    mastercard_lifecycle_id?: string;

    // Android Pay transaction
    token_transaction_identifier?: string;
    token_unique_reference?: string;
    tokenization_method?: 'android_pay' | string;

    // Pot transaction
    pot_id: 'pot_00009RFJywRvhJ5s1J5lxJ';

    [key: string]: string;
  };
  labels: UNKNOWN; // null;
  account_balance: number; // 0; // No idea what this is
  attachments: UNKNOWN[]; // Mostly empty
  category: 'general' | 'eating_out' | 'expenses' | 'transport' | 'cash' | 'bills' | 'entertainment' | 'shopping' | 'holidays' | 'groceries';
  is_load: boolean;
  settled: ISO_8601 | '';
  updated: ISO_8601;
  counterparty: {} | {
    // For internal transactions
    number: '+447531957701';
    user_id: 'user_00009Fxo5jjyL2xD038wE5';
  };
  scheme: 'p2p_payment' | 'uk_retail_pot' | 'mastercard';
  dedupe_id: string;
  originator: boolean;
  include_in_spending: boolean;
}
