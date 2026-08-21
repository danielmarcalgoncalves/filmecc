import React from 'react';

export default function Navbar({ user, onLogout }) {
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
          {user && (
            <div className="user-badge" title={`Logado como: ${user.email}`}>
              <div className="user-avatar">
                {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontWeight: 600 }}>{user.nome}</span>
            </div>
          )}

          <button className="btn-logout" onClick={onLogout} title="Encerrar sessão">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
