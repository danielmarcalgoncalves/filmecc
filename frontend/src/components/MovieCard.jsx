import React from 'react';

export default function MovieCard({
  movie,
  isFavorite,
  commentCount,
  onToggleFavorite,
  onOpenDetails
}) {
  const handleFavClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(movie);
  };

  return (
    <div className="movie-card" onClick={() => onOpenDetails(movie)}>
      <div className="poster-wrapper">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="movie-poster"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className="poster-placeholder"
          style={{ display: movie.poster_url ? 'none' : 'flex' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="2" y1="7" x2="7" y2="7"></line>
            <line x1="2" y1="17" x2="7" y2="17"></line>
            <line x1="17" y1="17" x2="22" y2="17"></line>
            <line x1="17" y1="7" x2="22" y2="7"></line>
          </svg>
          <span style={{ fontSize: '0.8rem' }}>Sem pôster</span>
        </div>

        <div className="poster-overlay-top">
          <span className="score-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            {movie.vote_average || 'N/A'}
          </span>

          <button
            type="button"
            className={`btn-fav-round ${isFavorite ? 'active' : ''}`}
            onClick={handleFavClick}
            title={isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="movie-card-body">
        <div className="movie-year">{movie.release_year}</div>
        <h3 className="movie-title" title={movie.title}>{movie.title}</h3>
        <div className="movie-character" title={`Papel: ${movie.character}`}>
          👤 {movie.character || 'Tom Hanks'}
        </div>

        <div className="movie-card-footer">
          <div className={`comment-badge ${commentCount > 0 ? 'has-comments' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{commentCount} {commentCount === 1 ? 'comentário' : 'comentários'}</span>
          </div>

          <button className="btn-card-details">
            <span>Ver mais</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
