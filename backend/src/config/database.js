const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'filmes_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Inicialização automática das tabelas para garantir que a aplicação funcione de imediato
async function initDb() {
  try {
    const connection = await pool.getConnection();
    console.log('[Database] Conexão com o MariaDB estabelecida com sucesso.');

    // Criação da tabela de usuários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        papel VARCHAR(50) DEFAULT 'usuario',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Criação da tabela de reset_tokens
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        token VARCHAR(255) PRIMARY KEY,
        usuario_id INT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expira_em TIMESTAMP NOT NULL,
        usado BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tentar adicionar a coluna papel caso o banco antigo não tenha
    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN papel VARCHAR(50) DEFAULT 'usuario';`);
      console.log('[Database] Coluna papel adicionada na tabela usuarios.');
    } catch (e) {
      // Ignorar se a coluna já existir (ER_DUP_FIELDNAME)
    }

    // Tentar adicionar a coluna email_verificado
    try {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN DEFAULT FALSE;`);
      // Garante que contas pré-existentes não sejam bloqueadas
      await connection.query(`UPDATE usuarios SET email_verificado = TRUE WHERE email_verificado IS NULL;`);
      console.log('[Database] Coluna email_verificado configurada na tabela usuarios.');
    } catch (e) {
      // Ignorar se a coluna já existir
    }

    // Criação da tabela de códigos de verificação de e-mail (OTP)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS codigos_verificacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        codigo VARCHAR(10) NOT NULL,
        expira_em DATETIME NOT NULL,
        usado BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_codigo (email, codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Criação da tabela de favoritos com chave única por (usuario_id, tmdb_movie_id)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS favoritos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tmdb_movie_id INT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        poster_path VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE KEY uk_usuario_filme (usuario_id, tmdb_movie_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Criação da tabela de comentários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comentarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tmdb_movie_id INT NOT NULL,
        texto TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Criação da tabela de listas (Watchlist e Listas Personalizadas)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS listas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT NULL,
        is_watchlist BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Criação da tabela de itens pertencentes a cada lista
    await connection.query(`
      CREATE TABLE IF NOT EXISTS itens_lista (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lista_id INT NOT NULL,
        tmdb_movie_id INT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        poster_path VARCHAR(255) NULL,
        adicionado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE,
        UNIQUE KEY uk_lista_filme (lista_id, tmdb_movie_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    connection.release();
    console.log('[Database] Tabelas verificadas e prontas para uso.');
  } catch (error) {
    console.error('[Database] Aviso ao conectar/inicializar tabelas no MariaDB:', error.message);
    console.error('[Database] Certifique-se de configurar corretamente as variáveis DB_HOST, DB_USER, DB_PASSWORD e DB_NAME.');
  }
}

module.exports = {
  pool,
  initDb
};
