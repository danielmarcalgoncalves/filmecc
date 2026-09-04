require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initDb } = require('./src/config/database');

const authRoutes = require('./src/routes/authRoutes');
const moviesRoutes = require('./src/routes/moviesRoutes');
const favoritesRoutes = require('./src/routes/favoritesRoutes');
const commentsRoutes = require('./src/routes/commentsRoutes');
const listsRoutes = require('./src/routes/listsRoutes');

const app = express();

// Configuração de CORS e Parsers
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/lists', listsRoutes);

// Health check para monitoramento e Portainer
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Tom Hanks Movie Catalog',
    discipline: 'Computação em Nuvem / Professor @siriani',
    timestamp: new Date().toISOString()
  });
});

// Servir frontend compilado em produção
const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, '..', 'frontend', 'dist');

let staticPath = null;
if (fs.existsSync(publicPath)) {
  staticPath = publicPath;
} else if (fs.existsSync(distPath)) {
  staticPath = distPath;
}

if (staticPath) {
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    // Se não for rota da API, envia o index.html da SPA
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Rota de API não encontrada' });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'API do Catálogo Tom Hanks está rodando!',
      endpoints: {
        auth: '/api/auth',
        movies: '/api/movies/tom-hanks',
        favorites: '/api/favorites',
        comments: '/api/comments',
        health: '/api/health'
      },
      note: 'Frontend disponível em ambiente de desenvolvimento via Vite ou em produção após build.'
    });
  });
}

const PORT = process.env.PORT || process.env.RESERVED_PORT || 3000;

function startServer() {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🎬 Catálogo de Filmes — Tom Hanks`);
    console.log(`👨‍🏫 Disciplina do Professor: @siriani`);
    console.log(`🚀 Servidor rodando na porta: ${PORT}`);
    console.log(`🌐 Acesse em: http://localhost:${PORT}`);
    console.log('====================================================');
    
    // Inicializa o banco e verifica tabelas
    initDb().catch(err => console.error('[Database] Inicialização pendente:', err.message));
  });
}

startServer();
