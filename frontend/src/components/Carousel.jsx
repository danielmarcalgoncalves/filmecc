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

  const displayedMovies = isGuest ? movies.slice(0, 8) : movies;
  const blurredTeaserMovies = isGuest ? movies.slice(8, 11) : [];

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

          {/* 3 filmes em blur para estética visual sem mensagem de cadastro */}
          {isGuest && blurredTeaserMovies.map((movie) => (
            <div
              key={`blur-${movie.id}`}
              className="carousel-item carousel-item-blur"
              onClick={() => onOpenAuth && onOpenAuth('register')}
              title={movie.title ? `${movie.title} — Cadastre-se para desbloquear` : 'Cadastre-se para desbloquear'}
            >
              <div className="carousel-blurred-poster-card">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title || 'Filme'}
                    className="carousel-blurred-poster-img"
                  />
                ) : (
                  <div className="poster-fallback">
                    <span>Sem pôster</span>
                  </div>
                )}
                <div className="carousel-blurred-overlay-glass" />
              </div>
            </div>
          ))}
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
