import { ChevronDown } from 'lucide-react';

/**
 * Painel compacto no hero da home quando não há sessão.
 * Fechado só mostra o rótulo; abrir revela o texto completo (detalhes nativo HTML).
 */
export function HomeGuestModeChip() {
  return (
    <details className="home-guest-chip">
      <summary className="home-guest-chip__summary">
        <span className="home-guest-chip__label">Modo convidado</span>
        <ChevronDown className="home-guest-chip__chevron" size={16} aria-hidden />
      </summary>
      <div className="home-guest-chip__painel muted" role="region" aria-live="polite">
        <p className="home-guest-chip__texto">
          Você está sem login: suas disciplinas, SRS e dados de estudo ficam apenas neste navegador até você limpar dados do site
          ou trocar de aparelho. Para guardar cópias, use Exportar no menu.
        </p>
        <p className="home-guest-chip__texto">
          Para sincronizar com a conta na nuvem (e o chat IA com histórico), abra <strong>Menu</strong> na barra ao lado e, na seção{' '}
          <strong>Conta</strong>, escolha <strong>Entrar</strong> ou <strong>Cadastrar</strong>.
        </p>
      </div>
    </details>
  );
}
