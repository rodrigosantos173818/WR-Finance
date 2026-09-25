type AuthFailure = { code?: string; status?: number };

export function authErrorMessage(error: AuthFailure, fallback: string) {
  switch (error.code) {
    case 'email_not_confirmed':
      return 'Confirme seu e-mail antes de entrar. Se não recebeu a mensagem, use Reenviar confirmação abaixo.';
    case 'email_address_not_authorized':
      return 'O serviço de e-mail ainda não está habilitado para enviar a este endereço. Entre em contato com o suporte para concluir a configuração de envio.';
    case 'over_email_send_rate_limit':
      return 'O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente. Se persistir, entre em contato com o suporte.';
    case 'over_request_rate_limit':
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
    case 'email_address_invalid':
      return 'Confira o endereço de e-mail informado.';
    case 'signup_disabled':
      return 'Novos cadastros estão temporariamente indisponíveis. Entre em contato com o suporte.';
    case 'weak_password':
      return 'Escolha uma senha mais forte, com pelo menos 10 caracteres.';
    default:
      if (error.status === 429)
        return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
      if (error.status && error.status >= 500)
        return 'O serviço de acesso não conseguiu concluir a solicitação. Tente novamente mais tarde. Se persistir, entre em contato com o suporte.';
      return fallback;
  }
}

export function reportAuthError(operation: string, error: AuthFailure) {
  // Never log credentials, addresses, tokens or the provider's raw message.
  console.error('[auth]', { operation, code: error.code ?? 'unknown', status: error.status });
}
