import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminDashboard({ user, onBack, onShowToast }) {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'comments'
  const [usersList, setUsersList] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'users') {
        const res = await api.admin.listUsers();
        setUsersList(res.usuarios || []);
      } else {
        const res = await api.admin.listAllComments();
        setCommentsList(res.comentarios || []);
      }
    } catch (err) {
      onShowToast(err.message || 'Erro ao carregar dados do painel administrativo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, novoPapel) => {
    try {
      await api.admin.updateUserRole(userId, novoPapel);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, papel: novoPapel } : u))
      );
      onShowToast(`Papel do usuário atualizado para "${novoPapel}".`, 'success');
    } catch (err) {
      onShowToast(err.message || 'Erro ao atualizar papel do usuário.', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Tem certeza que deseja apagar este comentário como administrador?')) {
      return;
    }
    try {
      await api.comments.deleteAny(commentId);
      setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
      onShowToast('Comentário moderado e removido com sucesso!', 'success');
    } catch (err) {
      onShowToast(err.message || 'Erro ao remover comentário.', 'error');
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.nome?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.papel?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredComments = commentsList.filter(
    (c) =>
      c.texto?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.autor_nome?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.autor_email?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="admin-dashboard-container">
      {/* HEADER DO PAINEL ADMIN */}
      <div className="admin-header-bar">
        <div>
          <button className="btn-back" onClick={onBack} title="Voltar ao catálogo principal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Voltar ao Catálogo</span>
          </button>
          <h2 className="admin-page-title">🛡️ Painel de Administração &amp; Moderação (RBAC)</h2>
          <p className="admin-page-subtitle">
            Acesso exclusivo para administradores. Gerencie papéis de usuários e modere todos os comentários do sistema.
          </p>
        </div>
      </div>

      {/* ABAS DO PAINEL ADMIN */}
      <div className="admin-controls-row">
        <div className="filter-tabs">
          <button
            className={`tab-btn ${activeSubTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('users'); setSearchFilter(''); }}
          >
            <span>👥 Todos os Usuários</span>
            <span className="tab-count">{usersList.length}</span>
          </button>

          <button
            className={`tab-btn ${activeSubTab === 'comments' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('comments'); setSearchFilter(''); }}
          >
            <span>💬 Todos os Comentários</span>
            <span className="tab-count">{commentsList.length}</span>
          </button>
        </div>

        <div className="search-box" style={{ maxWidth: '320px' }}>
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={`Filtrar ${activeSubTab === 'users' ? 'usuários...' : 'comentários...'}`}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)' }}>Carregando dados da administração...</p>
        </div>
      ) : activeSubTab === 'users' ? (
        /* TABELA DE USUÁRIOS */
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel Atual</th>
                <th>Data de Criação</th>
                <th>Ações (Alterar Papel)</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className={u.id === user?.id ? 'row-current-user' : ''}>
                    <td>#{u.id}</td>
                    <td>
                      <strong>{u.nome}</strong>
                      {u.id === user?.id && <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginLeft: '0.5rem' }}>(você)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge role-${u.papel || 'usuario'}`}>
                        {u.papel === 'admin' ? '🛡️ Admin' : u.papel === 'premium' ? '⭐ Premium' : '👤 Usuário'}
                      </span>
                    </td>
                    <td>
                      {new Date(u.criado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td>
                      <select
                        className="role-select"
                        value={u.papel || 'usuario'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="usuario">👤 Usuário Comum</option>
                        <option value="premium">⭐ Premium</option>
                        <option value="admin">🛡️ Administrador</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* LISTA DE TODOS OS COMENTÁRIOS */
        <div className="admin-comments-grid">
          {filteredComments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>Nenhum comentário registrado</h3>
              <p>Ainda não há comentários postados por nenhum usuário no sistema.</p>
            </div>
          ) : (
            filteredComments.map((c) => (
              <div key={c.id} className="admin-comment-card">
                <div className="admin-comment-header">
                  <div className="admin-author-info">
                    <div className="user-avatar" style={{ width: '22px', height: '22px', fontSize: '0.7rem' }}>
                      {c.autor_nome ? c.autor_nome.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <strong>{c.autor_nome || 'Usuário'}</strong>
                      <span className="author-subtext">({c.autor_email})</span>
                    </div>
                    <span className={`role-badge-mini role-${c.autor_papel || 'usuario'}`}>
                      {c.autor_papel || 'usuario'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="comment-date">
                      {new Date(c.criado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <button
                      className="btn-admin-moderate"
                      onClick={() => handleDeleteComment(c.id)}
                      title="Apagar comentário como administrador"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Moderar / Excluir</span>
                    </button>
                  </div>
                </div>

                <div className="admin-comment-movie-tag">
                  🎬 ID do Filme TMDB: <strong>#{c.tmdb_movie_id}</strong>
                </div>

                <div className="admin-comment-text">"{c.texto}"</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
