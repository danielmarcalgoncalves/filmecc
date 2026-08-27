import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import MovieCard from './components/MovieCard';
import MovieDetailModal from './components/MovieDetailModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import Toast from './components/Toast';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(api.auth.getStoredUser());
  const [movies, setMovies] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtros e Navegação
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'favorites' | 'comments'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // 'popularity' | 'rating' | 'year_desc' | 'year_asc' | 'title_asc'
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

  // Carrega os dados quando o usuário está autenticado
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Busca filmes do Tom Hanks na API do TMDB
      const moviesRes = await api.movies.getTomHanks();
      setMovies(moviesRes.movies || []);

      // 2. Busca favoritos e comentários do usuário atual no MariaDB
      const [favsRes, commsRes] = await Promise.all([
        api.favorites.getAll(),
        api.comments.getAll()
      ]);

      setFavorites(favsRes.favoritos || []);
      setComments(commsRes.comentarios || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleReloadUserData = async () => {
    try {
      const [favsRes, commsRes] = await Promise.all([
        api.favorites.getAll(),
        api.comments.getAll()
      ]);
      setFavorites(favsRes.favoritos || []);
      setComments(commsRes.comentarios || []);
    } catch (err) {
      console.error('Erro ao atualizar dados do usuário:', err);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setMovies([]);
    setFavorites([]);
    setComments([]);
    setSelectedMovie(null);
    showToast('Sessão encerrada com sucesso.', 'success');
  };

  // Adiciona ou remove filme dos favoritos
  const handleToggleFavorite = async (movie) => {
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

  // Mapeamento de comentários por filme
  const commentsCountByMovie = useMemo(() => {
    const map = {};
    for (const c of comments) {
      map[c.tmdb_movie_id] = (map[c.tmdb_movie_id] || 0) + 1;
    }
    return map;
  }, [comments]);

  // Conjunto de IDs favoritados para verificação rápida O(1)
  const favoriteMovieIds = useMemo(() => {
    return new Set(favorites.map((f) => f.tmdb_movie_id));
  }, [favorites]);

  // Lista filtrada e ordenada de filmes
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    // Filtro por Aba
    if (activeTab === 'favorites') {
      result = result.filter((m) => favoriteMovieIds.has(m.id));
    } else if (activeTab === 'comments') {
      result = result.filter((m) => Boolean(commentsCountByMovie[m.id]));
    }

    // Filtro por Busca de Texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.character && m.character.toLowerCase().includes(q)) ||
          (m.release_year && m.release_year.includes(q)) ||
          (m.overview && m.overview.toLowerCase().includes(q))
      );
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === 'popularity') {
        return (b.popularity || 0) - (a.popularity || 0);
      }
      if (sortBy === 'rating') {
        return (b.vote_average || 0) - (a.vote_average || 0);
      }
      if (sortBy === 'year_desc') {
        return (b.release_date || '').localeCompare(a.release_date || '');
      }
      if (sortBy === 'year_asc') {
        return (a.release_date || '').localeCompare(b.release_date || '');
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [movies, activeTab, searchQuery, sortBy, favoriteMovieIds, commentsCountByMovie]);

  // Se houver um token na URL, mostra a tela de redefinir senha
  if (resetToken && !user) {
    return (
      <>
        <ResetPasswordModal 
          token={resetToken} 
          onSuccess={() => {
            // Remove o token da URL e do estado
            window.history.replaceState({}, document.title, window.location.pathname);
            setResetToken(null);
          }} 
          onShowToast={showToast} 
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  // Se não estiver autenticado e não tiver token, exibe a tela de login/cadastro
  if (!user) {
    return (
      <>
        <AuthModal onAuthSuccess={setUser} onShowToast={showToast} />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="main-content">
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-badge">
            <span>✨ Filmografia Completa TMDB</span>
          </div>
          <h2 className="hero-title">Tom Hanks Film Collection</h2>
          <p className="hero-subtitle">
            Explore grandes clássicos e produções do premiado ator. Salve seus filmes favoritos e registre anotações pessoais com dados isolados exclusivamente na sua conta.
          </p>
        </section>

        {/* CONTROLES, ABAS E BUSCA */}
        <section className="controls-container">
          <div className="controls-row">
            <div className="filter-tabs">
              <button
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <span>Todos os Filmes</span>
                <span className="tab-count">{movies.length}</span>
              </button>

              <button
                className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                <span>Meus Favoritos</span>
                <span className="tab-count">{favorites.length}</span>
              </button>

              <button
                className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                <span>Comentados</span>
                <span className="tab-count">{Object.keys(commentsCountByMovie).length}</span>
              </button>
            </div>

            <div className="search-and-sort">
              <div className="search-box">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar por título, papel ou ano..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popularity">Mais Populares</option>
                <option value="rating">Melhor Avaliados</option>
                <option value="year_desc">Mais Recentes</option>
                <option value="year_asc">Mais Antigos</option>
                <option value="title_asc">Ordem Alfabética (A-Z)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ERROS / LOADERS */}
        {error && (
          <div className="empty-state" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            <div className="empty-icon" style={{ color: 'var(--accent-red)' }}>⚠️</div>
            <h3>Não foi possível carregar os filmes</h3>
            <p>{error}</p>
            <button className="btn-auth-submit" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={loadInitialData}>
              Tentar Novamente
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Carregando filmografia ao vivo do TMDB...</p>
          </div>
        )}

        {/* LISTA / GRID DE FILMES */}
        {!loading && !error && (
          <>
            {filteredMovies.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎬</div>
                <h3>Nenhum filme encontrado</h3>
                <p>
                  {activeTab === 'favorites'
                    ? 'Você ainda não favoritou nenhum filme. Clique no ícone de coração nos cards para adicionar aos favoritos!'
                    : activeTab === 'comments'
                    ? 'Você ainda não escreveu comentários em nenhum filme. Abra um filme para deixar suas anotações!'
                    : 'Nenhum resultado corresponde à sua pesquisa. Tente outros termos de busca.'}
                </p>
                {(activeTab !== 'all' || searchQuery) && (
                  <button
                    className="tab-btn active"
                    style={{ margin: '0 auto' }}
                    onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
                  >
                    Ver Todos os Filmes
                  </button>
                )}
              </div>
            ) : (
              <div className="movies-grid">
                {filteredMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    isFavorite={favoriteMovieIds.has(movie.id)}
                    commentCount={commentsCountByMovie[movie.id] || 0}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenDetails={(m) => setSelectedMovie(m)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL DE DETALHES E COMENTÁRIOS */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          isFavorite={favoriteMovieIds.has(selectedMovie.id)}
          user={user}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setSelectedMovie(null)}
          onShowToast={showToast}
          onCommentChanged={handleReloadUserData}
        />
      )}

      {/* FOOTER */}
      <footer className="app-footer">
        <p>
          Catálogo de Filmes — Tom Hanks • Desenvolvido para a disciplina de <strong>Computação em Nuvem</strong> lecionada pelo professor <strong>@siriani</strong>.
        </p>
        <p style={{ marginTop: '0.35rem', opacity: 0.7 }}>
          Dados e imagens fornecidos ao vivo pela API do TMDB (The Movie Database). Persistência individual no MariaDB.
        </p>
      </footer>

      {/* TOAST ALERTS */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
