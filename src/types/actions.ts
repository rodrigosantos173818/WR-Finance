export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?:
        | 'SUBSCRIPTION_REQUIRED'
        | 'BILLING_UNAVAILABLE'
        | 'BILLING_NOT_CONFIGURED'
        | 'BILLING_ERROR'
        | 'FORBIDDEN';
    };
