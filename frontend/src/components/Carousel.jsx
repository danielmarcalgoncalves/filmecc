import React, { useRef } from 'react';
import MovieCard from './MovieCard';

export default function Carousel({
  title,
  movies = [],
  favoriteMovieIds = new Set(),
  commentsCountByMovie = {},
  onSelect,
  onToggleFavorite,
  onToggleWatched,
  onToggleWatchlist,
  watchedMovieIds = new Set(),
  watchlistMovieIds = new Set(),
  isGuest = false,
  onOpenAuth
}) {
  const scrollRef = useRef(null);

  const handleScroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  const displayedMovies = isGuest ? movies.slice(0, 6) : movies;
  const lockedPosterMovie = isGuest && movies.length > 6 ? movies[6] : null;

  return (
    <section className="carousel-section">
      <div className="carousel-header">
        <h2 className="carousel-title">{title}</h2>
        <div className="carousel-nav-buttons">
          <button
            type="button"
            className="carousel-btn"
            onClick={() => handleScroll(-1)}
            title="Rolar para esquerda"
            aria-label="Rolar para esquerda"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="carousel-btn"
            onClick={() => handleScroll(1)}
            title="Rolar para direita"
            aria-label="Rolar para direita"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`carousel-track-wrapper ${isGuest ? 'has-fade-edge' : ''}`}>
        <div className="carousel-track" ref={scrollRef}>
          {displayedMovies.map((movie) => (
            <div key={movie.id} className="carousel-item">
              <MovieCard
                movie={movie}
                isFavorite={favoriteMovieIds.has(movie.id)}
                isWatched={watchedMovieIds.has(movie.id)}
                isWatchlist={watchlistMovieIds.has(movie.id)}
                commentCount={commentsCountByMovie[movie.id] || 0}
                onToggleFavorite={onToggleFavorite}
                onToggleWatched={onToggleWatched}
                onToggleWatchlist={onToggleWatchlist}
                onOpenDetails={onSelect}
              />
            </div>
          ))}

          {/* Card com filme em blur e mensagem para visitante entrar/cadastrar */}
          {isGuest && lockedPosterMovie && (
            <div
              className="carousel-item carousel-item-locked"
              onClick={() => onOpenAuth && onOpenAuth('register')}
              title="Clique para entrar ou criar conta"
            >
              <div className="carousel-locked-card">
                {lockedPosterMovie.poster_url && (
                  <img
                    src={lockedPosterMovie.poster_url}
                    alt={lockedPosterMovie.title || 'Filme Bloqueado'}
                    className="carousel-locked-bg-img"
                  />
                )}
                <div className="carousel-locked-overlay">
                  <div className="carousel-lock-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className="carousel-locked-badge">+{movies.length - 6} Filmes</span>
                  <p className="carousel-locked-msg">
                    Entre ou cadastre-se para ver a lista completa
                  </p>
                  <button
                    type="button"
                    className="btn-carousel-unlock"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAuth && onOpenAuth('register');
                    }}
                  >
                    Entrar / Cadastrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isGuest && (
          <div
            className="carousel-fade-edge"
            onClick={() => handleScroll(1)}
            title="Clique para ver mais filmes"
          />
        )}
      </div>
    </section>
  );
}
