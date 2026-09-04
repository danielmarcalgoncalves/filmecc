import React, { useState, useEffect } from 'react';
import MovieCard from './MovieCard';
import { api } from '../services/api';

export default function ListsView({
  user,
  onShowToast,
  onSelectMovie,
  onRequireAuth,
  favoriteMovieIds = new Set(),
  watchedMovieIds = new Set(),
  watchlistMovieIds = new Set(),
  onToggleFavorite,
  onToggleWatchlist
}) {
  const [listsData, setListsData] = useState([]);
  const [cotas, setCotas] = useState({
    papel: user?.papel || 'usuario',
    listasCriadas: 0,
    limiteListas: user?.papel === 'usuario' ? 2 : 10,
    limiteWatchlist: user?.papel === 'usuario' ? 10 : 9999
  });
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [loadingSelectedList, setLoadingSelectedList] = useState(false);

  // Modal para criar nova lista
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadLists();
    }
  }, [user]);

  const loadLists = async () => {
    setLoading(true);
    try {
      const res = await api.lists.getAll();
      setListsData(res.listas || []);
      if (res.cotas) setCotas(res.cotas);
    } catch (err) {
      console.error('Erro ao carregar listas:', err);
      if (onShowToast) onShowToast(err.message || 'Erro ao carregar listas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenList = async (list) => {
    setLoadingSelectedList(true);
    try {
      const res = await api.lists.getDetails(list.id);
      setSelectedList(res.lista);
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao abrir lista.', 'error');
    } finally {
      setLoadingSelectedList(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setCreating(true);
    try {
      const res = await api.lists.create(newListName.trim(), newListDesc.trim());
      if (onShowToast) onShowToast('Lista criada com sucesso!', 'success');
      setNewListName('');
      setNewListDesc('');
      setCreateModalOpen(false);
      loadLists();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao criar lista.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async (listId, listName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir a lista "${listName}"?`)) {
      return;
    }

    try {
      await api.lists.delete(listId);
      if (onShowToast) onShowToast(`Lista "${listName}" excluída.`, 'success');
      if (selectedList?.id === listId) {
        setSelectedList(null);
      }
      loadLists();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao excluir lista.', 'error');
    }
  };

  const handleRemoveMovieFromList = async (tmdbMovieId, movieTitle, e) => {
    if (e) e.stopPropagation();
    if (!selectedList) return;

    try {
      await api.lists.removeMovie(selectedList.id, tmdbMovieId);
      if (onShowToast) onShowToast(`"${movieTitle}" removido da lista.`, 'success');
      
      // Atualiza lista aberta localmente
      setSelectedList((prev) => ({
        ...prev,
        total_filmes: Math.max(0, prev.total_filmes - 1),
        filmes: prev.filmes.filter((f) => f.tmdb_movie_id !== tmdbMovieId)
      }));

      // Se for a watchlist, atualiza também a contagem global
      if (selectedList.is_watchlist && onToggleWatchlist) {
        // Notifica o app
      }
      loadLists();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao remover filme da lista.', 'error');
    }
  };

  const watchlist = listsData.find((l) => l.is_watchlist);
  const customLists = listsData.filter((l) => !l.is_watchlist);
  const isCommon = cotas.papel === 'usuario';

  return (
    <div className="lists-view-container">
      {/* Visualização de uma Lista Aberta */}
      {selectedList ? (
        <div className="selected-list-view">
          <div className="selected-list-header">
            <button
              type="button"
              className="btn-back-to-lists"
              onClick={() => setSelectedList(null)}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Todas as Listas</span>
            </button>

            <div className="selected-list-info">
              <div className="selected-list-title-row">
                <h2>{selectedList.nome}</h2>
                {selectedList.is_watchlist && (
                  <span className="watchlist-badge-tag">📌 Fixa do Sistema</span>
                )}
                {!selectedList.is_watchlist && (
                  <button
                    type="button"
                    className="btn-delete-list-icon"
                    onClick={(e) => handleDeleteList(selectedList.id, selectedList.nome, e)}
                    title="Excluir esta lista"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Excluir Lista</span>
                  </button>
                )}
              </div>

              {selectedList.descricao && (
                <p className="selected-list-description">{selectedList.descricao}</p>
              )}

              <div className="selected-list-stats">
                <span>{selectedList.total_filmes} filme{selectedList.total_filmes !== 1 ? 's' : ''}</span>
                {selectedList.is_watchlist && isCommon && (
                  <span className="quota-pill-indicator">
                    {selectedList.total_filmes}/10 da cota gratuita
                  </span>
                )}
              </div>
            </div>
          </div>

          {loadingSelectedList ? (
            <div className="loader-box">
              <div className="cinefilia-spinner" />
              <p>Carregando filmes da lista...</p>
            </div>
          ) : selectedList.filmes?.length === 0 ? (
            <div className="empty-catalog-state">
              <p className="empty-message">Esta lista ainda não possui nenhum filme adicionado.</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Navegue pelo catálogo e use o botão de Watchlist ou Detalhes para adicionar obras a esta lista!
              </p>
            </div>
          ) : (
            <div className="cinefilia-poster-grid">
              {selectedList.filmes?.map((item) => {
                const movieObj = {
                  id: item.tmdb_movie_id,
                  title: item.titulo,
                  poster_path: item.poster_path,
                  poster_url: item.poster_url
                };

                return (
                  <div key={item.id} className="list-movie-item-wrap">
                    <MovieCard
                      movie={movieObj}
                      isFavorite={favoriteMovieIds.has(item.tmdb_movie_id)}
                      isWatched={watchedMovieIds.has(item.tmdb_movie_id)}
                      isWatchlist={watchlistMovieIds.has(item.tmdb_movie_id)}
                      onToggleFavorite={onToggleFavorite}
                      onToggleWatched={onToggleFavorite}
                      onToggleWatchlist={onToggleWatchlist}
                      onOpenDetails={() => onSelectMovie(movieObj)}
                    />
                    <button
                      type="button"
                      className="btn-remove-from-list"
                      onClick={(e) => handleRemoveMovieFromList(item.tmdb_movie_id, item.titulo, e)}
                      title="Remover desta lista"
                    >
                      × Remover da lista
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Visão Geral com Cards de Todas as Listas */
        <>
          <div className="lists-header-row">
            <div>
              <h1 className="lists-main-heading">Listas de Filmes</h1>
              <p className="lists-subheading">
                Organize sua filmografia, gerencie sua Watchlist e crie coleções temáticas personalizadas.
              </p>
            </div>

            {/* Controle de Cotas e Ação de Criar Lista */}
            <div className="lists-quota-actions">
              <div className="quota-card-badge">
                <span className="quota-plan-label">
                  Plano <strong>{isCommon ? 'Comum' : cotas.papel === 'admin' ? 'Admin' : 'Premium'}</strong>
                </span>
                <span className="quota-values">
                  Listas: <strong>{cotas.listasCriadas}/{cotas.limiteListas}</strong>
                </span>
              </div>

              <button
                type="button"
                className="btn-create-list-primary"
                onClick={() => {
                  if (isCommon && cotas.listasCriadas >= cotas.limiteListas) {
                    if (onShowToast) onShowToast('Você atingiu o limite de 2 listas personalizadas no plano gratuito!', 'error');
                    return;
                  }
                  setCreateModalOpen(true);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>Criar Nova Lista</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loader-box">
              <div className="cinefilia-spinner" />
              <p>Carregando suas listas...</p>
            </div>
          ) : (
            <div className="lists-dashboard-grid">
              {/* CARD FIXO: WATCHLIST */}
              {watchlist && (
                <div
                  className="list-card-box watchlist-card-box"
                  onClick={() => handleOpenList(watchlist)}
                >
                  <div className="list-card-badge-top">
                    <span className="watchlist-icon-pill">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Watchlist Oficial
                    </span>
                    <span className="list-card-counter">
                      {watchlist.total_filmes}{isCommon ? '/10' : ''} filmes
                    </span>
                  </div>

                  <h3 className="list-card-title">Quero Assistir (Watchlist)</h3>
                  <p className="list-card-desc">
                    Filmes marcados para assistir em breve. Adicione com 1 clique direto no pôster.
                  </p>

                  {/* Pilha de Miniaturas dos Últimos Filmes */}
                  <div className="list-poster-stack">
                    {watchlist.posters && watchlist.posters.length > 0 ? (
                      watchlist.posters.map((p, idx) => (
                        <div key={idx} className="poster-stack-item">
                          {p.poster_url ? (
                            <img src={p.poster_url} alt={p.titulo} />
                          ) : (
                            <div className="poster-stack-fallback" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="poster-stack-empty">Nenhum filme na Watchlist ainda</div>
                    )}
                  </div>
                </div>
              )}

              {/* LISTAS PERSONALIZADAS DO USUÁRIO */}
              {customLists.map((list) => (
                <div
                  key={list.id}
                  className="list-card-box custom-list-card-box"
                  onClick={() => handleOpenList(list)}
                >
                  <div className="list-card-badge-top">
                    <span className="custom-list-tag">Personalizada</span>
                    <div className="list-card-top-actions">
                      <span className="list-card-counter">{list.total_filmes} filmes</span>
                      <button
                        type="button"
                        className="btn-card-trash-icon"
                        onClick={(e) => handleDeleteList(list.id, list.nome, e)}
                        title="Excluir lista"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <h3 className="list-card-title">{list.nome}</h3>
                  <p className="list-card-desc">
                    {list.descricao || 'Lista personalizada criada por você.'}
                  </p>

                  <div className="list-poster-stack">
                    {list.posters && list.posters.length > 0 ? (
                      list.posters.map((p, idx) => (
                        <div key={idx} className="poster-stack-item">
                          {p.poster_url ? (
                            <img src={p.poster_url} alt={p.titulo} />
                          ) : (
                            <div className="poster-stack-fallback" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="poster-stack-empty">Lista vazia</div>
                    )}
                  </div>
                </div>
              ))}

              {/* CARD DE ADIÇÃO DE NOVA LISTA */}
              {(!isCommon || cotas.listasCriadas < cotas.limiteListas) && (
                <div
                  className="list-card-box create-list-slot"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <div className="create-slot-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <h4>Criar Nova Coleção</h4>
                  <p>Adicione um título temático e agrupe seus filmes favoritos.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL PARA CRIAR NOVA LISTA */}
      {createModalOpen && (
        <div className="modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div className="create-list-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="create-list-modal-header">
              <h3>Criar Nova Lista</h3>
              <button
                type="button"
                className="btn-close-modal-icon"
                onClick={() => setCreateModalOpen(false)}
              >
                ×
              </button>
            </div>

            <p className="create-list-modal-desc">
              Você pode criar até {cotas.limiteListas} listas no plano {isCommon ? 'Comum' : 'Premium'}.
            </p>

            <form onSubmit={handleCreateList}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-list-name">Nome da Lista *</label>
                <input
                  id="input-list-name"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Clássicos Inesquecíveis, Anos 90, Comédias"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  maxLength={60}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-list-desc">Descrição (Opcional)</label>
                <textarea
                  id="input-list-desc"
                  className="form-input"
                  style={{ minHeight: '75px', resize: 'vertical' }}
                  placeholder="Sobre o que é esta lista de filmes..."
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="create-list-modal-buttons">
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-submit-modal"
                  disabled={creating || !newListName.trim()}
                >
                  {creating ? 'Criando...' : 'Salvar Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
