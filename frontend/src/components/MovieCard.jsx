import React, { useState } from 'react';

export default function MovieCard({
  movie,
  isFavorite,
  isWatched = false,
  isWatchlist = false,
  commentCount = 0,
  onToggleFavorite,
  onToggleWatched,
  onToggleWatchlist,
  onOpenDetails
}) {
  const [showActions, setShowActions] = useState(false);

  const rating = movie.vote_average ? Number(movie.vote_average) : 0;
  const ratingColor = rating >= 8 ? '#00C030' : rating >= 6 ? '#FF9010' : '#CC3333';
  const starCount = Math.round(rating / 2);

  const handleFavClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(movie);
  };

  const handleWatchedClick = (e) => {
    e.stopPropagation();
    if (onToggleWatched) onToggleWatched(movie);
    else if (onToggleFavorite) onToggleFavorite(movie);
  };

  const handleWatchlistClick = (e) => {
    e.stopPropagation();
    if (onToggleWatchlist) onToggleWatchlist(movie);
    else if (onToggleFavorite) onToggleFavorite(movie);
  };

  return (
    <div
      className={`poster-card ${showActions ? 'is-hovered' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onOpenDetails && onOpenDetails(movie)}
    >
      {/* Pôster com efeito de zoom suave */}
      <div className="poster-media-wrap">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="poster-img"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className="poster-fallback"
          style={{ display: movie.poster_url ? 'none' : 'flex' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
          </svg>
          <span>Sem pôster</span>
        </div>

        {/* Borda luminosa no hover */}
        <div className="poster-glow-border" />
      </div>

      {/* Topo Esquerdo: Badge de Nota com Estrela */}
      {rating > 0 && (
        <div className="poster-top-rating">
          <span
            className="rating-pill"
            style={{
              background: ratingColor + '22',
              color: ratingColor,
              border: `1px solid ${ratingColor}44`
            }}
          >
            ★ {rating.toFixed(1)}
          </span>
        </div>
      )}

      {/* Topo Direito: Ícone de Visto / Favorito */}
      {(isFavorite || isWatched) && (
        <div className="poster-top-watched" title="Filme assistido / favoritado">
          <div className="watched-badge-circle">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="#00E054" strokeWidth="1.2" />
              <circle cx="8" cy="8" r="2" fill="#00E054" />
            </svg>
          </div>
        </div>
      )}

      {/* Camada de Ações no Hover (Estilo Letterboxd) */}
      <div className="poster-actions-overlay" onClick={(e) => e.stopPropagation()}>
        {/* Avaliação por Estrelas */}
        <div className="poster-mini-stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} width="12" height="12" viewBox="0 0 16 16" fill="none">
              <polygon
                points="8,1 10,6 15.5,6.5 11.5,10 13,15.5 8,12.5 3,15.5 4.5,10 0.5,6.5 6,6"
                fill={s <= starCount ? '#FF9010' : 'none'}
                stroke={s <= starCount ? '#FF9010' : '#3A4555'}
                strokeWidth="1"
              />
            </svg>
          ))}
        </div>

        {/* Botões Circulares de Ação Rápida */}
        <div className="poster-action-buttons">
          <button
            type="button"
            className={`action-btn-circle ${isWatched ? 'active-watched' : ''}`}
            onClick={handleWatchedClick}
            title={isWatched ? 'Visto' : 'Marcar como Visto'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>

          <button
            type="button"
            className={`action-btn-circle ${isWatchlist ? 'active-watchlist' : ''}`}
            onClick={handleWatchlistClick}
            title={isWatchlist ? 'Na Watchlist' : 'Adicionar à Watchlist'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            className={`action-btn-circle ${isFavorite ? 'active-liked' : ''}`}
            onClick={handleFavClick}
            title={isFavorite ? 'Favoritado' : 'Curtir / Favoritar'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill={isFavorite ? 'currentColor' : 'none'}>
              <path
                d="M8 13.5C8 13.5 1.5 9 1.5 5a3.5 3.5 0 0 1 6.5-1.8A3.5 3.5 0 0 1 14.5 5c0 4-6.5 8.5-6.5 8.5z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Degradê Inferior com Título e Ano */}
      <div className="poster-bottom-fade" />
      <div className="poster-bottom-info">
        <p className="poster-title" title={movie.title}>
          {movie.title}
        </p>
        <p className="poster-year">{movie.release_year || ''}</p>
      </div>
    </div>
  );
}
