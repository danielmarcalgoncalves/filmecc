import React, { useState } from 'react';
import { api } from '../services/api';

export default function ResetPasswordModal({ token, onSuccess, onShowToast }) {
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (senha.length < 4) {
      setError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await api.auth.resetPassword(token, senha);
      onShowToast('Senha alterada com sucesso! Você já pode fazer login.', 'success');
      onSuccess();
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao redefinir a senha. O link pode ter expirado.');
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
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </div>
          <h2>Redefinir Senha</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Crie uma nova senha para acessar sua conta.
          </p>
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
          <div className="form-group">
            <label className="form-label" htmlFor="input-new-senha">Nova Senha</label>
            <input
              id="input-new-senha"
              type="password"
              className="form-input"
              placeholder="Mínimo 4 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Aguarde...' : 'Salvar Nova Senha'}
          </button>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button 
            type="button" 
            className="auth-tab-btn" 
            style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
            onClick={onSuccess}
          >
            Voltar para o Login
          </button>
        </div>

      </div>
    </div>
  );
}
