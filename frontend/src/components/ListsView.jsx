import React, { useState, useEffect, useMemo } from 'react';
import MovieCard from './MovieCard';
import { api } from '../services/api';

export default function ListsView({
  user,
  allMovies = [],
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

  // Estado da Tela "Criar / Editar Seleção"
  const [isCreatingSelection, setIsCreatingSelection] = useState(false);
  const [editingList, setEditingList] = useState(null); // null quando criando nova, objeto da lista quando editando
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [selectedMovieIds, setSelectedMovieIds] = useState(new Set());
  const [selectionSearchQuery, setSelectionSearchQuery] = useState('');
  const [savingSelection, setSavingSelection] = useState(false);

  const isCommon = cotas.papel === 'usuario';
  // Cota máxima de filmes: 10 para usuário comum, 50 para premium
  const maxMoviesLimit = isCommon ? 10 : 50;
  const isLimitReached = selectedMovieIds.size >= maxMoviesLimit;

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

      setSelectedList((prev) => ({
        ...prev,
        total_filmes: Math.max(0, prev.total_filmes - 1),
        filmes: prev.filmes.filter((f) => f.tmdb_movie_id !== tmdbMovieId)
      }));

      loadLists();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao remover filme da lista.', 'error');
    }
  };

  // Abrir tela para criar nova seleção
  const handleOpenCreateSelection = () => {
    if (isCommon && cotas.listasCriadas >= cotas.limiteListas) {
      if (onShowToast) onShowToast('Você atingiu o limite de 2 listas personalizadas no plano Comum!', 'error');
      return;
    }
    setEditingList(null);
    setNewListName('');
    setNewListDesc('');
    setSelectedMovieIds(new Set());
    setSelectionSearchQuery('');
    setIsCreatingSelection(true);
  };

  // Abrir tela para editar seleção existente (adicionar/remover filmes via botão "+")
  const handleOpenEditSelection = (list) => {
    setEditingList(list);
    setNewListName(list.nome);
    setNewListDesc(list.descricao || '');
    const currentIds = new Set((list.filmes || []).map((f) => f.tmdb_movie_id));
    setSelectedMovieIds(currentIds);
    setSelectionSearchQuery('');
    setIsCreatingSelection(true);
  };

  const handleToggleMovieSelection = (movieId) => {
    setSelectedMovieIds((prev) => {
      const next = new Set(prev);
      if (next.has(movieId)) {
        next.delete(movieId);
      } else {
        if (next.size >= maxMoviesLimit) {
          if (onShowToast) {
            onShowToast(`Limite máximo de ${maxMoviesLimit} filmes atingido no plano ${isCommon ? 'Comum' : 'Premium'}!`, 'error');
          }
          return prev;
        }
        next.add(movieId);
      }
      return next;
    });
  };

  const handleSaveSelection = async (e) => {
    if (e) e.preventDefault();
    if (!newListName.trim()) {
      if (onShowToast) onShowToast('Por favor, preencha o campo obrigatório de título.', 'error');
      return;
    }

    const selectedListItems = allMovies
      .filter((m) => selectedMovieIds.has(m.id))
      .map((m) => ({
        id: m.id,
        title: m.title,
        poster_path: m.poster_path
      }));

    setSavingSelection(true);
    try {
      if (editingList) {
        // Atualiza lista existente
        await api.lists.update(
          editingList.id,
          newListName.trim(),
          newListDesc.trim(),
          selectedListItems
        );
        if (onShowToast) {
          onShowToast(`Lista "${newListName.trim()}" atualizada com sucesso (${selectedListItems.length} filmes)!`, 'success');
        }
        // Recarrega detalhes da lista selecionada
        const res = await api.lists.getDetails(editingList.id);
        setSelectedList(res.lista);
      } else {
        // Cria nova lista
        await api.lists.create(newListName.trim(), newListDesc.trim(), selectedListItems);
        if (onShowToast) {
          onShowToast(`Seleção "${newListName.trim()}" criada com ${selectedListItems.length} filme(s)!`, 'success');
        }
      }

      setIsCreatingSelection(false);
      setEditingList(null);
      setNewListName('');
      setNewListDesc('');
      setSelectedMovieIds(new Set());
      loadLists();
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erro ao salvar seleção.', 'error');
    } finally {
      setSavingSelection(false);
    }
  };

  // Filtragem de filmes na tela de seleção
  const filteredSelectionMovies = useMemo(() => {
    if (!selectionSearchQuery.trim()) return allMovies;
    const q = selectionSearchQuery.toLowerCase().trim();
    return allMovies.filter(
      (m) =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.character && m.character.toLowerCase().includes(q)) ||
        (m.release_year && String(m.release_year).includes(q))
    );
  }, [allMovies, selectionSearchQuery]);

  const watchlist = listsData.find((l) => l.is_watchlist);
  const customLists = listsData.filter((l) => !l.is_watchlist);

  return (
    <div className="lists-view-container">
      {/* =========================================================
          1. TELA: CRIAR OU EDITAR SELEÇÃO DE FILMES
          ========================================================= */}
      {isCreatingSelection ? (
        <div className="create-selection-view">
          <div className="create-selection-header">
            <button
              type="button"
              className="btn-back-to-lists"
              onClick={() => {
                setIsCreatingSelection(false);
                setEditingList(null);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{editingList ? 'Voltar para a Lista' : 'Voltar para Minhas Listas'}</span>
            </button>

            <div className="create-selection-title-row">
              <div>
                <h1 className="create-selection-main-title">
                  {editingList ? `Editar Lista: ${editingList.nome}` : 'Criar Nova Seleção'}
                </h1>
                <p className="create-selection-subtitle">
                  {editingList
                    ? 'Adicione ou remova filmes clicando no botão verde nos filmes desejados.'
                    : 'Dê um título para sua seleção e clique no botão verde "Adicionar" nos filmes que deseja incluir.'}
                </p>
              </div>

              <div className="create-selection-top-actions">
                <div className={`selection-badge-count ${isLimitReached ? 'badge-at-limit' : ''}`}>
                  <strong>{selectedMovieIds.size}</strong>/{maxMoviesLimit} filmes selecionados
                </div>
                <button
                  type="button"
                  className="btn-save-selection"
                  disabled={savingSelection || !newListName.trim()}
                  onClick={handleSaveSelection}
                >
                  {savingSelection
                    ? 'Salvando...'
                    : editingList
                    ? `Salvar Alterações (${selectedMovieIds.size})`
                    : `Salvar Seleção (${selectedMovieIds.size})`}
                </button>
              </div>
            </div>
          </div>

          {/* Dados da Seleção (Nome e Descrição) */}
          <div className="selection-form-card">
            <div className="selection-inputs-grid">
              <div className="selection-field-wrap">
                <div className="selection-label-row">
                  <label className="selection-label" htmlFor="input-selection-name">
                    Nome da Seleção *
                  </label>
                  {!newListName.trim() && (
                    <span className="field-required-error-text">
                      Preencha o campo obrigatório
                    </span>
                  )}
                </div>
                <input
                  id="input-selection-name"
                  type="text"
                  className={`selection-input ${!newListName.trim() ? 'input-error-field' : ''}`}
                  placeholder="Ex: Clássicos Premiados, Melhores Dramas, Filmes dos Anos 90..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  maxLength={60}
                  autoFocus
                  required
                />
              </div>

              <div className="selection-field-wrap">
                <div className="selection-label-row">
                  <label className="selection-label" htmlFor="input-selection-desc">
                    Descrição (Opcional)
                  </label>
                </div>
                <input
                  id="input-selection-desc"
                  type="text"
                  className="selection-input"
                  placeholder="Sobre o que é esta seleção de filmes..."
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  maxLength={180}
                />
              </div>
            </div>

            {/* Barra de Busca de Filmes */}
            <div className="selection-search-bar">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="search-icon">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className="selection-search-input"
                placeholder="Buscar filmes pelo título ou ano para adicionar..."
                value={selectionSearchQuery}
                onChange={(e) => setSelectionSearchQuery(e.target.value)}
              />
              {selectionSearchQuery && (
                <button
                  type="button"
                  className="btn-clear-selection-search"
                  onClick={() => setSelectionSearchQuery('')}
                >
                  ✕ Limpar busca
                </button>
              )}
            </div>
          </div>

          {/* AVISO EM DESTAQUE AO ATINGIR O LIMITE MÁXIMO DE FILMES */}
          {isLimitReached && (
            <div className="selection-limit-reached-banner">
              <div className="limit-banner-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="limit-banner-text-box">
                <h4>Limite Máximo de {maxMoviesLimit} Filmes Atingido!</h4>
                <p>
                  {isCommon
                    ? `Você atingiu o limite de ${maxMoviesLimit} filmes para o plano Comum. Para adicionar outros títulos, remova algum filme selecionado ou faça upgrade para o plano Premium!`
                    : `Você atingiu o limite máximo de ${maxMoviesLimit} filmes para esta seleção.`}
                </p>
              </div>
            </div>
          )}

          {/* Grade de Filmes para Escolha com Capa e Botão "Adicionar" */}
          <div className="selection-grid-section">
            <div className="selection-grid-info-row">
              <h3>Catálogo de Filmes ({filteredSelectionMovies.length})</h3>
              <p className="selection-grid-hint">
                Clique no botão verde <strong>"Adicionar"</strong> ou na capa para selecionar o filme
              </p>
            </div>

            <div className="selection-posters-grid">
              {filteredSelectionMovies.map((movie) => {
                const isSelected = selectedMovieIds.has(movie.id);

                return (
                  <div
                    key={movie.id}
                    className={`selection-movie-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleToggleMovieSelection(movie.id)}
                  >
                    <div className="selection-poster-wrapper">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="selection-poster-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="selection-poster-fallback">
                          <span>Sem pôster</span>
                        </div>
                      )}

                      {isSelected && (
                        <div className="selection-check-badge">
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <polyline points="3 8.5 6.5 12 13 4" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="selection-card-details">
                      <h4 className="selection-movie-title" title={movie.title}>
                        {movie.title}
                      </h4>
                      <span className="selection-movie-year">
                        {movie.release_year || ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`btn-selection-toggle ${isSelected ? 'is-added' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMovieSelection(movie.id);
                      }}
                    >
                      {isSelected ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <polyline points="3 8.5 6.5 12 13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>Adicionado</span>
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                            <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <span>Adicionar</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : selectedList ? (
        /* =========================================================
            2. TELA: VISUALIZAÇÃO DE UMA LISTA ABERTA
            ========================================================= */
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

                <div className="selected-list-actions-group">
                  {/* BOTÃO "+" PARA ADICIONAR MAIS FILMES À LISTA */}
                  <button
                    type="button"
                    className="btn-add-more-movies-header"
                    onClick={() => handleOpenEditSelection(selectedList)}
                    title="Adicionar ou remover filmes desta lista"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                    <span>Adicionar mais filmes</span>
                  </button>

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
              </div>

              {selectedList.descricao && (
                <p className="selected-list-description">{selectedList.descricao}</p>
              )}

              <div className="selected-list-stats">
                <span>{selectedList.total_filmes} filme{selectedList.total_filmes !== 1 ? 's' : ''}</span>
                {isCommon && (
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
          ) : (
            <div className="cinefilia-poster-grid">
              {/* CARD '+' NA GRADE PARA ADICIONAR MAIS FILMES */}
              <div
                className="list-movie-item-wrap add-movie-grid-slot"
                onClick={() => handleOpenEditSelection(selectedList)}
                title="Adicionar mais filmes a esta lista"
              >
                <div className="add-movie-slot-box">
                  <div className="add-movie-plus-icon">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
                      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="add-movie-slot-text">Adicionar Filmes</span>
                </div>
              </div>

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
        /* =========================================================
            3. TELA PRINCIPAL: DASHBOARD DE TODAS AS LISTAS
            ========================================================= */
        <>
          <div className="lists-header-row">
            <div>
              <h1 className="lists-main-heading">Listas de Filmes</h1>
              <p className="lists-subheading">
                Organize sua filmografia, gerencie sua Watchlist e crie coleções temáticas personalizadas.
              </p>
            </div>

            {/* Controle de Cotas */}
            <div className="lists-quota-actions">
              <div className="quota-card-badge">
                <span className="quota-plan-label">
                  Plano <strong>{isCommon ? 'Comum' : cotas.papel === 'admin' ? 'Admin' : 'Premium'}</strong>
                </span>
                <span className="quota-values">
                  Listas: <strong>{cotas.listasCriadas}/{cotas.limiteListas}</strong>
                </span>
              </div>
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

              {/* CARD EXCLUSIVO DE CRIAÇÃO: "CRIAR NOVA SELEÇÃO" */}
              {(!isCommon || cotas.listasCriadas < cotas.limiteListas) && (
                <div
                  className="list-card-box create-list-slot"
                  onClick={handleOpenCreateSelection}
                >
                  <div className="create-slot-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <h4>Criar Nova Seleção</h4>
                  <p>Adicione um título e selecione os filmes para a sua coleção.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
