import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import GuestActionModal from './components/GuestActionModal';
import Carousel from './components/Carousel';
import MovieCard from './components/MovieCard';
import MovieDetailModal from './components/MovieDetailModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import AdminDashboard from './components/AdminDashboard';
import ListsView from './components/ListsView';
import Toast from './components/Toast';
import { api } from './services/api';

const GENRES = ['Todos', 'Drama', 'Comédia', 'Guerra', 'Animação', 'Aventura', 'Romance'];

export default function App() {
  // SEGURANÇA: Inicia como null. O estado de autenticação e permissões decorre
  // estritamente da resposta do servidor (/api/auth/me), ignorando o localStorage.
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog' | 'admin'
  const [movies, setMovies] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [comments, setComments] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modais de Autenticação e Ação de Visitante
  const [authModalState, setAuthModalState] = useState({ isOpen: false, initialTab: 'login' });
  const [guestActionModal, setGuestActionModal] = useState({ isOpen: false, type: 'favorite', movieTitle: '' });

  // Filtros e Navegação
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'favorites' | 'comments' | 'lists'
  const [activeGenre, setActiveGenre] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'year' | 'title'
  const [selectedMovie, setSelectedMovie] = useState(null);

  // Recuperação de senha
  const [resetToken, setResetToken] = useState(() => {
    return new URLSearchParams(window.location.search).get('token');
  });

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Carregamento inicial da sessão oficial consultando o backend diretamente no banco
  useEffect(() => {
    api.auth.getMe()
      .then((data) => {
        if (data && data.usuario) {
          setUser(data.usuario);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  // Carrega os dados da filmografia e dados do usuário se logado
  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Busca filmes do Tom Hanks na API do TMDB (rota pública)
      const moviesRes = await api.movies.getTomHanks();
      setMovies(moviesRes.movies || []);

      // 2. Se houver usuário autenticado, busca favoritos, comentários e watchlist do MariaDB
      if (user) {
        const [favsRes, commsRes, watchRes] = await Promise.all([
          api.favorites.getAll(),
          api.comments.getAll(),
          api.lists.getWatchlist().catch(() => ({ lista: { filmes: [] } }))
        ]);
        setFavorites(favsRes.favoritos || []);
        setComments(commsRes.comentarios || []);
        setWatchlist(watchRes?.lista?.filmes || []);
      } else {
        setFavorites([]);
        setComments([]);
        setWatchlist([]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleReloadUserData = async () => {
    if (!user) return;
    try {
      const [favsRes, commsRes, watchRes] = await Promise.all([
        api.favorites.getAll(),
        api.comments.getAll(),
        api.lists.getWatchlist().catch(() => ({ lista: { filmes: [] } }))
      ]);
      setFavorites(favsRes.favoritos || []);
      setComments(commsRes.comentarios || []);
      setWatchlist(watchRes?.lista?.filmes || []);
    } catch (err) {
      console.error('Erro ao atualizar dados do usuário:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Erro ao efetuar logout:', err);
    }
    setUser(null);
    setFavorites([]);
    setComments([]);
    setWatchlist([]);
    setSelectedMovie(null);
    setCurrentView('catalog');
    showToast('Sessão encerrada com sucesso.', 'success');
  };

  const handleRequireAuth = (type = 'favorite', movieTitle = '') => {
    setGuestActionModal({
      isOpen: true,
      type,
      movieTitle: movieTitle || ''
    });
  };

  const handleToggleFavorite = async (movie) => {
    if (!user) {
      handleRequireAuth('favorite', movie?.title);
      return;
    }

    const isFav = favorites.some((f) => f.tmdb_movie_id === movie.id);

    try {
      if (isFav) {
        await api.favorites.remove(movie.id);
        setFavorites((prev) => prev.filter((f) => f.tmdb_movie_id !== movie.id));
        showToast(`"${movie.title}" removido dos favoritos.`, 'success');
      } else {
        await api.favorites.add(movie.id, movie.title, movie.poster_path);
        setFavorites((prev) => [
          {
            tmdb_movie_id: movie.id,
            titulo: movie.title,
            poster_path: movie.poster_path,
            poster_url: movie.poster_url,
            criado_em: new Date().toISOString()
          },
          ...prev
        ]);
        showToast(`"${movie.title}" adicionado aos favoritos!`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar favoritos.', 'error');
    }
  };

  const handleToggleWatchlist = async (movie) => {
    if (!user) {
      handleRequireAuth('favorite', movie?.title);
      return;
    }

    const inWatchlist = watchlist.some((w) => (w.tmdb_movie_id || w.id) === movie.id);

    try {
      const res = await api.lists.toggleWatchlist(movie.id, movie.title, movie.poster_path);
      if (res.action === 'removed' || inWatchlist) {
        setWatchlist((prev) => prev.filter((w) => (w.tmdb_movie_id || w.id) !== movie.id));
        showToast(`"${movie.title}" removido da sua Watchlist.`, 'success');
      } else {
        setWatchlist((prev) => [
          {
            tmdb_movie_id: movie.id,
            titulo: movie.title,
            poster_path: movie.poster_path,
            poster_url: movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null)
          },
          ...prev
        ]);
        showToast(`"${movie.title}" adicionado à sua Watchlist!`, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar Watchlist.', 'error');
    }
  };

  const commentsCountByMovie = useMemo(() => {
    const map = {};
    for (const c of comments) {
      map[c.tmdb_movie_id] = (map[c.tmdb_movie_id] || 0) + 1;
    }
    return map;
  }, [comments]);

  const favoriteMovieIds = useMemo(() => {
    return new Set(favorites.map((f) => f.tmdb_movie_id));
  }, [favorites]);

  const watchlistMovieIds = useMemo(() => {
    return new Set(watchlist.map((w) => w.tmdb_movie_id || w.id));
  }, [watchlist]);

  // Carrossel Hero: 5 clássicos com rotação automática a cada 40 segundos
  // 1. O Resgate do Soldado Ryan
  // 2. Prenda-me Se For Capaz
  // 3. Náufrago
  // 4. Forrest Gump
  // 5. À Espera de um Milagre
  const heroMoviesList = useMemo(() => {
    if (!movies || movies.length === 0) return [];

    const normalize = (str) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const targets = [
      // 1. O Resgate do Soldado Ryan
      {
        match: (t) =>
          normalize(t).includes('resgate do soldado ryan') ||
          normalize(t).includes('soldado ryan') ||
          normalize(t).includes('saving private ryan')
      },
      // 2. Prenda-me Se For Capaz
      {
        match: (t) =>
          normalize(t).includes('prenda-me') ||
          normalize(t).includes('prenda me') ||
          normalize(t).includes('catch me if you can')
      },
      // 3. Náufrago
      {
        match: (t) =>
          normalize(t).includes('naufrago') ||
          normalize(t).includes('cast away')
      },
      // 4. Forrest Gump
      {
        match: (t) =>
          normalize(t).includes('forrest gump')
      },
      // 5. À Espera de um Milagre
      {
        match: (t) =>
          normalize(t).includes('espera de um milagre') ||
          normalize(t).includes('green mile')
      }
    ];

    const result = [];
    for (const target of targets) {
      const found = movies.find((m) => target.match(m.title) && (m.backdrop_url || m.poster_url));
      if (found && !result.some((r) => r.id === found.id)) {
        result.push(found);
      }
    }

    // Se algum dos 5 não for encontrado na API pública, preenche com filmes com backdrop
    if (result.length < 5) {
      const extra = movies
        .filter((m) => (m.backdrop_url || m.poster_url) && !result.some((r) => r.id === m.id))
        .slice(0, 5 - result.length);
      result.push(...extra);
    }

    return result;
  }, [movies]);

  const [heroIndex, setHeroIndex] = useState(0);
  const [heroTimerKey, setHeroTimerKey] = useState(0);

  // Troca automática do carrossel principal a cada 40 segundos (40.000 ms)
  useEffect(() => {
    if (heroMoviesList.length <= 1) return;

    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroMoviesList.length);
      setHeroTimerKey((k) => k + 1);
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [heroMoviesList.length, heroTimerKey]);

  const handleNextHero = () => {
    if (heroMoviesList.length === 0) return;
    setHeroIndex((prev) => (prev + 1) % heroMoviesList.length);
    setHeroTimerKey((k) => k + 1);
  };

  const handlePrevHero = () => {
    if (heroMoviesList.length === 0) return;
    setHeroIndex((prev) => (prev - 1 + heroMoviesList.length) % heroMoviesList.length);
    setHeroTimerKey((k) => k + 1);
  };

  const handleSelectHero = (idx) => {
    setHeroIndex(idx);
    setHeroTimerKey((k) => k + 1);
  };

  const heroMovie = heroMoviesList[heroIndex] || heroMoviesList[0] || null;

  // Carrosséis categorizados (Estilo Letterboxd / Cinefilia)
  const popularMovies = useMemo(() => {
    return [...movies].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 15);
  }, [movies]);

  const recentMovies = useMemo(() => {
    return [...movies].sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '')).slice(0, 15);
  }, [movies]);

  const topRatedMovies = useMemo(() => {
    return [...movies]
      .filter((m) => (m.vote_average || 0) >= 7.5)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      .slice(0, 15);
  }, [movies]);

  // Lista filtrada e ordenada para a seção "Todos os Filmes"
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    if (activeTab === 'favorites') {
      result = result.filter((m) => favoriteMovieIds.has(m.id));
    } else if (activeTab === 'comments') {
      result = result.filter((m) => Boolean(commentsCountByMovie[m.id]));
    }

    if (activeGenre !== 'Todos') {
      result = result.filter((m) => {
        const title = (m.title || '').toLowerCase();
        const overview = (m.overview || '').toLowerCase();
        const char = (m.character || '').toLowerCase();
        const genreTerm = activeGenre.toLowerCase();
        return title.includes(genreTerm) || overview.includes(genreTerm) || char.includes(genreTerm);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.character && m.character.toLowerCase().includes(q)) ||
          (m.release_year && String(m.release_year).includes(q)) ||
          (m.overview && m.overview.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy === 'year') {
        return (b.release_date || '').localeCompare(a.release_date || '');
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return result;
  }, [movies, activeTab, activeGenre, searchQuery, sortBy, favoriteMovieIds, commentsCountByMovie]);

  // Separação do Modo Visitante: 2 linhas completas (12 filmes) e depois a seção com blur
  const visibleGridMovies = useMemo(() => {
    return user ? filteredMovies : filteredMovies.slice(0, 12);
  }, [user, filteredMovies]);

  const lockedGridMovies = useMemo(() => {
    return !user ? filteredMovies.slice(12, 36) : [];
  }, [user, filteredMovies]);

  const handleTabSelect = (tab) => {
    if (!user && (tab === 'favorites' || tab === 'comments' || tab === 'lists')) {
      handleRequireAuth(tab === 'comments' ? 'comment' : 'favorite');
      return;
    }
    setActiveTab(tab);
    setCurrentView('catalog');
  };

  // Se houver token na URL para recuperação de senha
  if (resetToken && !user) {
    return (
      <>
        <ResetPasswordModal 
          token={resetToken} 
          onSuccess={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setResetToken(null);
          }} 
          onShowToast={showToast} 
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="cinefilia-app-container">
      {/* Navbar Fixa Cinefilia com Efeito Vidro */}
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        currentView={currentView}
        onOpenAdmin={() => setCurrentView((prev) => (prev === 'admin' ? 'catalog' : 'admin'))}
        onOpenAuth={(tab) => setAuthModalState({ isOpen: true, initialTab: tab })}
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onHome={() => {
          setActiveTab('all');
          setActiveGenre('Todos');
          setSearchQuery('');
          setCurrentView('catalog');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Visão de Administração (RBAC) */}
      {currentView === 'admin' && user?.papel === 'admin' ? (
        <main className="cinefilia-main-body pt-16">
          <AdminDashboard 
            user={user} 
            onBack={() => setCurrentView('catalog')} 
            onShowToast={showToast} 
          />
        </main>
      ) : activeTab === 'lists' ? (
        <main className="cinefilia-main-body pt-16">
          <ListsView
            user={user}
            allMovies={movies}
            onShowToast={showToast}
            onSelectMovie={setSelectedMovie}
            onRequireAuth={handleRequireAuth}
            favoriteMovieIds={favoriteMovieIds}
            watchedMovieIds={favoriteMovieIds}
            watchlistMovieIds={watchlistMovieIds}
            onToggleFavorite={handleToggleFavorite}
            onToggleWatchlist={handleToggleWatchlist}
          />
        </main>
      ) : (
        <main className="cinefilia-main-body">
          {/* =========================================================
              HERO SECTION CINEMÁTICO (Carrossel com troca a cada 40s)
              ========================================================= */}
          {!isSearching && activeTab === 'all' && heroMovie && (
            <section className="cinefilia-hero">
              <img
                key={`hero-bg-${heroMovie.id || heroIndex}`}
                src={heroMovie.backdrop_url || heroMovie.poster_url}
                alt={heroMovie.title}
                className="hero-backdrop-media"
              />
              <div className="hero-gradient-vertical" />
              <div className="hero-gradient-horizontal" />

              <div className="hero-content-box" key={`hero-content-${heroMovie.id || heroIndex}`}>
                <div className="hero-tags-meta">
                  <span className="hero-genre-tag">DESTAQUE</span>
                  <span className="hero-meta-detail">
                    {heroMovie.release_year} · Estrelando Tom Hanks
                  </span>
                  <span className="hero-carousel-badge">
                    {heroIndex + 1} de {heroMoviesList.length}
                  </span>
                </div>

                <h1 className="hero-main-title">{heroMovie.title}</h1>

                <p className="hero-director-text">
                  Papel: <span>{heroMovie.character || 'Tom Hanks'}</span>
                </p>

                <div className="hero-rating-stars-row">
                  <div className="stars-cluster">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <polygon
                          points="8,1 10,6 15.5,6.5 11.5,10 13,15.5 8,12.5 3,15.5 4.5,10 0.5,6.5 6,6"
                          fill={s <= Math.round((heroMovie.vote_average || 0) / 2) ? '#FF9010' : 'none'}
                          stroke={s <= Math.round((heroMovie.vote_average || 0) / 2) ? '#FF9010' : '#3A4555'}
                          strokeWidth="1"
                        />
                      </svg>
                    ))}
                  </div>
                  <span className="hero-rating-badge">★ {(heroMovie.vote_average || 0).toFixed(1)}</span>
                </div>

                <p className="hero-synopsis-snippet">
                  {heroMovie.overview ? heroMovie.overview.slice(0, 150) + '…' : 'Explore a rica trajetória de Tom Hanks no cinema.'}
                </p>

                <div className="hero-action-buttons">
                  <button
                    type="button"
                    className="btn-hero-primary"
                    onClick={() => setSelectedMovie(heroMovie)}
                  >
                    Ver Detalhes
                  </button>

                  <button
                    type="button"
                    className="btn-hero-secondary"
                    onClick={() => handleToggleFavorite(heroMovie)}
                  >
                    {favoriteMovieIds.has(heroMovie.id) ? '✓ Nos Favoritos' : '+ Favoritos'}
                  </button>
                </div>
              </div>

              {/* Controles de Navegação Anterior e Próximo */}
              {heroMoviesList.length > 1 && (
                <>
                  <button
                    type="button"
                    className="hero-arrow-btn hero-arrow-left"
                    onClick={handlePrevHero}
                    aria-label="Filme anterior"
                    title="Filme anterior"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="hero-arrow-btn hero-arrow-right"
                    onClick={handleNextHero}
                    aria-label="Próximo filme"
                    title="Próximo filme"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {/* Indicadores / Pílulas do Carrossel de 40s com barra de tempo */}
                  <div className="hero-carousel-dots">
                    {heroMoviesList.map((m, idx) => {
                      const isCurrent = idx === heroIndex;
                      return (
                        <button
                          key={m.id || idx}
                          type="button"
                          className={`hero-dot-item ${isCurrent ? 'active' : ''}`}
                          onClick={() => handleSelectHero(idx)}
                          aria-label={`Ir para filme ${idx + 1}: ${m.title}`}
                          title={`${idx + 1}. ${m.title}`}
                        >
                          <span className="hero-dot-label">{idx + 1}</span>
                          <span className="hero-dot-name">{m.title}</span>
                          {isCurrent && (
                            <span key={heroTimerKey} className="hero-dot-timer-fill" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Marca d'água lateral vertical */}
              <div className="hero-vertical-watermark">
                {heroMovie.title} ({heroMovie.release_year})
              </div>
            </section>
          )}

          {/* =========================================================
              CARROSSÉIS HORIZONTAIS (Estilo Cinefilia / Letterboxd)
              ========================================================= */}
          {!isSearching && activeTab === 'all' && (
            <div className="carousels-container">
              <Carousel
                title="🔥 Em Alta"
                movies={popularMovies}
                favoriteMovieIds={favoriteMovieIds}
                watchlistMovieIds={watchlistMovieIds}
                commentsCountByMovie={commentsCountByMovie}
                onSelect={setSelectedMovie}
                onToggleFavorite={handleToggleFavorite}
                onToggleWatched={handleToggleFavorite}
                onToggleWatchlist={handleToggleWatchlist}
                isGuest={!user}
                onOpenAuth={(tab) => setAuthModalState({ isOpen: true, initialTab: tab })}
              />

              <Carousel
                title="🆕 Mais Recentes"
                movies={recentMovies}
                favoriteMovieIds={favoriteMovieIds}
                watchlistMovieIds={watchlistMovieIds}
                commentsCountByMovie={commentsCountByMovie}
                onSelect={setSelectedMovie}
                onToggleFavorite={handleToggleFavorite}
                onToggleWatched={handleToggleFavorite}
                onToggleWatchlist={handleToggleWatchlist}
                isGuest={!user}
                onOpenAuth={(tab) => setAuthModalState({ isOpen: true, initialTab: tab })}
              />

              <Carousel
                title="⭐ Mais Bem Avaliados"
                movies={topRatedMovies}
                favoriteMovieIds={favoriteMovieIds}
                watchlistMovieIds={watchlistMovieIds}
                commentsCountByMovie={commentsCountByMovie}
                onSelect={setSelectedMovie}
                onToggleFavorite={handleToggleFavorite}
                onToggleWatched={handleToggleFavorite}
                onToggleWatchlist={handleToggleWatchlist}
                isGuest={!user}
                onOpenAuth={(tab) => setAuthModalState({ isOpen: true, initialTab: tab })}
              />

              <div className="section-divider-line" />
            </div>
          )}

          {/* =========================================================
              SEÇÃO COMPLETA: TODOS OS FILMES / FILTROS E GRID
              ========================================================= */}
          <section className="filter-grid-section">
            <div className="filter-grid-header">
              <h2 className="section-heading">
                {isSearching
                  ? `Resultados para "${searchQuery}"`
                  : activeTab === 'favorites'
                  ? 'Meus Filmes Favoritos'
                  : activeTab === 'comments'
                  ? 'Filmes com Anotações'
                  : 'Todos os Filmes'}
                <span className="results-counter">({filteredMovies.length})</span>
              </h2>

              {/* Botões de Ordenação em Pílula */}
              <div className="sort-pills-group">
                <span className="sort-label">Ordenar:</span>
                {[
                  { id: 'rating', label: 'Nota' },
                  { id: 'year', label: 'Ano' },
                  { id: 'title', label: 'Título' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`btn-sort-pill ${sortBy === s.id ? 'active' : ''}`}
                    onClick={() => setSortBy(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pílulas de Gênero */}
            {!isSearching && activeTab === 'all' && (
              <div className="genre-pills-scroll">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`btn-genre-pill ${activeGenre === g ? 'active' : ''}`}
                    onClick={() => setActiveGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {/* Loaders e Erros */}
            {loading && (
              <div className="loader-box">
                <div className="cinefilia-spinner" />
                <p>Carregando filmografia ao vivo do TMDB...</p>
              </div>
            )}

            {error && (
              <div className="error-card-state">
                <span className="error-icon">⚠️</span>
                <h3>Erro ao carregar filmes</h3>
                <p>{error}</p>
                <button type="button" className="btn-hero-primary" onClick={loadInitialData}>
                  Tentar Novamente
                </button>
              </div>
            )}

            {/* Grade de Filmes */}
            {!loading && !error && (
              <>
                {visibleGridMovies.length === 0 ? (
                  <div className="empty-catalog-state">
                    <p className="empty-message">Nenhum filme encontrado nesta categoria ou pesquisa.</p>
                    <button
                      type="button"
                      className="btn-sort-pill active"
                      onClick={() => {
                        setActiveTab('all');
                        setActiveGenre('Todos');
                        setSearchQuery('');
                      }}
                    >
                      Limpar Filtros
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="cinefilia-poster-grid">
                      {visibleGridMovies.map((movie) => (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          isFavorite={favoriteMovieIds.has(movie.id)}
                          isWatchlist={watchlistMovieIds.has(movie.id)}
                          commentCount={commentsCountByMovie[movie.id] || 0}
                          onToggleFavorite={handleToggleFavorite}
                          onToggleWatched={handleToggleFavorite}
                          onToggleWatchlist={handleToggleWatchlist}
                          onOpenDetails={setSelectedMovie}
                        />
                      ))}
                    </div>

                    {/* SEÇÃO COM 4 FILAS EM BLUR FRACO E MENSAGEM MINIMALISTA (MODO VISITANTE) */}
                    {!user && lockedGridMovies.length > 0 && (
                      <div className="preview-locked-container">
                        <div className="cinefilia-poster-grid preview-weak-blurred-grid" aria-hidden="true">
                          {lockedGridMovies.map((movie) => (
                            <MovieCard
                              key={`locked-${movie.id}`}
                              movie={movie}
                              isFavorite={false}
                              commentCount={0}
                              onToggleFavorite={() => setAuthModalState({ isOpen: true, initialTab: 'login' })}
                              onOpenDetails={() => setAuthModalState({ isOpen: true, initialTab: 'login' })}
                            />
                          ))}
                        </div>

                        <div className="preview-minimalist-overlay">
                          <div className="preview-minimalist-card">
                            <div className="preview-minimalist-icon">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                              </svg>
                            </div>
                            <h3 className="preview-minimalist-title">
                              Desbloqueie toda a filmografia (+60 obras)
                            </h3>
                            <p className="preview-minimalist-desc">
                              Cadastre-se gratuitamente para ver todos os títulos, avaliações e salvar seus favoritos.
                            </p>
                            <div className="preview-minimalist-buttons">
                              <button
                                type="button"
                                className="btn-minimalist-register"
                                onClick={() => setAuthModalState({ isOpen: true, initialTab: 'register' })}
                              >
                                Criar Conta Gratuita
                              </button>
                              <button
                                type="button"
                                className="btn-minimalist-login"
                                onClick={() => setAuthModalState({ isOpen: true, initialTab: 'login' })}
                              >
                                Entrar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </main>
      )}

      {/* MODAL COMPLETO DE DETALHES DO FILME */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          isFavorite={favoriteMovieIds.has(selectedMovie.id)}
          isWatchlist={watchlistMovieIds.has(selectedMovie.id)}
          user={user}
          onToggleFavorite={handleToggleFavorite}
          onToggleWatchlist={handleToggleWatchlist}
          onClose={() => setSelectedMovie(null)}
          onShowToast={showToast}
          onCommentChanged={handleReloadUserData}
          onRequireAuth={handleRequireAuth}
        />
      )}

      {/* POP-UP DE AÇÃO PARA VISITANTE (CURTIR / COMENTAR) */}
      <GuestActionModal
        isOpen={guestActionModal.isOpen}
        type={guestActionModal.type}
        movieTitle={guestActionModal.movieTitle}
        onClose={() => setGuestActionModal({ isOpen: false, type: 'favorite', movieTitle: '' })}
        onOpenAuth={(tab) => setAuthModalState({ isOpen: true, initialTab: tab })}
      />

      {/* MODAL DE AUTENTICAÇÃO (LOGIN / CADASTRO / OTP / RECUPERAÇÃO) */}
      {authModalState.isOpen && (
        <AuthModal
          initialTab={authModalState.initialTab}
          onAuthSuccess={(newUser) => {
            setUser(newUser);
            setAuthModalState({ isOpen: false, initialTab: 'login' });
          }}
          onShowToast={showToast}
          onClose={() => setAuthModalState({ isOpen: false, initialTab: 'login' })}
        />
      )}

      {/* FOOTER */}
      <footer className="cinefilia-footer">
        <p>
          Cinefilia · Filmografia de Tom Hanks · Desenvolvido para a disciplina de <strong>Computação em Nuvem</strong> lecionada pelo professor <strong>@siriani</strong>.
        </p>
        <p className="footer-subtext">
          Dados e imagens fornecidos ao vivo pelo TMDB (The Movie Database). Persistência e segurança isoladas no MariaDB.
        </p>
      </footer>

      {/* TOAST NOTIFICAÇÕES */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
