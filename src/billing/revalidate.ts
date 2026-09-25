import 'server-only';
import { revalidatePath } from 'next/cache';

export function revalidateBilling() {
  revalidatePath('/(finance)', 'layout');
}
