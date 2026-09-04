import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

<<<<<<< HEAD
export default function AuthModal({ onAuthSuccess, onShowToast }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot' | 'verify'
=======
export default function AuthModal({ onAuthSuccess, onShowToast, initialTab = 'login', onClose }) {
  const [tab, setTab] = useState(initialTab || 'login'); // 'login' | 'register'
>>>>>>> b909f54 (Adição de pagina visitante, onde não precisa de cadastro)
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);

<<<<<<< HEAD
  // Timer de 15 minutos (900 segundos) para o código OTP
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (tab === 'verify' && timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tab, timerActive, timeLeft]);

  // Formata os segundos em formato MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
=======
  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
      setError(null);
    }
  }, [initialTab]);
>>>>>>> b909f54 (Adição de pagina visitante, onde não precisa de cadastro)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const data = await api.auth.login(email, senha);
        onShowToast(`Bem-vindo de volta, ${data.usuario.nome}!`, 'success');
        onAuthSuccess(data.usuario);
      } else if (tab === 'register') {
        if (!nome.trim()) {
          throw new Error('Por favor, informe o seu nome.');
        }
        const data = await api.auth.register(nome, email, senha);
        if (data.requireVerification) {
          setCodigo('');
          setTimeLeft(15 * 60);
          setTimerActive(true);
          setTab('verify');
          onShowToast(data.message || 'Código de 6 dígitos enviado para seu e-mail!', 'info');
        } else if (data.usuario) {
          onShowToast(`Conta criada com sucesso! Olá, ${data.usuario.nome}!`, 'success');
          onAuthSuccess(data.usuario);
        }
      } else if (tab === 'forgot') {
        const data = await api.auth.forgotPassword(email);
        onShowToast(data.message || 'Se o e-mail existir, um link de recuperação foi enviado.', 'success');
        setTab('login');
      }
    } catch (err) {
      if (err.requireVerification) {
        setCodigo('');
        setTimeLeft(15 * 60);
        setTimerActive(true);
        setTab('verify');
        setError(err.message);
      } else {
        setError(err.message || 'Ocorreu um erro na autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (codigo.trim().length !== 6) {
      setError('Por favor, digite o código completo de 6 dígitos.');
      return;
    }
    if (timeLeft === 0) {
      setError('O prazo de 15 minutos expirou. Clique em "Reenviar Novo Código" abaixo.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await api.auth.verifyCode(email, codigo.trim());
      onShowToast(data.message || 'E-mail confirmado com sucesso!', 'success');
      onAuthSuccess(data.usuario);
    } catch (err) {
      setError(err.message || 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResending(true);
    try {
      const data = await api.auth.resendCode(email);
      setCodigo('');
      setTimeLeft(15 * 60);
      setTimerActive(true);
      onShowToast(data.message || 'Novo código enviado com sucesso para seu e-mail!', 'success');
    } catch (err) {
      setError(err.message || 'Falha ao reenviar código.');
    } finally {
      setResending(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="auth-page-backdrop">
      <div className="auth-card">
        {tab !== 'verify' ? (
          <>
            <div className="auth-header">
              <div className="auth-brand-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                </svg>
              </div>
              <h2>Catálogo de Filmes</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Especial Filmografia Tom Hanks
              </p>
=======
    <div className="auth-page-backdrop" onClick={onClose ? onClose : undefined}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button
            type="button"
            className="auth-modal-close"
            onClick={onClose}
            title="Fechar e continuar explorando"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        <div className="auth-header">
          <div className="auth-brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
            </svg>
          </div>
          <h2>Catálogo de Filmes</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Especial Filmografia Tom Hanks
          </p>
        </div>

        <div className="auth-tabs" style={{ display: tab === 'forgot' ? 'none' : 'flex' }}>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(null); }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(null); }}
          >
            Criar Conta
          </button>
        </div>

        {tab === 'forgot' && (
          <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Digite seu e-mail cadastrado para receber um link de recuperação.
          </div>
        )}

        {error && (
          <div className="alert-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="input-nome">Seu Nome Completo</label>
              <input
                id="input-nome"
                type="text"
                className="form-input"
                placeholder="Ex: Forrest Gump"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
>>>>>>> b909f54 (Adição de pagina visitante, onde não precisa de cadastro)
            </div>

            <div className="auth-tabs" style={{ display: tab === 'forgot' ? 'none' : 'flex' }}>
              <button
                type="button"
                className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                onClick={() => { setTab('login'); setError(null); }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                onClick={() => { setTab('register'); setError(null); }}
              >
                Criar Conta
              </button>
            </div>

            {tab === 'forgot' && (
              <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Digite seu e-mail cadastrado para receber um link de recuperação.
              </div>
            )}

            {error && (
              <div className="alert-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {tab === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="input-nome">Seu Nome Completo</label>
                  <input
                    id="input-nome"
                    type="text"
                    className="form-input"
                    placeholder="Ex: Forrest Gump"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="input-email">E-mail</label>
                  {tab === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => { setTab('forgot'); setError(null); }} 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <input
                  id="input-email"
                  type="email"
                  className="form-input"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {tab !== 'forgot' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="input-senha">Senha</label>
                  <input
                    id="input-senha"
                    type="password"
                    className="form-input"
                    placeholder="Mínimo 4 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn-auth-submit" disabled={loading}>
                {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar no Catálogo' : tab === 'register' ? 'Criar Conta e Confirmar E-mail' : 'Enviar Link de Recuperação'}
              </button>
              
              {tab === 'forgot' && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button 
                    type="button" 
                    className="auth-tab-btn" 
                    style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
                    onClick={() => { setTab('login'); setError(null); }}
                  >
                    Voltar para o Login
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          /* TELA DE VERIFICAÇÃO OTP COM TIMER DE 15 MINUTOS */
          <div className="otp-container">
            <div className="otp-card-header">
              <div className="otp-icon-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Confirme seu E-mail
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Enviamos um código de 6 dígitos para:
                <br />
                <span className="otp-target-email">{email}</span>
              </p>
            </div>

            {/* CRONÔMETRO REGRESSIVO DE 15 MINUTOS */}
            <div className={`otp-timer-badge ${timeLeft < 120 ? 'timer-warning' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>
                {timeLeft > 0 ? (
                  <>Código expira em: <strong>{formatTime(timeLeft)}</strong></>
                ) : (
                  <strong style={{ color: 'var(--accent-red)' }}>Código expirado!</strong>
                )}
              </span>
            </div>

            {error && (
              <div className="alert-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerifySubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="input-codigo" style={{ textAlign: 'center', display: 'block' }}>
                  Código de 6 Dígitos
                </label>
                <input
                  id="input-codigo"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  className="form-input otp-input"
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-auth-submit" 
                disabled={loading || codigo.trim().length !== 6 || timeLeft === 0}
              >
                {loading ? 'Verificando...' : 'Confirmar e Entrar no Catálogo'}
              </button>
            </form>

            <div className="otp-actions">
              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResendCode}
                disabled={resending || loading}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                {resending ? 'Enviando novo código...' : 'Não recebeu? Reenviar Código'}
              </button>

              <button
                type="button"
                className="otp-back-btn"
                onClick={() => { setTab('login'); setError(null); }}
              >
                Voltar para o Login
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer-note">
          🔒 Validação de e-mail e segregação de dados ativas.
          <br />
          <span style={{ opacity: 0.8 }}>Disciplina de Computação em Nuvem — Prof. <strong>@siriani</strong></span>
        </div>
      </div>
    </div>
  );
}
