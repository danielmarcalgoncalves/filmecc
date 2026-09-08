const axios = require('axios');

const LOG_SERVICE_URL = process.env.LOG_SERVICE_URL || 'http://log-service:3000';

/**
 * Cliente de Envio de Logs de Auditoria para o microserviço log-service (Redis Streams).
 * Executa em modo fire-and-forget (não-bloqueante) para que qualquer instabilidade
 * no logging nunca afete ou derrube as requisições de negócio do usuário.
 * 
 * @param {string} acao - Identificador da ação (ex: 'LOGIN_SUCESSO', 'ACESSO_NEGADO_403', 'FAVORITAR_FILME')
 * @param {object} req - Objeto de requisição Express (para extrair IP, usuário autenticado e rota)
 * @param {object|string} detalhes - Metadados adicionais do evento
 */
function sendLog(acao, req = null, detalhes = {}) {
  try {
    let usuarioId = 'anonimo';
    let clientIp = '127.0.0.1';
    let requestMeta = {};

    if (req) {
      if (req.usuarioId) {
        usuarioId = String(req.usuarioId);
      } else if (req.usuario && req.usuario.id) {
        usuarioId = String(req.usuario.id);
      } else if (detalhes && detalhes.usuario_id) {
        usuarioId = String(detalhes.usuario_id);
      }

      clientIp =
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.ip ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      requestMeta = {
        metodo: req.method,
        rota: req.originalUrl || req.url
      };
    } else if (detalhes && detalhes.usuario_id) {
      usuarioId = String(detalhes.usuario_id);
    }

    const payloadDetalhes = typeof detalhes === 'object'
      ? { ...requestMeta, ...detalhes }
      : { ...requestMeta, info: detalhes };

    const logEntry = {
      usuario_id: usuarioId,
      acao: String(acao).toUpperCase(),
      timestamp: new Date().toISOString(),
      ip: clientIp,
      detalhes: payloadDetalhes
    };

    // Chamada assíncrona desacoplada com timeout curto (fire-and-forget)
    axios.post(`${LOG_SERVICE_URL}/logs`, logEntry, { timeout: 2500 })
      .catch((err) => {
        // Log silencioso no console do backend sem propagar erro para o controller
        console.warn(`[LogClient WARN] Não foi possível registrar evento "${acao}" no log-service: ${err.message}`);
      });
  } catch (err) {
    console.warn(`[LogClient WARN] Falha ao despachar log de auditoria: ${err.message}`);
  }
}

/**
 * Consulta logs de auditoria armazenados no Redis Streams através do log-service.
 * @param {object} params - { limit, acao, usuario_id }
 */
async function getAuditLogs(params = {}) {
  try {
    const response = await axios.get(`${LOG_SERVICE_URL}/logs`, {
      params,
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || `Erro retornado pelo log-service: ${error.response.status}`);
    }
    throw new Error(`Falha de comunicação com o microserviço log-service: ${error.message}`);
  }
}

module.exports = {
  sendLog,
  getAuditLogs
};
