import React, { useState } from 'react';
import { api } from '../services/api';

export default function AuthModal({ onAuthSuccess, onShowToast }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const data = await api.auth.login(email, senha);
        onShowToast(`Bem-vindo de volta, ${data.usuario.nome}!`, 'success');
        onAuthSuccess(data.usuario);
      } else {
        if (!nome.trim()) {
          throw new Error('Por favor, informe o seu nome.');
        }
        const data = await api.auth.register(nome, email, senha);
        onShowToast(`Conta criada com sucesso! Olá, ${data.usuario.nome}!`, 'success');
        onAuthSuccess(data.usuario);
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-backdrop">
      <div className="auth-card">
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

        <div className="auth-tabs">
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
            <label className="form-label" htmlFor="input-email">E-mail</label>
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

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Aguarde...' : tab === 'login' ? 'Entrar no Catálogo' : 'Cadastrar e Acessar'}
          </button>
        </form>

        <div className="auth-footer-note">
          🔒 Segregação de dados ativa: cada usuário possui seus próprios favoritos e comentários isolados.
          <br />
          <span style={{ opacity: 0.8 }}>Disciplina de Computação em Nuvem — Prof. <strong>@siriani</strong></span>
        </div>
      </div>
    </div>
  );
}
