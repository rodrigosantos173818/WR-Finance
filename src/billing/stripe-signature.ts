import { createHmac, timingSafeEqual } from 'node:crypto';
import { BillingProviderError } from './provider.ts';

export function verifyStripeSignature(
  raw: string,
  signature: string | null,
  secret: string,
  now = Date.now(),
) {
  const parts = signature?.split(',').map((part) => part.trim()) ?? [];
  const times = parts.filter((part) => part.startsWith('t='));
  if (times.length !== 1 || !/^t=\d+$/.test(times[0]))
    throw new BillingProviderError('INVALID_SIGNATURE');
  const timestamp = Number(times[0].slice(2));
  if (!Number.isSafeInteger(timestamp) || Math.abs(now / 1000 - timestamp) > 300)
    throw new BillingProviderError('INVALID_SIGNATURE');
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest();
  const valid = parts
    .filter((part) => /^v1=[a-f0-9]{64}$/.test(part))
    .some((part) => timingSafeEqual(expected, Buffer.from(part.slice(3), 'hex')));
  if (!valid) throw new BillingProviderError('INVALID_SIGNATURE');
}
