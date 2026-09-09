import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';

/**
 * ProfilePage
 * Página completa de perfil do usuário.
 *
 * Visão Inicial (Leitura):
 * - Foto de perfil (MinIO)
 * - Nome, email, papel/badge e bio do usuário
 * - Botão "Editar Perfil" no canto superior direito
 * - Carrossel de Filmes Favoritados com rolagem suave e clique para ver detalhes
 * - Seção de Listas do usuário com nomes e cards clicáveis direcionando para o painel de listas
 *
 * Visão de Edição:
 * - Aberta ao clicar em "Editar Perfil"
 * - Permite trocar a foto (MinIO), editar o nome de exibição e a bio
 * - Botões Salvar Alterações e Cancelar/Voltar
 */
export default function ProfilePage({
  user,
  onUpdateUser,
  showToast,
  onBack,
  favorites = [],
  allMovies = [],
  onSelectMovie,
  onNavigateToLists,
  favoriteMovieIds = new Set(),
  watchlistMovieIds = new Set(),
  onToggleFavorite,
  onToggleWatchlist
}) {
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [isEditing, setIsEditing]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [nome, setNome]                   = useState('');
  const [bio, setBio]                     = useState('');
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [userLists, setUserLists]         = useState([]);
  const [loadingLists, setLoadingLists]   = useState(false);

  const fileInputRef = useRef(null);
  const carouselScrollRef = useRef(null);

  // Carrega os dados do perfil e as listas criadas pelo usuário
  useEffect(() => {
    setLoading(true);
    api.profile.get()
      .then((data) => {
        setProfile(data.usuario);
        setNome(data.usuario.nome || '');
        setBio(data.usuario.bio || '');
      })
      .catch(() => showToast('Erro ao carregar dados do perfil.', 'error'))
      .finally(() => setLoading(false));

    loadUserLists();
  }, []);

  const loadUserLists = async () => {
    setLoadingLists(true);
    try {
      const res = await api.lists.getAll();
      setUserLists(res.listas || []);
    } catch (err) {
      console.warn('Erro ao carregar listas do usuário:', err.message);
    } finally {
      setLoadingLists(false);
    }
  };

  // Mapeia os favoritos para a lista completa com poster, título, nota e sinopse
  const favoriteMovies = useMemo(() => {
    if (!favorites || favorites.length === 0) return [];
    return favorites.map((fav) => {
      const full = allMovies.find((m) => m.id === fav.tmdb_movie_id);
      if (full) return full;
      return {
        id: fav.tmdb_movie_id,
        title: fav.titulo,
        poster_path: fav.poster_path,
        poster_url: fav.poster_url || (fav.poster_path ? `https://image.tmdb.org/t/p/w500${fav.poster_path}` : null),
        vote_average: fav.vote_average || 0,
        release_date: fav.release_date || '',
        release_year: fav.release_year || (fav.release_date ? fav.release_date.slice(0, 4) : '')
      };
    });
  }, [favorites, allMovies]);

  // Rolagem suave do carrossel de favoritos
  const handleScrollCarousel = (direction) => {
    if (carouselScrollRef.current) {
      carouselScrollRef.current.scrollBy({
        left: direction * 320,
        behavior: 'smooth'
      });
    }
  };

  // Seleção e preview de foto de perfil
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const tiposValidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposValidos.includes(file.type)) {
      showToast('Formato inválido. Use JPEG, PNG ou WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Imagem muito grande. Limite de 5 MB.', 'error');
      return;
    }

    setSelectedFile(file);

    // FileReader garante base64 instantâneo e estável antes e durante o upload
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Upload da foto para o MinIO
  async function handleUploadAvatar() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const data = await api.profile.uploadAvatar(selectedFile);
      showToast('Foto de perfil atualizada com sucesso!', 'success');
      // Invalidação de cache via timestamp para visualização imediata
      const newFotoUrl = data.foto_url ? `${data.foto_url}?t=${Date.now()}` : data.foto_url;
      setProfile((prev) => ({ ...prev, foto_url: newFotoUrl }));
      setSelectedFile(null);
      setPreviewUrl(null);
      if (onUpdateUser) onUpdateUser({ foto_url: newFotoUrl });
    } catch (err) {
      showToast(err.message || 'Erro ao fazer upload da foto.', 'error');
    } finally {
      setUploading(false);
    }
  }

  function handleCancelPreview() {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Salva nome e bio (e faz upload automático da foto caso tenha sido selecionada)
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('O nome não pode ficar vazio.', 'error');
      return;
    }
    setSaving(true);
    try {
      let novaFotoUrl = profile?.foto_url;
      // Se houver arquivo selecionado ainda não confirmado, faz o upload automaticamente agora
      if (selectedFile) {
        const uploadRes = await api.profile.uploadAvatar(selectedFile);
        novaFotoUrl = uploadRes.foto_url ? `${uploadRes.foto_url}?t=${Date.now()}` : uploadRes.foto_url;
        setSelectedFile(null);
        setPreviewUrl(null);
      }

      const data = await api.profile.update({ nome: nome.trim(), bio: bio.trim() });
      showToast('Perfil salvo com sucesso!', 'success');
      setProfile((prev) => ({
        ...prev,
        nome: data.usuario.nome,
        bio: data.usuario.bio,
        foto_url: novaFotoUrl || prev.foto_url
      }));
      if (onUpdateUser) {
        onUpdateUser({
          nome: data.usuario.nome,
          bio: data.usuario.bio,
          foto_url: novaFotoUrl || profile?.foto_url
        });
      }
      setIsEditing(false); // Retorna para a visualização principal
    } catch (err) {
      showToast(err.message || 'Erro ao salvar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = previewUrl || profile?.foto_url || user?.foto_url;
  const inicial = (profile?.nome || user?.nome || 'U').charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="profile-page-loading">
        <div className="profile-spinner"></div>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Barra de Topo com Navegação e Botão de Editar Perfil */}
      <div className="profile-top-navbar">
        {onBack && (
          <button
            type="button"
            className="profile-back-btn"
            onClick={isEditing ? () => { setIsEditing(false); handleCancelPreview(); } : onBack}
            title={isEditing ? 'Voltar ao perfil' : 'Voltar ao catálogo'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {isEditing ? 'Voltar ao Perfil' : 'Voltar ao Catálogo'}
          </button>
        )}

        {!isEditing && (
          <button
            type="button"
            className="btn-profile-edit-trigger"
            onClick={() => setIsEditing(true)}
            title="Editar informações do perfil e foto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>Editar Perfil</span>
          </button>
        )}
      </div>

      {/* ====================================================================
          1. MODO DE EDIÇÃO DO PERFIL (Quando o usuário clica em "Editar Perfil")
          ==================================================================== */}
      {isEditing ? (
        <div className="profile-edit-view animate-fade-in">
          <div className="profile-edit-header">
            <h1 className="profile-edit-title">Editar Meu Perfil</h1>
            <p className="profile-edit-subtitle">Atualize sua foto, nome de exibição e biografia cinematográfica.</p>
          </div>

          <div className="profile-edit-container">
            {/* Seção de Troca de Foto de Perfil (MinIO) */}
            <div className="profile-avatar-edit-box">
              <div className="profile-avatar-large profile-avatar-interactive">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Foto de perfil"
                    className="profile-avatar-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <span
                  className="profile-avatar-initial"
                  style={{ display: avatarSrc ? 'none' : 'flex' }}
                >
                  {inicial}
                </span>

                {uploading ? (
                  <div className="profile-avatar-uploading-overlay">
                    <span className="btn-spinner-sm"></span>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Enviando...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="profile-avatar-overlay"
                    onClick={() => fileInputRef.current?.click()}
                    title="Selecionar nova foto de perfil"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Alterar Foto</span>
                  </button>
                )}
              </div>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="avatar-file-input"
              />

              {previewUrl && (
                <div className="profile-preview-actions">
                  <button
                    type="button"
                    className="btn-profile-confirm"
                    onClick={handleUploadAvatar}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="btn-spinner-sm"></span>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Confirmar Foto
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-profile-cancel-preview"
                    onClick={handleCancelPreview}
                    disabled={uploading}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <p className="profile-avatar-hint">Formatos: JPEG, PNG ou WebP (máx. 5MB). Armazenamento no MinIO.</p>
            </div>

            {/* Formulário de Edição de Dados */}
            <form className="profile-form-card" onSubmit={handleSaveProfile}>
              <div className="profile-field">
                <label htmlFor="profile-nome" className="profile-label">Nome de Exibição</label>
                <input
                  id="profile-nome"
                  type="text"
                  className="profile-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={100}
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-email" className="profile-label">E-mail (fixo da conta)</label>
                <input
                  id="profile-email"
                  type="email"
                  className="profile-input profile-input-disabled"
                  value={profile?.email || ''}
                  disabled
                />
              </div>

              <div className="profile-field">
                <label htmlFor="profile-bio" className="profile-label">
                  Biografia Cinematográfica <span className="profile-label-hint">({(bio || '').length}/500)</span>
                </label>
                <textarea
                  id="profile-bio"
                  className="profile-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Compartilhe seus gostos sobre cinema, filmes favoritos do Tom Hanks, diretores prediletos..."
                />
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="btn-profile-cancel-edit"
                  onClick={() => { setIsEditing(false); handleCancelPreview(); }}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-profile-save"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="btn-spinner-sm"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ====================================================================
            2. MODO PRINCIPAL DE VISUALIZAÇÃO DO PERFIL
            ==================================================================== */
        <div className="profile-view-content animate-fade-in">
          {/* Hero do Perfil: Foto, Nome, Bio e Estatísticas */}
          <section className="profile-hero-card">
            <div className="profile-hero-backdrop-glow" />

            <div className="profile-hero-main">
              <div className="profile-avatar-display-wrapper">
                <div className="profile-avatar-large profile-avatar-glow">
                  {profile?.foto_url || user?.foto_url ? (
                    <img
                      src={profile?.foto_url || user?.foto_url}
                      alt={profile?.nome || user?.nome}
                      className="profile-avatar-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) {
                          e.target.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <span
                    className="profile-avatar-initial"
                    style={{ display: (profile?.foto_url || user?.foto_url) ? 'none' : 'flex' }}
                  >
                    {inicial}
                  </span>
                </div>
              </div>

              <div className="profile-hero-details">
                <div className="profile-name-row">
                  <h1 className="profile-user-name">{profile?.nome}</h1>
                  <span className={`profile-role-badge role-${profile?.papel || 'usuario'}`}>
                    {profile?.papel === 'admin' ? '🛡 Admin' : profile?.papel === 'premium' ? '⭐ Premium' : '🎬 Membro'}
                  </span>
                </div>

                <p className="profile-user-email">{profile?.email}</p>

                {/* Bio do Usuário */}
                <div className="profile-bio-box">
                  {profile?.bio && profile.bio.trim() ? (
                    <p className="profile-bio-text">“{profile.bio.trim()}”</p>
                  ) : (
                    <p className="profile-bio-placeholder">
                      Nenhuma biografia adicionada. Clique em <strong>Editar Perfil</strong> no canto superior para compartilhar seus gostos cinematográficos.
                    </p>
                  )}
                </div>

                {/* Metadados / Badges do Perfil */}
                <div className="profile-stats-bar">
                  <div className="profile-stat-item">
                    <span className="profile-stat-icon">❤️</span>
                    <span className="profile-stat-val">{favoriteMovies.length}</span>
                    <span className="profile-stat-label">Favoritos</span>
                  </div>

                  <div className="profile-stat-item">
                    <span className="profile-stat-icon">📑</span>
                    <span className="profile-stat-val">{userLists.length}</span>
                    <span className="profile-stat-label">Listas</span>
                  </div>

                  {profile?.criado_em && (
                    <div className="profile-stat-item profile-stat-since">
                      <span className="profile-stat-icon">🗓</span>
                      <span className="profile-stat-label">
                        No catálogo desde {new Date(profile.criado_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ====================================================================
              SEÇÃO 1: FILMES FAVORITOS (Carrossel Horizontal)
              ==================================================================== */}
          <section className="profile-favorites-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <h2 className="profile-section-title">
                  <span className="profile-section-icon">❤️</span> Meus Filmes Favoritos
                </h2>
                <span className="profile-badge-counter">{favoriteMovies.length}</span>
              </div>

              {favoriteMovies.length > 0 && (
                <div className="profile-carousel-controls">
                  <button
                    type="button"
                    className="profile-carousel-arrow"
                    onClick={() => handleScrollCarousel(-1)}
                    title="Rolar favoritos para esquerda"
                    aria-label="Rolar favoritos para esquerda"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="profile-carousel-arrow"
                    onClick={() => handleScrollCarousel(1)}
                    title="Rolar favoritos para direita"
                    aria-label="Rolar favoritos para direita"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {favoriteMovies.length > 0 ? (
              <div className="profile-carousel-container">
                <div className="profile-carousel-track" ref={carouselScrollRef}>
                  {favoriteMovies.map((movie) => (
                    <div
                      key={movie.id}
                      className="profile-movie-card"
                      onClick={() => onSelectMovie && onSelectMovie(movie)}
                      title={`Clique para ver detalhes de ${movie.title}`}
                    >
                      <div className="profile-movie-poster-wrap">
                        {movie.poster_url || movie.poster_path ? (
                          <img
                            src={movie.poster_url || `https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
                            className="profile-movie-poster"
                            loading="lazy"
                          />
                        ) : (
                          <div className="profile-movie-poster-fallback">
                            <span>{movie.title}</span>
                          </div>
                        )}
                        <div className="profile-movie-poster-overlay">
                          <span className="profile-movie-view-label">Ver Detalhes</span>
                        </div>
                        {movie.vote_average > 0 && (
                          <span className="profile-movie-rating-badge">
                            ★ {Number(movie.vote_average).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="profile-movie-info">
                        <h4 className="profile-movie-title">{movie.title}</h4>
                        {movie.release_year && (
                          <span className="profile-movie-year">{movie.release_year}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="profile-empty-card">
                <span className="profile-empty-icon">🍿</span>
                <h3>Nenhum filme favoritado ainda</h3>
                <p>Navegue pelo catálogo e clique no ícone de coração para guardar seus filmes favoritos aqui.</p>
                {onBack && (
                  <button type="button" className="btn-profile-explore" onClick={onBack}>
                    Explorar Catálogo de Filmes
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ====================================================================
              SEÇÃO 2: MINHAS LISTAS (Cards Clicáveis que Navegam para ListsView)
              ==================================================================== */}
          <section className="profile-lists-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <h2 className="profile-section-title">
                  <span className="profile-section-icon">📑</span> Minhas Listas & Coleções
                </h2>
                <span className="profile-badge-counter">{userLists.length}</span>
              </div>

              {onNavigateToLists && (
                <button
                  type="button"
                  className="btn-profile-view-all-lists"
                  onClick={() => onNavigateToLists(null)}
                  title="Abrir painel completo de listas"
                >
                  <span>Abrir Painel de Listas</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>

            {loadingLists ? (
              <div className="profile-lists-loading">
                <span className="btn-spinner-sm"></span>
                <span>Carregando suas listas...</span>
              </div>
            ) : userLists.length > 0 ? (
              <div className="profile-lists-grid">
                {userLists.map((lista) => {
                  const isWatchlist = Boolean(lista.is_watchlist);
                  const total = lista.total_filmes || 0;

                  return (
                    <div
                      key={lista.id}
                      className={`profile-list-card ${isWatchlist ? 'is-watchlist-card' : ''}`}
                      onClick={() => onNavigateToLists && onNavigateToLists(lista.id)}
                      title={`Clique para abrir a lista "${lista.nome}" no painel`}
                    >
                      <div className="profile-list-card-header">
                        <div className="profile-list-tag-row">
                          <span className={`profile-list-tag ${isWatchlist ? 'tag-watchlist' : 'tag-custom'}`}>
                            {isWatchlist ? '★ Watchlist Fixa' : '📁 Seleção'}
                          </span>
                          <span className="profile-list-count-badge">
                            {total} {total === 1 ? 'filme' : 'filmes'}
                          </span>
                        </div>
                        <span className="profile-list-arrow-icon">→</span>
                      </div>

                      <h3 className="profile-list-card-name">{lista.nome}</h3>
                      <p className="profile-list-card-desc">
                        {lista.descricao || (isWatchlist ? 'Filmes que pretendo assistir no catálogo.' : 'Lista personalizada criada por você.')}
                      </p>

                      {/* Miniaturas de pôsteres se houver */}
                      {lista.posters && lista.posters.length > 0 && (
                        <div className="profile-list-mini-posters">
                          {lista.posters.slice(0, 4).map((p, idx) => (
                            <img
                              key={p.tmdb_movie_id || idx}
                              src={p.poster_url || `https://image.tmdb.org/t/p/w200${p.poster_path}`}
                              alt={p.titulo}
                              className="profile-list-mini-poster-img"
                              title={p.titulo}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="profile-empty-card">
                <span className="profile-empty-icon">📂</span>
                <h3>Nenhuma lista personalizada</h3>
                <p>Crie coleções temáticas como "Comédias Anos 90", "Dramas Históricos" e organize suas maratonas.</p>
                {onNavigateToLists && (
                  <button type="button" className="btn-profile-explore" onClick={() => onNavigateToLists(null)}>
                    Criar Minha Primeira Lista
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
