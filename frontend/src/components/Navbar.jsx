import React from 'react';

export default function Navbar({ user, onLogout, onOpenAdmin, currentView, onOpenAuth }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
            </svg>
          </div>
          <div className="brand-info">
            <h1>Tom Hanks Cine</h1>
            <span>Catálogo &amp; Persistência — Prof. @siriani</span>
          </div>
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <div className="user-badge" title={`Logado como: ${user.email} (${user.papel || 'usuario'})`}>
                <div className="user-avatar">
                  {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <span style={{ fontWeight: 600 }}>{user.nome}</span>
                <span className={`role-badge role-${user.papel || 'usuario'}`}>
                  {user.papel === 'admin' ? '🛡️ Admin' : user.papel === 'premium' ? '⭐ Premium' : '👤 Usuário'}
                </span>
              </div>

              {/* BOTÃO EXCLUSIVO DE ADMIN: Acessa painel com todos os usuários e comentários */}
              {user.papel === 'admin' && (
                <button
                  className={`btn-admin-nav ${currentView === 'admin' ? 'active' : ''}`}
                  onClick={onOpenAdmin}
                  title="Painel de Administração (Gerenciar usuários e comentários)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <span>{currentView === 'admin' ? 'Ver Catálogo' : 'Painel Admin'}</span>
                </button>
              )}

              <button className="btn-logout" onClick={onLogout} title="Encerrar sessão">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Sair</span>
              </button>
            </>
          ) : (
            <div className="guest-nav-controls">
              <span className="guest-mode-badge" title="Você está visualizando a prévia do catálogo">
                ✨ Modo Degustação
              </span>

              <button
                className="btn-guest-nav-login"
                onClick={() => onOpenAuth('login')}
                title="Acessar com sua conta existente"
              >
                Entrar
              </button>

              <button
                className="btn-guest-nav-register"
                onClick={() => onOpenAuth('register')}
                title="Cadastrar gratuitamente"
              >
                Criar Conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
