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
  watchlistMovieIds = new Set()
}) {
  const scrollRef = useRef(null);

  const handleScroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

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

      <div className="carousel-track" ref={scrollRef}>
        {movies.map((movie) => (
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
      </div>
    </section>
  );
}
