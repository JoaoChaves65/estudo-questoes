import { useState, type FormEvent } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
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
      const r = await fetch('/api/auth/register', {
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
        setErro(data.error ?? 'Não foi possível criar conta.');
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
      titulo="Registo"
      subtitulo="Crie conta com e-mail e senha. Mínimo 8 caracteres."
      acoes={
        <Link to="/" className="button button--secondary">
          Início
        </Link>
      }
    >
      <section className="card stack-form">
        <form className="stack-form" onSubmit={handleSubmit}>
          <label htmlFor="reg-email">E-mail</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            required
          />
          <label htmlFor="reg-password">Senha</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            minLength={8}
            required
          />
          {erro ? <p className="error-text">{erro}</p> : null}
          <button type="submit" className="button" disabled={pending}>
            {pending ? 'A registar…' : 'Registar'}
          </button>
        </form>
        <p className="muted" style={{ margin: 0 }}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </Layout>
  );
}
