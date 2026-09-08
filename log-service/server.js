require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const STREAM_KEY = process.env.REDIS_STREAM_KEY || 'logs:audit';

// Cliente Redis com reconexão automática
const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      const delay = Math.min(retries * 500, 3000);
      console.log(`[Redis] Tentando reconectar em ${delay}ms... (tentativa ${retries})`);
      return delay;
    }
  }
});

redisClient.on('connect', () => console.log('[Redis] Conectado ao servidor Redis com sucesso.'));
redisClient.on('ready', () => console.log('[Redis] Cliente pronto para operações de Streams.'));
redisClient.on('error', (err) => console.error('[Redis Error]:', err.message));

async function startRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('[Redis] Falha inicial ao conectar no Redis:', err.message);
  }
}
startRedis();

/**
 * Health check e status de conexão com Redis
 */
app.get('/health', async (req, res) => {
  try {
    const isReady = redisClient.isReady;
    let ping = null;
    if (isReady) {
      ping = await redisClient.ping();
    }
    return res.json({
      service: 'log-service',
      status: 'ok',
      redis: {
        connected: isReady,
        ping: ping === 'PONG' ? 'OK' : ping
      },
      discipline: 'Computação em Nuvem / Prof. @siriani',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * POST /logs
 * Ingestão de logs de auditoria usando Redis Streams (comando XADD)
 * Espera no body: { usuario_id, acao, timestamp, ip, detalhes }
 */
app.post('/logs', async (req, res) => {
  try {
    const { usuario_id, acao, timestamp, ip, detalhes } = req.body;

    if (!acao) {
      return res.status(400).json({ error: 'Campo "acao" é obrigatório.' });
    }

    const finalTimestamp = timestamp || new Date().toISOString();
    const finalIp = ip || req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const finalUsuarioId = usuario_id !== undefined && usuario_id !== null ? String(usuario_id) : 'anonimo';

    let serializedDetalhes = '';
    if (detalhes !== undefined && detalhes !== null) {
      serializedDetalhes = typeof detalhes === 'object' ? JSON.stringify(detalhes) : String(detalhes);
    }

    // Gravação no Redis Streams via XADD:
    // Chave: logs:audit | ID: * (autogerado com timestamp milissegundos-sequencial)
    const entryId = await redisClient.xAdd(
      STREAM_KEY,
      '*',
      {
        usuario_id: finalUsuarioId,
        acao: String(acao),
        timestamp: String(finalTimestamp),
        ip: String(finalIp),
        detalhes: serializedDetalhes
      }
    );

    return res.status(201).json({
      status: 'success',
      stream: STREAM_KEY,
      id: entryId
    });
  } catch (error) {
    console.error('[POST /logs Error]:', error.message);
    return res.status(500).json({ error: 'Erro ao gravar log no Redis Stream.', details: error.message });
  }
});

/**
 * GET /logs
 * Consulta aos logs de auditoria via Redis Streams (comando XREVRANGE)
 * Retorna os eventos ordenados cronologicamente em ordem decrescente (mais recentes primeiro).
 * Suporta query params: limit (default 100, max 500), acao, usuario_id
 */
app.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const filterAcao = req.query.acao ? String(req.query.acao).trim().toUpperCase() : null;
    const filterUsuario = req.query.usuario_id ? String(req.query.usuario_id).trim() : null;

    // XREVRANGE: Busca do ID mais recente ('+') para o mais antigo ('-') com limite COUNT
    // Para filtrar com segurança mantendo os mais recentes, buscamos uma janela adequada
    const fetchCount = (filterAcao || filterUsuario) ? Math.min(limit * 3, 1000) : limit;

    const entries = await redisClient.xRevRange(STREAM_KEY, '+', '-', {
      COUNT: fetchCount
    });

    let logs = (entries || []).map((entry) => {
      let parsedDetalhes = entry.message.detalhes;
      try {
        if (parsedDetalhes && (parsedDetalhes.startsWith('{') || parsedDetalhes.startsWith('['))) {
          parsedDetalhes = JSON.parse(parsedDetalhes);
        }
      } catch {
        // Mantém como string caso não seja JSON
      }

      return {
        id: entry.id,
        usuario_id: entry.message.usuario_id,
        acao: entry.message.acao,
        timestamp: entry.message.timestamp,
        ip: entry.message.ip,
        detalhes: parsedDetalhes
      };
    });

    if (filterAcao) {
      logs = logs.filter(l => l.acao && l.acao.toUpperCase().includes(filterAcao));
    }

    if (filterUsuario) {
      logs = logs.filter(l => String(l.usuario_id) === filterUsuario);
    }

    if (logs.length > limit) {
      logs = logs.slice(0, limit);
    }

    return res.json({
      total: logs.length,
      stream: STREAM_KEY,
      logs
    });
  } catch (error) {
    console.error('[GET /logs Error]:', error.message);
    return res.status(500).json({ error: 'Erro ao consultar logs no Redis Stream.', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`📋 Microserviço de Auditoria & Logs (Redis Streams)`);
  console.log(`👨‍🏫 Disciplina do Professor: @siriani`);
  console.log(`🚀 Servidor rodando na porta interna: ${PORT}`);
  console.log(`📡 Conectado ao Redis em: ${REDIS_URL}`);
  console.log(`⚡ Stream de Auditoria: ${STREAM_KEY}`);
  console.log('====================================================');
});
