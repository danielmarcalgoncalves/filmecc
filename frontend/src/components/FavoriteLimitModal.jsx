import React, { useEffect } from 'react';

/**
 * FavoriteLimitModal
 * Janela modal (popup) exibida quando o usuário comum ou premium
 * atinge sua cota máxima de filmes favoritados (curtidas).
 */
export default function FavoriteLimitModal({
  isOpen,
  user,
  limit = 5,
  role = 'usuario',
  movieTitle = '',
  onClose,
  onGoToProfile
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCommon = role === 'usuario';
  const displayLimit = limit || (isCommon ? 5 : 20);
  const roleName = isCommon ? 'Usuário Comum' : 'Usuário Premium';

  return (
    <div className="modal-backdrop-fav-limit" onClick={onClose}>
      <div className="modal-card-fav-limit animate-pop-in" onClick={(e) => e.stopPropagation()}>
        {/* Botão de Fechar no Topo */}
        <button className="modal-close-fav-limit" onClick={onClose} title="Fechar aviso">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Ícone Animado de Limite de Curtidas */}
        <div className="fav-limit-icon-container">
          <div className="fav-limit-icon-circle">
            <span className="fav-limit-main-icon">❤️</span>
            <span className="fav-limit-badge-lock">🔒</span>
          </div>
        </div>

        {/* Badge Superior */}
        <div className="fav-limit-status-badge">
          <span className="fav-limit-dot-pulse"></span>
          <span>COTA MÁXIMA ATINGIDA</span>
        </div>

        {/* Título Principal */}
        <h2 className="fav-limit-title">
          Limite de Curtidas Atingido!
        </h2>

        {/* Mensagem Contextual */}
        <p className="fav-limit-text">
          Olá, <strong>{user?.nome || 'Cineasta'}</strong>!
          {movieTitle && (
            <span> Não foi possível favoritar <em>"{movieTitle}"</em>.</span>
          )}
        </p>

        <div className="fav-limit-box">
          <div className="fav-limit-box-header">
            <span className="fav-limit-plan-tag">{roleName}</span>
            <span className="fav-limit-count-pill">{displayLimit} / {displayLimit} usados</span>
          </div>
          <p className="fav-limit-box-desc">
            {isCommon ? (
              <>
                Sua conta possui limite de <strong>{displayLimit} filmes favoritos</strong>. Para favoritar novos filmes, remova algum título da sua lista de favoritos ou adquira o plano <strong>Premium</strong>.
              </>
            ) : (
              <>
                Você atingiu a cota máxima de <strong>{displayLimit} filmes favoritos</strong> do plano Premium. Para adicionar novos filmes, desmarque algum título que você já assistiu.
              </>
            )}
          </p>
          <div className="fav-limit-progress-bar">
            <div className="fav-limit-progress-fill" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="fav-limit-actions">
          <button
            type="button"
            className="btn-fav-limit-secondary"
            onClick={onClose}
          >
            Entendi, Fechar
          </button>

          {onGoToProfile && (
            <button
              type="button"
              className="btn-fav-limit-primary"
              onClick={() => {
                onClose();
                onGoToProfile();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Gerenciar Meus Favoritos</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
