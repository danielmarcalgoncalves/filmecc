import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import GuestActionModal from './components/GuestActionModal';
import MovieCard from './components/MovieCard';
import MovieDetailModal from './components/MovieDetailModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import AdminDashboard from './components/AdminDashboard';
import Toast from './components/Toast';
import { api } from './services/api';

export default function App() {
  const [user, setUser] = useState(api.auth.getStoredUser());
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog' | 'admin'
  const [movies, setMovies] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modais de Autenticação e Ação de Visitante
  const [authModalState, setAuthModalState] = useState({ isOpen: false, initialTab: 'login' });
  const [guestActionModal, setGuestActionModal] = useState({ isOpen: false, type: 'favorite', movieTitle: '' });

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

  // Barra de controles sticky ao rolar
  const [isControlsSticky, setIsControlsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsControlsSticky(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Carrega os dados da filmografia e dados isolados do usuário se logado
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

      // 2. Se houver usuário autenticado, busca favoritos e comentários do MariaDB
      if (user) {
        const [favsRes, commsRes] = await Promise.all([
          api.favorites.getAll(),
          api.comments.getAll()
        ]);
        setFavorites(favsRes.favoritos || []);
        setComments(commsRes.comentarios || []);
      } else {
        setFavorites([]);
        setComments([]);
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
    setFavorites([]);
    setComments([]);
    setSelectedMovie(null);
    setCurrentView('catalog');
    showToast('Sessão encerrada com sucesso.', 'success');
  };

  // Aciona o pop-up de aviso para visitantes quando tentam curtir ou comentar
  const handleRequireAuth = (type = 'favorite', movieTitle = '') => {
    setGuestActionModal({
      isOpen: true,
      type,
      movieTitle: movieTitle || ''
    });
  };

  // Adiciona ou remove filme dos favoritos
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

  // Separação para visitantes: 6 primeiros filmes nas duas primeiras linhas e a 3ª linha com blur (+3 filmes)
  const visibleMovies = useMemo(() => {
    return user ? filteredMovies : filteredMovies.slice(0, 6);
  }, [user, filteredMovies]);

  const lockedRowMovies = useMemo(() => {
    return !user ? filteredMovies.slice(6, 9) : [];
  }, [user, filteredMovies]);

  const handleTabSelect = (tab) => {
    if (!user && (tab === 'favorites' || tab === 'comments')) {
      handleRequireAuth(tab === 'favorites' ? 'favorite' : 'comment');
      return;
    }
    setActiveTab(tab);
  };

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

  return (
    <div className="app-container">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        currentView={currentView}
        onOpenAdmin={() => setCurrentView((prev) => (prev === 'admin' ? 'catalog' : 'admin'))}
        onOpenAuth={(tab) => setAuthModalState({ isOpen: true, initialTab: tab })}
      />

      {/* SE FOR VISÃO DE ADMIN: RENDERIZA A NOVA PÁGINA COM TODOS OS USUÁRIOS E COMENTÁRIOS */}
      {currentView === 'admin' && user?.papel === 'admin' ? (
        <main className="main-content">
          <AdminDashboard 
            user={user} 
            onBack={() => setCurrentView('catalog')} 
            onShowToast={showToast} 
          />
        </main>
      ) : (
        <main className="main-content">
          {/* HERO SECTION */}
          <section className="hero-section">
            <div className="hero-badge">
              <span>{user ? '✨ Filmografia Completa TMDB' : '✨ Modo Degustação Aberta • Filmografia TMDB'}</span>
            </div>
            <h2 className="hero-title">Tom Hanks Film Collection</h2>
            <p className="hero-subtitle">
              {user
                ? 'Explore grandes clássicos e produções do premiado ator. Salve seus filmes favoritos e registre anotações pessoais com dados isolados exclusivamente na sua conta.'
                : 'Explore grandes clássicos e produções premiadas com dados em tempo real do TMDB. Você está na prévia de degustação — navegue pelas obras abaixo ou cadastre-se gratuitamente para desbloquear toda a coleção, favoritar e comentar!'}
            </p>
          </section>

          {/* CONTROLES, ABAS E BUSCA */}
          <section className={`controls-container ${isControlsSticky ? 'is-sticky' : ''}`}>
            <div className="controls-row">
              <div className="filter-tabs">
                <button
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => handleTabSelect('all')}
                >
                  <span>Todos os Filmes</span>
                  <span className="tab-count">{movies.length}</span>
                </button>

                <button
                  className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                  onClick={() => handleTabSelect('favorites')}
                  title={!user ? 'Crie uma conta para salvar favoritos' : 'Filmes favoritados'}
                >
                  <span>Meus Favoritos</span>
                  <span className="tab-count">{user ? favorites.length : '🔒'}</span>
                </button>

                <button
                  className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                  onClick={() => handleTabSelect('comments')}
                  title={!user ? 'Crie uma conta para fazer anotações' : 'Filmes comentados'}
                >
                  <span>Comentados</span>
                  <span className="tab-count">{user ? Object.keys(commentsCountByMovie).length : '🔒'}</span>
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
              {visibleMovies.length === 0 ? (
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
                <>
                  {/* LINHAS NÍTIDAS (AS 2 PRIMEIRAS LINHAS / 6 FILMES NO MODO VISITANTE) */}
                  <div className="movies-grid">
                    {visibleMovies.map((movie) => (
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

                  {/* TERCEIRA LINHA COM EFEITO BLUR E BLOQUEIO DE DEGUSTAÇÃO (MODO VISITANTE) */}
                  {!user && lockedRowMovies.length > 0 && (
                    <div className="preview-locked-container">
                      <div className="movies-grid preview-blurred-grid" aria-hidden="true">
                        {lockedRowMovies.map((movie) => (
                          <MovieCard
                            key={movie.id}
                            movie={movie}
                            isFavorite={false}
                            commentCount={0}
                            onToggleFavorite={() => handleRequireAuth('favorite', movie.title)}
                            onOpenDetails={() => handleRequireAuth('favorite', movie.title)}
                          />
                        ))}
                      </div>

                      <div className="preview-locked-overlay">
                        <div className="preview-locked-content">
                          <div className="preview-lock-badge">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          </div>
                          <h3 className="preview-locked-title">Desbloqueie a Coleção Completa (+60 Filmes)</h3>
                          <p className="preview-locked-desc">
                            Você chegou ao limite da degustação. Crie sua conta gratuita em poucos segundos para explorar a filmografia completa, salvar seus títulos favoritos e registrar anotações exclusivas no seu banco individual.
                          </p>
                          <div className="preview-locked-btn-group">
                            <button
                              className="btn-preview-cta-register"
                              onClick={() => setAuthModalState({ isOpen: true, initialTab: 'register' })}
                            >
                              <span>Criar Conta Gratuita</span>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </button>
                            <button
                              className="btn-preview-cta-login"
                              onClick={() => setAuthModalState({ isOpen: true, initialTab: 'login' })}
                            >
                              Já sou cadastrado / Entrar
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
        </main>
      )}

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

      {/* MODAL DE AUTENTICAÇÃO (LOGIN / CADASTRO / RECUPERAÇÃO) */}
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
