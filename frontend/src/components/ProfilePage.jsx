import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

/**
 * ProfilePage
 * Pagina de perfil do usuario autenticado.
 *
 * Funcionalidades:
 * - Exibe foto de perfil (ou inicial do nome se nao houver foto)
 * - Upload de nova foto com preview imediato antes de enviar
 * - Edicao de nome e bio
 * - Feedback via prop showToast (mesmo sistema do App.jsx)
 */
export default function ProfilePage({ user, onUpdateUser, showToast, onBack }) {
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [nome, setNome]               = useState('');
  const [bio, setBio]                 = useState('');
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Carrega perfil completo ao montar
  useEffect(() => {
    setLoading(true);
    api.profile.get()
      .then(data => {
        setProfile(data.usuario);
        setNome(data.usuario.nome || '');
        setBio(data.usuario.bio || '');
      })
      .catch(() => showToast('Erro ao carregar perfil.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Quando o usuario escolhe um arquivo, exibe preview local
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const tiposValidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposValidos.includes(file.type)) {
      showToast('Formato invalido. Use JPEG, PNG ou WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Imagem muito grande. Limite de 5 MB.', 'error');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // Faz upload da foto selecionada para o MinIO
  async function handleUploadAvatar() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const data = await api.profile.uploadAvatar(selectedFile);
      showToast('Foto de perfil atualizada!', 'success');
      setProfile(prev => ({ ...prev, foto_url: data.foto_url }));
      setPreviewUrl(null);
      setSelectedFile(null);
      // Atualiza o usuario no App.jsx (para o Navbar refletir a foto nova)
      if (onUpdateUser) onUpdateUser({ foto_url: data.foto_url });
    } catch (err) {
      showToast(err.message || 'Erro ao fazer upload.', 'error');
    } finally {
      setUploading(false);
    }
  }

  // Cancela a selecao da foto
  function handleCancelPreview() {
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Salva nome e bio no banco
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!nome.trim()) {
      showToast('O nome nao pode ficar vazio.', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = await api.profile.update({ nome: nome.trim(), bio: bio.trim() });
      showToast('Perfil salvo com sucesso!', 'success');
      setProfile(prev => ({ ...prev, nome: data.usuario.nome, bio: data.usuario.bio }));
      if (onUpdateUser) onUpdateUser({ nome: data.usuario.nome, bio: data.usuario.bio });
    } catch (err) {
      showToast(err.message || 'Erro ao salvar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Foto a exibir: preview local > foto salva > null
  const avatarSrc = previewUrl || profile?.foto_url;
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
      {onBack && (
        <div className="profile-back-bar">
          <button
            type="button"
            className="profile-back-btn"
            onClick={onBack}
            title="Voltar ao catálogo"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar ao Catálogo
          </button>
        </div>
      )}

      <div className="profile-hero">
        <div className="profile-hero-bg"></div>
        <div className="profile-hero-content">

          {/* Avatar + botao de upload */}
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Foto de perfil" className="profile-avatar-img" />
              ) : (
                <span className="profile-avatar-initial">{inicial}</span>
              )}
              {/* Overlay de hover para trocar foto */}
              <button
                type="button"
                className="profile-avatar-overlay"
                onClick={() => fileInputRef.current?.click()}
                title="Trocar foto de perfil"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Trocar foto</span>
              </button>
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="avatar-file-input"
            />

            {/* Botoes de confirmar/cancelar preview */}
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
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Confirmar foto
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
          </div>

          {/* Nome e role badge */}
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">{profile?.nome}</h1>
            <span className={`profile-role-badge role-${profile?.papel || 'usuario'}`}>
              {profile?.papel === 'admin' ? '🛡 Admin' : profile?.papel === 'premium' ? '⭐ Premium' : '🎬 Membro'}
            </span>
            <p className="profile-hero-email">{profile?.email}</p>
            {profile?.criado_em && (
              <p className="profile-member-since">
                Membro desde {new Date(profile.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de edicao */}
      <div className="profile-form-section">
        <form className="profile-form-card" onSubmit={handleSaveProfile}>
          <h2 className="profile-form-title">Editar Perfil</h2>

          <div className="profile-field">
            <label htmlFor="profile-nome" className="profile-label">Nome de exibicao</label>
            <input
              id="profile-nome"
              type="text"
              className="profile-input"
              value={nome}
              onChange={e => setNome(e.target.value)}
              maxLength={100}
              placeholder="Seu nome"
            />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-email" className="profile-label">E-mail (nao editavel)</label>
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
              Bio <span className="profile-label-hint">({(bio || '').length}/500)</span>
            </label>
            <textarea
              id="profile-bio"
              className="profile-textarea"
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Conte um pouco sobre voce, seus filmes favoritos..."
            />
          </div>

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
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Salvar alteracoes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
