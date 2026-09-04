import React from 'react';

export default function GuestActionModal({
  isOpen,
  type = 'favorite', // 'favorite' | 'comment'
  movieTitle = '',
  onClose,
  onOpenAuth
}) {
  if (!isOpen) return null;

  const isFav = type === 'favorite';

  return (
    <div className="modal-backdrop guest-action-backdrop" onClick={onClose}>
      <div className="guest-action-card" onClick={(e) => e.stopPropagation()}>
        <button className="guest-action-close" onClick={onClose} title="Fechar aviso">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className={`guest-action-icon-wrap ${isFav ? 'icon-fav' : 'icon-comment'}`}>
          {isFav ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          )}
        </div>

        <div className="guest-action-badge">
          <span>✨ Recurso Exclusivo para Membros</span>
        </div>

        <h3 className="guest-action-title">
          {isFav ? 'Salve seus filmes favoritos!' : 'Participe com anotações e críticas!'}
        </h3>

        <p className="guest-action-text">
          {isFav ? (
            <>
              {movieTitle ? (
                <>Gostou de <strong>"{movieTitle}"</strong>? </>
              ) : (
                'Gostou deste filme? '
              )}
              Crie uma conta gratuita para favoritá-lo e organizar sua lista pessoal com isolamento seguro de dados.
            </>
          ) : (
            <>
              {movieTitle ? (
                <>Deseja comentar sobre <strong>"{movieTitle}"</strong>? </>
              ) : (
                'Deseja registrar suas impressões? '
              )}
              Cadastre-se gratuitamente para compartilhar notas, análises e interagir com toda a filmografia.
            </>
          )}
        </p>

        <div className="guest-action-features">
          <div className="guest-feature-item">
            <span>🔒</span>
            <span>Espaço pessoal isolado no banco de dados</span>
          </div>
          <div className="guest-feature-item">
            <span>🎬</span>
            <span>Acesso liberado a todos os +60 filmes</span>
          </div>
        </div>

        <div className="guest-action-buttons">
          <button
            className="btn-guest-register"
            onClick={() => {
              onClose();
              onOpenAuth('register');
            }}
          >
            <span>Criar Conta Gratuita</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          <button
            className="btn-guest-login"
            onClick={() => {
              onClose();
              onOpenAuth('login');
            }}
          >
            Já tenho uma conta (Entrar)
          </button>

          <button className="btn-guest-dismiss" onClick={onClose}>
            Continuar explorando a prévia
          </button>
        </div>
      </div>
    </div>
  );
}
