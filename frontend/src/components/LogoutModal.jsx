import React, { useEffect } from 'react';

export default function LogoutModal({
  isOpen,
  user,
  onClose,
  onConfirm
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

  return (
    <div className="logout-modal-backdrop" onClick={onClose}>
      <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Botão de Fechar no Topo */}
        <button className="logout-modal-close" onClick={onClose} title="Cancelar e fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Ícone Centralizado de Desconexão */}
        <div className="logout-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>

        {/* Badge Informativa */}
        <div className="logout-badge">
          <span className="logout-badge-dot"></span>
          <span>DESCONECTAR DA CONTA</span>
        </div>

        {/* Título */}
        <h3 className="logout-modal-title">
          Deseja realmente se desconectar?
        </h3>

        {/* Descrição */}
        <p className="logout-modal-text">
          Olá, <strong>{user?.nome || 'Cineasta'}</strong>! Ao sair, você voltará à tela inicial como visitante. Seus filmes favoritos, listas e comentários permanecerão salvos com segurança.
        </p>

        {/* Ações */}
        <div className="logout-modal-actions">
          <button
            type="button"
            className="btn-logout-cancel"
            onClick={onClose}
            autoFocus
          >
            Permanecer Conectado
          </button>

          <button
            type="button"
            className="btn-logout-confirm"
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sim, Desconectar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
