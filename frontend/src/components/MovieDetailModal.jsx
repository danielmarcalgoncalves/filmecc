import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function MovieDetailModal({
  movie,
  isFavorite,
  user,
  onToggleFavorite,
  onClose,
  onShowToast,
  onCommentChanged
}) {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (movie) {
      loadComments();
    }
  }, [movie]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const data = await api.comments.getForMovie(movie.id);
      setComments(data.comentarios || []);
    } catch (err) {
      console.error('Erro ao carregar comentários do filme:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.comments.add(movie.id, newCommentText);
      setNewCommentText('');
      setComments((prev) => [res.comentario, ...prev]);
      onShowToast('Comentário salvo com sucesso!', 'success');
      if (onCommentChanged) onCommentChanged();
    } catch (err) {
      onShowToast(err.message || 'Erro ao adicionar comentário.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.comments.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onShowToast('Comentário removido.', 'success');
      if (onCommentChanged) onCommentChanged();
    } catch (err) {
      onShowToast(err.message || 'Erro ao remover comentário.', 'error');
    }
  };

  if (!movie) return null;

  const bannerBg = movie.backdrop_url || movie.poster_url || '';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div
          className="modal-header-banner"
          style={{
            backgroundImage: bannerBg ? `url(${bannerBg})` : 'none'
          }}
        >
          <div className="modal-header-overlay"></div>

          <button className="btn-close-modal" onClick={onClose} title="Fechar modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="modal-banner-content">
            {movie.poster_url && (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="modal-poster-mini"
              />
            )}
            <div className="modal-title-area">
              <h2>{movie.title}</h2>
              {movie.original_title && movie.original_title !== movie.title && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  Título Original: <em>{movie.original_title}</em>
                </div>
              )}
              <div className="modal-meta-row">
                <span>📅 {movie.release_year}</span>
                <span>⭐ {movie.vote_average} / 10 ({movie.vote_count} votos)</span>
                <span>👤 Papel: {movie.character || 'Tom Hanks'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-actions-bar">
            <button
              className={`btn-fav-large ${isFavorite ? 'active' : ''}`}
              onClick={() => onToggleFavorite(movie)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span>{isFavorite ? 'Filme Favoritado' : 'Adicionar aos Favoritos'}</span>
            </button>
          </div>

          <div className="synopsis-area">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Sinopse (via TMDB)
            </h3>
            <p className="synopsis-text">
              {movie.overview || 'Nenhuma sinopse fornecida pelo TMDB para esta obra.'}
            </p>
          </div>

          <div className="comments-area">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Meus Comentários &amp; Anotações
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '1rem' }}>
              🔒 Visíveis exclusivamente na sua conta ({user?.email}) e salvos no seu banco individual.
            </p>

            <form className="comment-form" onSubmit={handleAddComment}>
              <textarea
                className="comment-textarea"
                placeholder="Escreva suas impressões, crítica ou anotação pessoal sobre este filme..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn-submit-comment"
                disabled={submittingComment || !newCommentText.trim()}
              >
                {submittingComment ? 'Salvando...' : 'Publicar Comentário'}
              </button>
            </form>

            <div className="comments-list">
              {loadingComments ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                  Carregando seus comentários...
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  Você ainda não escreveu comentários para este filme. Deixe sua primeira anotação acima!
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-item-header">
                      <div className="comment-user-info">
                        <div className="user-avatar" style={{ width: '18px', height: '18px', fontSize: '0.65rem' }}>
                          {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span>{user?.nome}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="comment-date">
                          {new Date(c.criado_em).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <button
                          className="btn-del-comment"
                          onClick={() => handleDeleteComment(c.id)}
                          title="Remover este comentário"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="comment-text">{c.texto}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
