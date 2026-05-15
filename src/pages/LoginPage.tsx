import { useState, type FormEvent } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUserFromCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErro('');
    setPending(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as {
        user?: { id: string; email: string };
        error?: string;
      };
      if (!r.ok) {
        setErro(data.error ?? 'Não foi possível iniciar sessão.');
        return;
      }
      if (data.user?.id && data.user.email) {
        setUserFromCredentials(data.user);
      }
      navigate('/', { replace: true });
    } catch {
      setErro('Falha de rede. Tente novamente.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Layout
      titulo="Entrar"
      subtitulo="Inicie sessão para sincronizar a conversa de IA entre dispositivos."
      acoes={
        <Link to="/" className="button button--secondary">
          Início
        </Link>
      }
    >
      <section className="card stack-form">
        <form className="stack-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            required
          />
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            required
          />
          {erro ? <p className="error-text">{erro}</p> : null}
          <button type="submit" className="button" disabled={pending}>
            {pending ? 'A entrar…' : 'Entrar'}
          </button>
        </form>
        <p className="muted" style={{ margin: 0 }}>
          Ainda não tem conta?{' '}
          <Link to="/registo">Registar</Link>
        </p>
      </section>
    </Layout>
  );
}
