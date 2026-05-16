import { useState, type FormEvent } from 'react';

import { Link, Navigate } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export function AccountPage() {
  const { user, loading: authLoading, refresh, setUserFromCredentials } = useAuth();

  const [loginNovo, setLoginNovo] = useState('');
  const [senhaAtualLogin, setSenhaAtualLogin] = useState('');

  const [senhaNova, setSenhaNova] = useState('');
  const [senhaNovaConfirmacao, setSenhaNovaConfirmacao] = useState('');
  const [senhaAtualSenha, setSenhaAtualSenha] = useState('');

  const [erroLogin, setErroLogin] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [mensagemLogin, setMensagemLogin] = useState('');
  const [mensagemSenha, setMensagemSenha] = useState('');
  const [pendingLogin, setPendingLogin] = useState(false);
  const [pendingSenha, setPendingSenha] = useState(false);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  const handleAlterarLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErroLogin('');
    setMensagemLogin('');
    const trimmed = loginNovo.trim();
    if (!trimmed) {
      setErroLogin('Informe o novo e-mail ou nome de usuário.');
      return;
    }
    const atualLogin = user?.email;
    if (!atualLogin) {
      setErroLogin('Aguarde o carregamento da sessão.');
      return;
    }
    if (normalizeLogin(trimmed) === normalizeLogin(atualLogin)) {
      setErroLogin('O novo valor é igual ao atual.');
      return;
    }
    if (!senhaAtualLogin) {
      setErroLogin('Informe a senha atual.');
      return;
    }
    setPendingLogin(true);
    try {
      const r = await fetch('/api/auth/update-account', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: senhaAtualLogin,
          email: trimmed,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        error?: string;
        user?: { id: string; email: string };
      };
      if (!r.ok) {
        setErroLogin(data.error ?? 'Não foi possível atualizar.');
        return;
      }
      if (data.user?.id && data.user.email) {
        setUserFromCredentials(data.user);
      } else {
        await refresh();
      }
      setMensagemLogin('Login atualizado.');
      setLoginNovo('');
      setSenhaAtualLogin('');
    } catch {
      setErroLogin('Falha de rede. Tente novamente.');
    } finally {
      setPendingLogin(false);
    }
  };

  const handleAlterarSenha = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErroSenha('');
    setMensagemSenha('');
    if (!senhaAtualSenha) {
      setErroSenha('Informe a senha atual.');
      return;
    }
    if (senhaNova.length < 8) {
      setErroSenha('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (senhaNova !== senhaNovaConfirmacao) {
      setErroSenha('Nova senha e confirmação não coincidem.');
      return;
    }
    setPendingSenha(true);
    try {
      const r = await fetch('/api/auth/update-account', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: senhaAtualSenha,
          newPassword: senhaNova,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setErroSenha(data.error ?? 'Não foi possível alterar a senha.');
        return;
      }
      setMensagemSenha('Senha atualizada.');
      setSenhaNova('');
      setSenhaNovaConfirmacao('');
      setSenhaAtualSenha('');
    } catch {
      setErroSenha('Falha de rede. Tente novamente.');
    } finally {
      setPendingSenha(false);
    }
  };

  return (
    <Layout
      titulo="Conta"
      subtitulo="Atualize o e-mail/nome de usuário ou a senha. Em ambos os casos você precisa confirmar com a senha atual."
      acoes={
        <Link to="/" className="button button--secondary">
          Voltar ao painel
        </Link>
      }
    >
      {authLoading || !user ? (
        <p className="muted">Carregando…</p>
      ) : (
        <>
          <section className="card">
            <h2>Dados da conta</h2>
            <p className="muted conta-dados-intro">
              Você entra com este e-mail ou nome de usuário (o mesmo valor em “Entrar” na home).
            </p>
            <p className="conta-login-atual">
              <strong>{user.email}</strong>
            </p>
          </section>

          <section className="card stack-form">
            <h2>Alterar login</h2>
            <form className="stack-form" onSubmit={(e) => void handleAlterarLogin(e)}>
              <label htmlFor="conta-login-novo">Novo e-mail ou usuário</label>
              <input
                id="conta-login-novo"
                type="text"
                autoComplete="username"
                spellCheck={false}
                value={loginNovo}
                onChange={(e) => setLoginNovo(e.target.value)}
                disabled={pendingLogin}
                required
                minLength={3}
              />
              <label htmlFor="conta-senha-atual-login">Senha atual</label>
              <input
                id="conta-senha-atual-login"
                type="password"
                autoComplete="current-password"
                value={senhaAtualLogin}
                onChange={(e) => setSenhaAtualLogin(e.target.value)}
                disabled={pendingLogin}
                required
              />
              {erroLogin ? <p className="error-text">{erroLogin}</p> : null}
              {mensagemLogin ? <p className="success-text">{mensagemLogin}</p> : null}
              <button type="submit" className="button" disabled={pendingLogin}>
                {pendingLogin ? 'Salvando…' : 'Salvar login'}
              </button>
            </form>
          </section>

          <section className="card stack-form">
            <h2>Alterar senha</h2>
            <form className="stack-form" onSubmit={(e) => void handleAlterarSenha(e)}>
              <label htmlFor="conta-senha-atual">Senha atual</label>
              <input
                id="conta-senha-atual"
                type="password"
                autoComplete="current-password"
                value={senhaAtualSenha}
                onChange={(e) => setSenhaAtualSenha(e.target.value)}
                disabled={pendingSenha}
                required
              />
              <label htmlFor="conta-senha-nova">Nova senha</label>
              <input
                id="conta-senha-nova"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                disabled={pendingSenha}
                required
              />
              <label htmlFor="conta-senha-nova2">Confirmar nova senha</label>
              <input
                id="conta-senha-nova2"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={senhaNovaConfirmacao}
                onChange={(e) => setSenhaNovaConfirmacao(e.target.value)}
                disabled={pendingSenha}
                required
              />
              {erroSenha ? <p className="error-text">{erroSenha}</p> : null}
              {mensagemSenha ? <p className="success-text">{mensagemSenha}</p> : null}
              <button type="submit" className="button" disabled={pendingSenha}>
                {pendingSenha ? 'Salvando…' : 'Atualizar senha'}
              </button>
            </form>
          </section>
        </>
      )}
    </Layout>
  );
}

/** Compara como no servidor (`normalizeLoginIdentifier`). */
function normalizeLogin(raw: string): string {
  try {
    return raw.normalize('NFKC').trim().toLocaleLowerCase('pt-BR');
  } catch {
    return raw.trim().toLowerCase();
  }
}
