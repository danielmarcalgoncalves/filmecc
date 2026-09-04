import React from 'react';

export default function Navbar({
  user,
  onLogout,
  onOpenAdmin,
  currentView,
  onOpenAuth,
  activeTab = 'all',
  onSelectTab,
  searchQuery = '',
  setSearchQuery,
  onHome
}) {
  return (
    <header className="cinefilia-navbar">
      <div className="cinefilia-navbar-inner">
        {/* Logo Cinefilia com 3 círculos característicos */}
        <button
          type="button"
          className="cinefilia-brand cth-brand"
          onClick={onHome ? onHome : () => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Catálogo Tom Hanks — Início"
        >
          <div className="brand-dots">
            <span className="dot-orange" />
            <span className="dot-green" />
            <span className="dot-blue" />
          </div>
          <span className="brand-text-cth">CTH</span>
          <span className="brand-subtext-cth">(Catálogo Tom Hanks)</span>
        </button>

        {/* Links / Abas Rápidas no Menu Superior */}
        <nav className="cinefilia-nav-links">
          <button
            type="button"
            className={`nav-link ${activeTab === 'all' && currentView === 'catalog' ? 'active' : ''}`}
            onClick={() => onSelectTab && onSelectTab('all')}
          >
            Filmes
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => onSelectTab && onSelectTab('favorites')}
          >
            Meus Favoritos
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => onSelectTab && onSelectTab('comments')}
          >
            Comentados
          </button>
        </nav>

        {/* Campo de Busca em Pílula */}
        <div className="cinefilia-search-wrapper">
          <svg className="search-icon-svg" width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar filmes, papéis, anos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            className="search-input-pill"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery && setSearchQuery('')}
              title="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        {/* Ações do Usuário ou Modo Visitante */}
        <div className="cinefilia-actions">
          {user ? (
            <>
              {/* Botão Painel Admin (RBAC) */}
              {user.papel === 'admin' && (
                <button
                  type="button"
                  className={`btn-admin-pill ${currentView === 'admin' ? 'active' : ''}`}
                  onClick={onOpenAdmin}
                  title="Painel de Administração"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>{currentView === 'admin' ? 'Catálogo' : 'Painel'}</span>
                </button>
              )}

              {/* Avatar e Perfil */}
              <div className="user-profile-badge" title={`Logado como: ${user.email}`}>
                <div className="user-avatar-circle">
                  {user.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-display-name">{user.nome}</span>
                <span className={`role-tag role-${user.papel || 'usuario'}`}>
                  {user.papel === 'admin' ? 'Admin' : user.papel === 'premium' ? 'Premium' : 'Membro'}
                </span>
              </div>

              {/* Botão Sair */}
              <button
                type="button"
                className="btn-cinefilia-logout"
                onClick={onLogout}
                title="Encerrar sessão"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Sair</span>
              </button>
            </>
          ) : (
            <div className="guest-nav-group">
              <button
                type="button"
                className="btn-nav-login"
                onClick={() => onOpenAuth && onOpenAuth('login')}
              >
                Entrar
              </button>
              <button
                type="button"
                className="btn-nav-register"
                onClick={() => onOpenAuth && onOpenAuth('register')}
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
