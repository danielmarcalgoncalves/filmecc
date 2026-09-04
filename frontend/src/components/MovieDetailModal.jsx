import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function MovieDetailModal({
  movie,
  isFavorite,
  user,
  onToggleFavorite,
  onClose,
  onShowToast,
  onCommentChanged,
  onRequireAuth
}) {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(Boolean(user));
  const [submittingComment, setSubmittingComment] = useState(false);

  // Estado local para avaliação pessoal (estrelas de 1 a 5)
  const [userRating, setUserRating] = useState(() => {
    try {
      const stored = localStorage.getItem(`cinefilia_rating_${movie?.id}_${user?.id || 'guest'}`);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });
  const [ratingHover, setRatingHover] = useState(0);

  // Status de Visto e Watchlist
  const [isWatched, setIsWatched] = useState(isFavorite);
  const [isWatchlist, setIsWatchlist] = useState(false);

  useEffect(() => {
    if (movie && user) {
      loadComments();
    } else {
      setLoadingComments(false);
      setComments([]);
    }
  }, [movie, user]);

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

  const handleRate = (stars) => {
    if (!user) {
      if (onRequireAuth) onRequireAuth('favorite', movie?.title);
      return;
    }
    setUserRating(stars);
    try {
      localStorage.setItem(`cinefilia_rating_${movie.id}_${user.id}`, String(stars));
      if (onShowToast) onShowToast(`Avaliação de ${stars} estrela${stars > 1 ? 's' : ''} registrada!`, 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      if (onRequireAuth) onRequireAuth('comment', movie?.title);
      return;
    }
    if (!newCommentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.comments.add(movie.id, newCommentText);
      setNewCommentText('');
      setComments((prev) => [res.comentario, ...prev]);
      if (onShowToast) onShowToast('Anotação salva com sucesso!', 'success');
      if (onCommentChanged) onCommentChanged();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao adicionar comentário.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.comments.delete(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (onShowToast) onShowToast('Comentário removido.', 'success');
      if (onCommentChanged) onCommentChanged();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao remover comentário.', 'error');
    }
  };

  const handleAdminModerateComment = async (commentId, autorNome) => {
    if (!window.confirm(`[MODERAÇÃO ADMIN]\nTem certeza que deseja apagar o comentário de "${autorNome || 'outro usuário'}"?`)) {
      return;
    }
    try {
      await api.comments.deleteAny(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (onShowToast) onShowToast('Comentário moderado e removido pela administração!', 'success');
      if (onCommentChanged) onCommentChanged();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao moderar comentário.', 'error');
    }
  };

  if (!movie) return null;

  const bannerBg = movie.backdrop_url || movie.poster_url || '';
  const ratingNum = movie.vote_average ? Number(movie.vote_average) : 0;
  const ratingColor = ratingNum >= 8 ? '#00C030' : ratingNum >= 6 ? '#FF9010' : '#CC3333';
  const ratingScore = Math.round(ratingNum / 2);

  const ratingDescriptions = ['', 'Fraco', 'Mediano', 'Bom', 'Ótimo', 'Obra-prima'];
  const activeDisplayRating = ratingHover || userRating || 0;

  // Plataformas de exibição simuladas com estilo do PDF
  const platforms = [
    { name: 'Apple TV+', color: '#555555' },
    { name: 'Prime Video', color: '#00A8E0' },
    { name: 'Netflix', color: '#E50914' }
  ];

  return (
    <div className="cinefilia-detail-modal-backdrop" onClick={onClose}>
      <div className="cinefilia-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Backdrop Cinematográfico Superior (440px) */}
        <div
          className="detail-backdrop-banner"
          style={{ backgroundImage: bannerBg ? `url(${bannerBg})` : 'none' }}
        >
          <div className="backdrop-overlay-v" />
          <div className="backdrop-overlay-h" />

          <button
            type="button"
            className="btn-detail-back"
            onClick={onClose}
            title="Voltar ao catálogo"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        {/* Conteúdo Principal em 2 Colunas */}
        <div className="detail-content-container">
          <div className="detail-columns-layout">
            {/* Coluna Esquerda: Pôster Grande + Ações Rápidas + Avaliação do Usuário */}
            <aside className="detail-left-col">
              <div className="detail-poster-wrapper">
                {movie.poster_url ? (
                  <img src={movie.poster_url} alt={movie.title} className="detail-poster-img" />
                ) : (
                  <div className="detail-poster-fallback">Sem pôster</div>
                )}
              </div>

              {/* Botões de Ação Rápida */}
              <div className="detail-action-buttons-stack">
                <button
                  type="button"
                  className={`btn-detail-action ${isWatched ? 'active-watched' : ''}`}
                  onClick={() => {
                    setIsWatched((v) => !v);
                    if (onToggleFavorite) onToggleFavorite(movie);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" />
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  <span>{isWatched ? 'Visto' : 'Marcar como Visto'}</span>
                </button>

                <button
                  type="button"
                  className={`btn-detail-action ${isWatchlist ? 'active-watchlist' : ''}`}
                  onClick={() => {
                    if (!user && onRequireAuth) onRequireAuth('favorite', movie.title);
                    else setIsWatchlist((v) => !v);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span>{isWatchlist ? 'Na Watchlist' : 'Adicionar à Lista'}</span>
                </button>

                <button
                  type="button"
                  className={`btn-detail-action ${isFavorite ? 'active-liked' : ''}`}
                  onClick={() => onToggleFavorite && onToggleFavorite(movie)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill={isFavorite ? 'currentColor' : 'none'}>
                    <path
                      d="M8 13.5C8 13.5 1.5 9 1.5 5a3.5 3.5 0 0 1 6.5-1.8A3.5 3.5 0 0 1 14.5 5c0 4-6.5 8.5-6.5 8.5z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                  </svg>
                  <span>{isFavorite ? 'Curtido' : 'Curtir'}</span>
                </button>
              </div>

              {/* Caixa de Avaliação Pessoal com Estrelas */}
              <div className="user-rating-box">
                <p className="rating-box-label">Sua Nota</p>
                <div className="stars-row">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="star-btn"
                      onMouseEnter={() => setRatingHover(s)}
                      onMouseLeave={() => setRatingHover(0)}
                      onClick={() => handleRate(s)}
                    >
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                        <polygon
                          points="8,1 10,6 15.5,6.5 11.5,10 13,15.5 8,12.5 3,15.5 4.5,10 0.5,6.5 6,6"
                          fill={s <= activeDisplayRating ? '#FF9010' : 'none'}
                          stroke={s <= activeDisplayRating ? '#FF9010' : '#3A4555'}
                          strokeWidth="1"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
                {userRating && (
                  <p className="rating-desc-text">
                    {ratingDescriptions[userRating]} ({userRating}/5)
                  </p>
                )}
              </div>
            </aside>

            {/* Coluna Direita: Metadados, Sinopse, Elenco, Onde Assistir e Anotações */}
            <main className="detail-right-col">
              <div className="detail-meta-line">
                <span className="meta-item">{movie.release_year}</span>
                <span className="meta-sep">·</span>
                <span className="meta-item">{movie.duration || 'Produção TMDB'}</span>
                <span className="meta-sep">·</span>
                <span className="meta-item">
                  Estrelando <strong>{movie.character ? `como ${movie.character}` : 'Tom Hanks'}</strong>
                </span>
              </div>

              <h1 className="detail-movie-title">{movie.title}</h1>
              {movie.original_title && movie.original_title !== movie.title && (
                <p className="detail-original-title">{movie.original_title}</p>
              )}

              {/* Linha de Nota do TMDB */}
              <div className="detail-score-row">
                <div className="score-stars-wrap">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <polygon
                        points="8,1 10,6 15.5,6.5 11.5,10 13,15.5 8,12.5 3,15.5 4.5,10 0.5,6.5 6,6"
                        fill={s <= ratingScore ? '#FF9010' : 'none'}
                        stroke={s <= ratingScore ? '#FF9010' : '#3A4555'}
                        strokeWidth="1"
                      />
                    </svg>
                  ))}
                  <span className="score-number">{ratingNum.toFixed(1)}</span>
                  <span className="score-max">/10</span>
                </div>

                <span
                  className="rating-badge-pill"
                  style={{
                    background: ratingColor + '22',
                    color: ratingColor,
                    border: `1px solid ${ratingColor}44`
                  }}
                >
                  ★ {ratingNum.toFixed(1)}
                </span>
              </div>

              {/* Pílulas de Gênero */}
              <div className="detail-genres-wrap">
                {['Drama', 'Cinema Clássico', 'Filmografia'].map((g) => (
                  <span key={g} className="genre-tag-pill">
                    {g}
                  </span>
                ))}
              </div>

              {/* Sinopse */}
              <div className="detail-section-block">
                <h3 className="section-block-title">Sinopse</h3>
                <p className="synopsis-paragraph">
                  {movie.overview || 'Nenhuma sinopse oficial foi disponibilizada pelo The Movie Database para esta obra.'}
                </p>
              </div>

              {/* Elenco Principal (Apenas Nomes e Papéis, sem fotos) */}
              <div className="detail-section-block">
                <h3 className="section-block-title">Elenco Principal</h3>
                <div className="cast-names-wrap">
                  <div className="cast-text-chip">
                    <span className="cast-actor-name">Tom Hanks</span>
                    <span className="cast-actor-role">{movie.character ? `como ${movie.character}` : 'Protagonista'}</span>
                  </div>
                  <div className="cast-text-chip">
                    <span className="cast-actor-name">Elenco Coadjuvante</span>
                    <span className="cast-actor-role">Artistas TMDB</span>
                  </div>
                  <div className="cast-text-chip">
                    <span className="cast-actor-name">Equipe Técnica</span>
                    <span className="cast-actor-role">Direção e Produção</span>
                  </div>
                </div>
              </div>

              {/* Onde Assistir */}
              <div className="detail-section-block">
                <h3 className="section-block-title">Onde Assistir</h3>
                <div className="platforms-pills-row">
                  {platforms.map((p) => (
                    <span
                      key={p.name}
                      className="platform-pill"
                      style={{ background: p.color, color: '#FFFFFF' }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* =========================================================
                  SEÇÃO DE ANOTAÇÕES & COMENTÁRIOS SEGUROS
                  ========================================================= */}
              <div className="detail-comments-block">
                <h3 className="section-block-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>Minhas Anotações &amp; Crítica Pessoal</span>
                </h3>
                <p className="comments-subnote">
                  🔒 {user ? `Salvo exclusivamente na sua conta individual (${user.email}).` : 'Anotações particulares disponíveis para membros cadastrados.'}
                </p>

                {!user ? (
                  <div className="comments-locked-box">
                    <div className="locked-badge-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>
                    <h4 className="locked-box-title">Anotações Privadas Bloqueadas</h4>
                    <p className="locked-box-text">
                      Faça login ou crie sua conta gratuita para registrar suas críticas e salvar anotações particulares para este filme.
                    </p>
                    <button
                      type="button"
                      className="btn-locked-comment-cta"
                      onClick={() => onRequireAuth && onRequireAuth('comment', movie.title)}
                    >
                      <span>Entrar ou Criar Conta</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
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
                        {submittingComment ? 'Salvando...' : 'Publicar Anotação'}
                      </button>
                    </form>

                    {/* Lista de Comentários para usuário logado */}
                    <div className="comments-list">
                      {loadingComments ? (
                        <div className="comments-empty-text">Carregando suas anotações...</div>
                      ) : comments.length === 0 ? (
                        <div className="comments-empty-text">
                          Você ainda não escreveu anotações para este filme. Deixe sua primeira impressão acima!
                        </div>
                      ) : (
                        comments.map((c) => {
                          const isAuthor = user?.id === c.usuario_id;
                          const isAdmin = user?.papel === 'admin';
                          const autorNome = c.autor_nome || (isAuthor ? user?.nome : 'Membro');
                          const autorPapel = c.autor_papel || (isAuthor ? user?.papel : 'usuario');

                          return (
                            <div key={c.id} className="comment-bubble">
                              <div className="comment-bubble-header">
                                <div className="comment-author-info">
                                  <div className="comment-avatar">
                                    {autorNome ? autorNome.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <span className="comment-author-name">{autorNome}</span>
                                  <span className={`role-badge-mini role-${autorPapel}`}>
                                    {autorPapel === 'admin' ? 'Admin' : autorPapel === 'premium' ? 'Premium' : 'Membro'}
                                  </span>
                                </div>

                                <div className="comment-date-actions">
                                  <span className="comment-timestamp">
                                    {new Date(c.criado_em).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}
                                  </span>

                                  {isAuthor && (
                                    <button
                                      type="button"
                                      className="btn-delete-comment-icon"
                                      onClick={() => handleDeleteComment(c.id)}
                                      title="Remover anotação"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                  )}

                                  {!isAuthor && isAdmin && (
                                    <button
                                      type="button"
                                      className="btn-admin-moderate"
                                      onClick={() => handleAdminModerateComment(c.id, autorNome)}
                                      title="[Admin RBAC] Moderar anotação"
                                    >
                                      Moderar
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="comment-body-text">{c.conteudo}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
