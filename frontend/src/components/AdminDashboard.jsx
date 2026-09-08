import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminDashboard({ user, onBack, onShowToast }) {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'comments' | 'logs'
  const [usersList, setUsersList] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [logFilterAction, setLogFilterAction] = useState('TODOS');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, commentsRes, logsRes] = await Promise.allSettled([
        api.admin.listUsers(),
        api.admin.listAllComments(),
        api.admin.getAuditLogs({ limit: 100 })
      ]);

      if (usersRes.status === 'fulfilled') {
        setUsersList(usersRes.value.usuarios || []);
      } else {
        onShowToast('Falha ao carregar lista de usuários.', 'error');
      }

      if (commentsRes.status === 'fulfilled') {
        setCommentsList(commentsRes.value.comentarios || []);
      }

      if (logsRes.status === 'fulfilled') {
        setLogsList(logsRes.value.logs || []);
      }
    } catch (err) {
      onShowToast(err.message || 'Erro ao carregar dados do painel administrativo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.admin.getAuditLogs({ limit: 100 });
      setLogsList(res.logs || []);
      onShowToast('Logs de auditoria atualizados via Redis Streams (XREVRANGE)!', 'success');
    } catch (err) {
      onShowToast(err.message || 'Erro ao atualizar logs.', 'error');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRoleChange = async (userId, novoPapel) => {
    try {
      await api.admin.updateUserRole(userId, novoPapel);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, papel: novoPapel } : u))
      );
      onShowToast(`Papel do usuário atualizado para "${novoPapel}".`, 'success');
      // Atualiza os logs para refletir a alteração
      handleRefreshLogs();
    } catch (err) {
      onShowToast(err.message || 'Erro ao atualizar papel do usuário.', 'error');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const isSelf = targetUser.id === user?.id;
    const roleLabel = targetUser.papel === 'admin' ? 'ADMINISTRADOR' : targetUser.papel === 'premium' ? 'PREMIUM' : 'COMUM';

    const confirmMsg = isSelf
      ? `⚠️ ATENÇÃO CRÍTICA!\n\nVocê está prestes a excluir SUA PRÓPRIA conta de Administrador (${targetUser.nome} - ${targetUser.email}).\n\nTodos os seus dados vinculados serão apagados permanentemente e sua sessão será finalizada.\n\nTem certeza absoluta de que deseja continuar?`
      : `Tem certeza que deseja excluir permanentemente o usuário "${targetUser.nome}" (${targetUser.email})?\n\nPapel atual: [${roleLabel}]\n\nEsta ação removerá a conta e todos os dados associados (favoritos, comentários, listas) do banco de dados de forma irreversível.`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setDeletingId(targetUser.id);
      await api.admin.deleteUser(targetUser.id);
      setUsersList((prev) => prev.filter((u) => u.id !== targetUser.id));
      onShowToast(`Usuário "${targetUser.nome}" (${roleLabel}) excluído com sucesso!`, 'success');
      handleRefreshLogs();

      if (isSelf) {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      onShowToast(err.message || 'Erro ao excluir usuário.', 'error');
    } finally {
      setDeletingId(null);
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
      handleRefreshLogs();
    } catch (err) {
      onShowToast(err.message || 'Erro ao remover comentário.', 'error');
    }
  };

  const stats = {
    totalUsers: usersList.length,
    admins: usersList.filter((u) => u.papel === 'admin').length,
    premiums: usersList.filter((u) => u.papel === 'premium').length,
    regular: usersList.filter((u) => !u.papel || u.papel === 'usuario').length,
    comments: commentsList.length,
    auditLogs: logsList.length,
    blocked403: logsList.filter((l) => l.acao && (l.acao.includes('403') || l.acao.includes('BLOQUEIO'))).length
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

  const filteredLogs = logsList.filter((l) => {
    const term = searchFilter.toLowerCase();
    const matchesSearch =
      !term ||
      l.acao?.toLowerCase().includes(term) ||
      String(l.usuario_id).toLowerCase().includes(term) ||
      l.ip?.toLowerCase().includes(term) ||
      (typeof l.detalhes === 'object'
        ? JSON.stringify(l.detalhes).toLowerCase().includes(term)
        : String(l.detalhes).toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (logFilterAction === '403') {
      return l.acao && (l.acao.includes('403') || l.acao.includes('BLOQUEIO'));
    }
    if (logFilterAction === 'LOGIN') {
      return l.acao && (l.acao.includes('LOGIN') || l.acao === 'LOGOUT');
    }
    if (logFilterAction === 'FAVORITOS') {
      return l.acao && l.acao.includes('FAVORIT');
    }
    if (logFilterAction === 'MODERACAO') {
      return l.acao && (l.acao.includes('MODERAR') || l.acao.includes('PAPEL') || l.acao.includes('EXCLUIR'));
    }
    if (logFilterAction === 'COMENTARIOS') {
      return l.acao && l.acao.includes('COMENTARIO');
    }
    return true;
  });

  const formatLogActionBadge = (acao) => {
    const upper = (acao || '').toUpperCase();
    if (upper.includes('403') || upper.includes('BLOQUEIO')) {
      return (
        <span className="role-badge role-audit-403" title="Tentativa não autorizada bloqueada por RBAC (403 Forbidden)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>{upper}</span>
        </span>
      );
    }
    if (upper === 'LOGIN_SUCESSO') {
      return (
        <span className="role-badge role-audit-login">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>LOGIN SUCESSO</span>
        </span>
      );
    }
    if (upper === 'LOGIN_FALHA') {
      return (
        <span className="role-badge role-audit-failed">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>LOGIN FALHA</span>
        </span>
      );
    }
    if (upper === 'LOGOUT') {
      return (
        <span className="role-badge role-audit-logout">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>LOGOUT</span>
        </span>
      );
    }
    if (upper.includes('FAVORIT')) {
      return (
        <span className="role-badge role-audit-fav">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>{upper}</span>
        </span>
      );
    }
    if (upper.includes('COMENTARIO')) {
      return (
        <span className="role-badge role-audit-comment">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>{upper}</span>
        </span>
      );
    }
    if (upper.includes('MODERAR') || upper.includes('PAPEL') || upper.includes('EXCLUIR')) {
      return (
        <span className="role-badge role-audit-mod">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>{upper}</span>
        </span>
      );
    }
    return <span className="role-badge role-usuario">{upper}</span>;
  };

  return (
    <div className="admin-dashboard-container">
      {/* HEADER DO PAINEL ADMIN */}
      <div className="admin-header-bar">
        <div className="admin-header-content">
          <button className="btn-back" onClick={onBack} title="Voltar ao catálogo principal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Voltar ao Catálogo</span>
          </button>

          <div className="admin-title-wrap">
            <div className="admin-badge-tag">
              <span className="admin-badge-dot"></span>
              <span>PAINEL DE CONTROLE RBAC &amp; AUDITORIA REDIS</span>
            </div>
            <h2 className="admin-page-title">Centro Administrativo, Moderação &amp; Auditoria</h2>
            <p className="admin-page-subtitle">
              Controle níveis de acesso (Admin, Premium, Comum), modere comentários e audite eventos em tempo real gravados no Redis Streams (XADD / XREVRANGE).
            </p>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box users">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total de Usuários</span>
            <span className="admin-stat-value">{stats.totalUsers}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box admin">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Administradores</span>
            <span className="admin-stat-value">{stats.admins}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box premium">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Usuários Premium</span>
            <span className="admin-stat-value">{stats.premiums}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-box comments">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Comentários</span>
            <span className="admin-stat-value">{stats.comments}</span>
          </div>
        </div>

        {/* STAT CARD: LOGS DE AUDITORIA NO REDIS */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box audit">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Eventos no Redis</span>
            <span className="admin-stat-value">{stats.auditLogs}</span>
          </div>
        </div>

        {/* STAT CARD: BLOQUEIOS 403 (RBAC) */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon-box blocked">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Bloqueios 403</span>
            <span className="admin-stat-value" style={{ color: stats.blocked403 > 0 ? '#f87171' : '#ffffff' }}>
              {stats.blocked403}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROLE / ABAS / BUSCA */}
      <div className="admin-controls-row">
        <div className="filter-tabs">
          <button
            className={`tab-btn ${activeSubTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('users'); setSearchFilter(''); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
            <span>Gerenciar Usuários</span>
            <span className="tab-count">{usersList.length}</span>
          </button>

          <button
            className={`tab-btn ${activeSubTab === 'comments' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('comments'); setSearchFilter(''); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Moderação de Comentários</span>
            <span className="tab-count">{commentsList.length}</span>
          </button>

          {/* NOVA ABA: LOGS DE AUDITORIA (REDIS STREAMS) */}
          <button
            className={`tab-btn ${activeSubTab === 'logs' ? 'active' : ''}`}
            onClick={() => { setActiveSubTab('logs'); setSearchFilter(''); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            <span>Auditoria (Redis Streams)</span>
            <span className="tab-count" style={{ background: 'rgba(0, 224, 84, 0.2)', color: '#00e054' }}>
              {logsList.length}
            </span>
          </button>
        </div>

        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={
              activeSubTab === 'users'
                ? 'Pesquisar por nome, e-mail ou papel...'
                : activeSubTab === 'comments'
                ? 'Pesquisar por texto, autor ou e-mail...'
                : 'Filtrar logs por ação, usuário, IP ou detalhes...'
            }
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          {searchFilter && (
            <button className="search-clear-btn" onClick={() => setSearchFilter('')} title="Limpar busca">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner"></div>
          <p>Carregando dados da administração...</p>
        </div>
      ) : activeSubTab === 'users' ? (
        /* TABELA DE USUÁRIOS */
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>ID</th>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Papel Atual</th>
                <th>Data de Criação</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-table-empty">
                    <div className="empty-icon">👥</div>
                    <p>Nenhum usuário encontrado com os termos pesquisados.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentUser = u.id === user?.id;
                  const isBusy = deletingId === u.id;

                  return (
                    <tr key={u.id} className={isCurrentUser ? 'row-current-user' : ''}>
                      <td className="cell-id">
                        <span className="id-chip">#{u.id}</span>
                      </td>
                      <td className="cell-user">
                        <div className="admin-user-profile">
                          <div className={`admin-user-avatar role-avatar-${u.papel || 'usuario'}`}>
                            {u.nome ? u.nome.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="admin-user-name-box">
                            <span className="admin-user-name">{u.nome}</span>
                            {isCurrentUser && <span className="badge-you">Você (Sessão Atual)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="cell-email">
                        <span className="email-text">{u.email}</span>
                      </td>
                      <td className="cell-role">
                        <span className={`role-badge role-${u.papel || 'usuario'}`}>
                          {u.papel === 'admin' ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                              <span>Admin</span>
                            </>
                          ) : u.papel === 'premium' ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                              </svg>
                              <span>Premium</span>
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="8" r="4"></circle>
                                <path d="M6 20v-2a6 6 0 0 1 12 0v2"></path>
                              </svg>
                              <span>Comum</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="cell-date">
                        <span className="date-text">
                          {new Date(u.criado_em).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="admin-actions-cell">
                          {/* Seletor de Papel */}
                          <div className="select-wrapper">
                            <select
                              className="role-select"
                              value={u.papel || 'usuario'}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={isBusy}
                              title="Alterar nível de permissão (RBAC)"
                            >
                              <option value="usuario">👤 Usuário Comum</option>
                              <option value="premium">⭐ Premium</option>
                              <option value="admin">🛡️ Administrador</option>
                            </select>
                          </div>

                          {/* Botão de Excluir Usuário */}
                          <button
                            className="btn-admin-delete-user"
                            onClick={() => handleDeleteUser(u)}
                            disabled={isBusy}
                            title={`Excluir permanentemente o usuário ${u.nome} (${u.papel || 'usuario'})`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>{isBusy ? 'Excluindo...' : 'Excluir'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : activeSubTab === 'comments' ? (
        /* LISTA DE TODOS OS COMENTÁRIOS */
        <div className="admin-comments-grid">
          {filteredComments.length === 0 ? (
            <div className="admin-empty-comments">
              <div className="empty-icon">💬</div>
              <h3>Nenhum comentário encontrado</h3>
              <p>Não há comentários correspondentes aos filtros aplicados.</p>
            </div>
          ) : (
            filteredComments.map((c) => (
              <div key={c.id} className="admin-comment-card">
                <div className="admin-comment-header">
                  <div className="admin-author-info">
                    <div className="admin-comment-avatar">
                      {c.autor_nome ? c.autor_nome.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="admin-comment-author-details">
                      <div className="admin-comment-author-row">
                        <strong className="admin-comment-author-name">{c.autor_nome || 'Usuário'}</strong>
                        <span className={`role-badge-mini role-${c.autor_papel || 'usuario'}`}>
                          {c.autor_papel || 'usuario'}
                        </span>
                      </div>
                      <span className="author-subtext">{c.autor_email}</span>
                    </div>
                  </div>

                  <div className="admin-comment-header-right">
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
                      title="Apagar este comentário definitivamente como administrador"
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
                  <span className="movie-tag-label">🎬 Filme TMDB ID:</span>
                  <span className="movie-tag-id">#{c.tmdb_movie_id}</span>
                </div>

                <div className="admin-comment-text">"{c.texto}"</div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ABA: LOGS DE AUDITORIA (REDIS STREAMS) */
        <div className="admin-audit-section">
          {/* BARRA SUPERIOR DOS LOGS */}
          <div className="admin-audit-toolbar">
            <div className="admin-audit-stream-info">
              <span className="admin-stream-pill">
                <span className="admin-stream-dot"></span>
                <span>REDIS STREAM: <code>logs:audit</code></span>
              </span>
              <span className="admin-stream-subtext">
                Persistência em alta vazão com comandos <code>XADD</code> e <code>XREVRANGE</code>
              </span>
            </div>

            <div className="admin-audit-actions">
              <div className="admin-audit-filter-chips">
                {[
                  { id: 'TODOS', label: 'Todos' },
                  { id: '403', label: '🚨 403 Forbidden' },
                  { id: 'LOGIN', label: '🔑 Logins' },
                  { id: 'FAVORITOS', label: '⭐ Favoritos' },
                  { id: 'COMENTARIOS', label: '💬 Comentários' },
                  { id: 'MODERACAO', label: '🛡️ Moderação' }
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`audit-chip-btn ${logFilterAction === f.id ? 'active' : ''}`}
                    onClick={() => setLogFilterAction(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                className="btn-refresh-logs"
                onClick={handleRefreshLogs}
                disabled={logsLoading}
                title="Sincronizar eventos recentes do Redis Streams"
              >
                <svg
                  className={logsLoading ? 'spinning' : ''}
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>{logsLoading ? 'Atualizando...' : 'Atualizar Logs'}</span>
              </button>
            </div>
          </div>

          {/* TABELA DE LOGS DE AUDITORIA */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Stream ID</th>
                  <th style={{ width: '150px' }}>Data / Hora</th>
                  <th style={{ width: '210px' }}>Ação de Auditoria</th>
                  <th style={{ width: '130px' }}>Usuário ID</th>
                  <th style={{ width: '130px' }}>IP Origem</th>
                  <th>Detalhes do Evento</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin-table-empty">
                      <div className="empty-icon">⚡</div>
                      <p>
                        {logsList.length === 0
                          ? 'Nenhum log registrado ainda no Redis Stream. Execute ações no catálogo para gerar auditoria!'
                          : 'Nenhum evento corresponde ao filtro selecionado.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((l) => {
                    const is403 = l.acao && (l.acao.includes('403') || l.acao.includes('BLOQUEIO'));

                    return (
                      <tr key={l.id} className={is403 ? 'row-audit-blocked' : ''}>
                        <td className="cell-id">
                          <span className="id-chip" title={`ID Redis Stream: ${l.id}`}>
                            {l.id}
                          </span>
                        </td>
                        <td className="cell-date">
                          <span className="date-text">
                            {new Date(l.timestamp).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="cell-action-badge">
                          {formatLogActionBadge(l.acao)}
                        </td>
                        <td className="cell-user-id">
                          {l.usuario_id === 'anonimo' ? (
                            <span className="user-id-anon">anônimo</span>
                          ) : (
                            <span className="user-id-chip">#{l.usuario_id}</span>
                          )}
                        </td>
                        <td className="cell-ip">
                          <span className="ip-chip">{l.ip || '127.0.0.1'}</span>
                        </td>
                        <td className="cell-details">
                          <div className="log-details-wrap">
                            {typeof l.detalhes === 'object' && l.detalhes !== null ? (
                              <div className="log-details-grid">
                                {Object.entries(l.detalhes).map(([key, val]) => (
                                  <span key={key} className="log-detail-tag">
                                    <strong>{key}:</strong>{' '}
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="log-detail-raw">{String(l.detalhes || '-')}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
