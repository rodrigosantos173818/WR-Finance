import { getBillingProvider } from '@/billing/provider-server';
import { BillingProviderError } from '@/billing/provider';
import { createBillingEventStore } from '@/billing/event-store';
import { synchronizeBilling } from '@/billing/webhook-service';
import { revalidateBilling } from '@/billing/revalidate';

export const runtime = 'nodejs';
const MAX_BODY = 1024 * 1024;
async function rawBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new BillingProviderError('INVALID_BODY');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > MAX_BODY) {
        await reader.cancel();
        throw new BillingProviderError('BODY_TOO_LARGE');
      }
      chunks.push(result.value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } finally {
    reader.releaseLock();
  }
}
export async function POST(request: Request) {
  try {
    const provider = getBillingProvider();
    const event = provider.verifyWebhook(
      await rawBody(request),
      request.headers.get('stripe-signature'),
    );
    if (!event) return Response.json({ received: true });
    const result = await synchronizeBilling(provider, createBillingEventStore(), event);
    if (!result.ignored && !result.duplicate) revalidateBilling();
    return Response.json({ received: true });
  } catch (error) {
    const code = error instanceof BillingProviderError ? error.code : 'WEBHOOK_PROCESSING_FAILED';
    console.warn('billing.webhook_rejected', { code });
    const status =
      code === 'BODY_TOO_LARGE'
        ? 413
        : ['INVALID_SIGNATURE', 'INVALID_EVENT_MODE', 'INVALID_BODY'].includes(code)
          ? 400
          : 503;
    return Response.json({ error: status === 503 ? 'Retry later' : 'Invalid webhook' }, { status });
  }
}
