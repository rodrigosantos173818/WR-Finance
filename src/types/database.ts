// RPC contract for the committed migrations. Regenerate Supabase types when evolving the schema.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'cancelled';
export type AccountType = 'bank' | 'cash' | 'pix' | 'wallet' | 'card' | 'other';
export type PaymentMethod =
  'pix' | 'cash' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'boleto' | 'other';
type Rpc<Args, Returns> = { Args: Args; Returns: Returns };
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      get_subscription_access: Rpc<{ p_org: string }, Json>;
      begin_billing_checkout: Rpc<{ p_org: string }, Json>;
      billing_set_customer: Rpc<
        { p_org: string; p_provider: string; p_customer: string },
        undefined
      >;
      billing_save_checkout: Rpc<
        { p_org: string; p_key: string; p_session: string; p_url: string },
        undefined
      >;
      claim_billing_event: Rpc<
        { p_org: string; p_provider: string; p_event_id: string; p_event_type: string },
        Json
      >;
      release_billing_event: Rpc<{ p_org: string; p_token: string }, undefined>;
      apply_billing_event: Rpc<
        { p_org: string; p_token: string; p_event_id: string; p_snapshot: Json },
        undefined
      >;
      get_my_organizations: Rpc<Record<string, never>, Json>;
      create_organization: Rpc<{ p_name: string }, string>;
      create_account: Rpc<
        {
          p_org: string;
          p_name: string;
          p_type: AccountType;
          p_opening_balance: string;
          p_opening_date: string;
        },
        string
      >;
      create_transaction: Rpc<
        {
          p_org: string;
          p_account: string;
          p_category: string;
          p_client: string | null;
          p_type: TransactionType;
          p_description: string;
          p_amount: string;
          p_competence_date: string;
          p_due_date: string;
          p_paid_at: string | null;
          p_status: TransactionStatus;
          p_payment_method: PaymentMethod;
          p_is_fixed: boolean;
          p_notes: string | null;
        },
        string
      >;
      settle_transaction: Rpc<
        {
          p_org: string;
          p_transaction: string;
          p_account: string;
          p_paid_at: string;
          p_payment_method: PaymentMethod;
        },
        undefined
      >;
      create_transfer: Rpc<
        {
          p_org: string;
          p_from: string;
          p_to: string;
          p_amount: string;
          p_date: string;
          p_notes: string | null;
        },
        string
      >;
      get_dashboard: Rpc<
        { p_org: string; p_start: string; p_end: string; p_chart_months: number },
        Json
      >;
      get_transaction_details: Rpc<
        {
          p_org: string;
          p_start: string;
          p_end: string;
          p_type: TransactionType | null;
          p_category: string | null;
          p_pending: boolean;
          p_offset?: number;
        },
        Json
      >;
    };
    Enums: {
      subscription_status: import('../billing/types').SubscriptionStatus;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      account_type: AccountType;
      payment_method: PaymentMethod;
      member_role: 'owner' | 'admin' | 'member';
    };
    CompositeTypes: Record<string, never>;
  };
};
