import type { SubscriptionAccess } from './types.ts';

export function trialMessage(access: SubscriptionAccess) {
  if (!access.available)
    return 'Não foi possível verificar sua assinatura. Seus dados continuam disponíveis para consulta.';
  if (access.status === 'past_due')
    return 'Há um problema com o pagamento. Atualize sua assinatura para liberar todas as funcionalidades.';
  if (access.status === 'canceled')
    return access.canWrite
      ? `Assinatura cancelada. Acesso completo até ${billingDate(access.currentPeriodEnd)}.`
      : 'O período pago terminou. Seus dados continuam disponíveis para consulta.';
  if (access.status === 'expired')
    return `${access.currentPeriodEnd ? 'Seu período pago terminou.' : 'Seu período gratuito terminou.'} Seus dados continuam seguros e disponíveis para consulta.`;
  if (access.status === 'active') return 'Sua assinatura WR Finance Pro está ativa.';
  if (access.trialCalendarDays === 0) return 'Seu período gratuito termina hoje.';
  if (access.trialCalendarDays === 1) return 'Seu teste gratuito termina amanhã.';
  if (access.daysRemaining <= 7)
    return `Seu teste gratuito termina em ${access.daysRemaining} dias.`;
  return `Você está no período gratuito do WR Finance Pro. Restam ${access.daysRemaining} dias.`;
}
export function billingDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value))
    : '—';
}
export const statusLabels = {
  trialing: 'Teste gratuito',
  active: 'Ativo',
  past_due: 'Problema com pagamento',
  canceled: 'Cancelado',
  expired: 'Modo somente leitura',
};
export const planFeatures = [
  'Dashboard financeiro',
  'Entradas e despesas',
  'Contas a pagar e a receber',
  'Transferências',
  'Gestão de contas',
  'Clientes e categorias',
  'Relatórios',
  'Histórico financeiro',
  'Atualizações futuras',
];
