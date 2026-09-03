require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_jwt_tomhanks_super_seguro_2026';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mariadb',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root_password',
  database: process.env.DB_NAME || 'filmes_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.MAIL_PORT || 2525,
  auth: {
    user: process.env.MAIL_USER || "fake_user",
    pass: process.env.MAIL_PASS || "fake_pass"
  }
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido.' });

  const [, token] = authHeader.split(' ');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

app.post('/register', async (req, res) => {
  try {
    const { nome, email, senha, papel } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha obrigatórios.' });
    if (senha.length < 4) return res.status(400).json({ error: 'Senha deve ter min 4 chars.' });

    // Permite definir papel no cadastro se for válido, caso contrário padrão é 'usuario'
    const papeisValidos = ['usuario', 'premium', 'admin'];
    const papelFinal = papeisValidos.includes(papel) ? papel : 'usuario';

    const emailTrimmed = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [emailTrimmed]);
    if (existing.length > 0) return res.status(409).json({ error: 'E-mail já cadastrado.' });

    const senhaHash = await bcrypt.hash(senha, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)',
      [nome.trim(), emailTrimmed, senhaHash, papelFinal]
    );

    const token = jwt.sign({ id: result.insertId, nome: nome.trim(), email: emailTrimmed, papel: papelFinal }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Conta criada!', token, usuario: { id: result.insertId, nome: nome.trim(), email: emailTrimmed, papel: papelFinal } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha obrigatórios.' });

    const emailTrimmed = email.trim().toLowerCase();
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [emailTrimmed]);
    if (users.length === 0) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const usuario = users[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel || 'usuario' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login ok!', token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel || 'usuario' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, nome, email, papel, criado_em FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ usuario: users[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// Endpoint exclusivo de administração: Listar todos os usuários (RBAC Admin)
app.get('/users', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await pool.query('SELECT papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (currentUser.length === 0 || currentUser[0].papel !== 'admin') {
      return res.status(403).json({ error: 'Acesso proibido (403 Forbidden). Apenas administradores podem listar usuários.' });
    }

    const [users] = await pool.query('SELECT id, nome, email, papel, criado_em FROM usuarios ORDER BY criado_em DESC');
    res.json({ usuarios: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao listar usuários.' });
  }
});

// Endpoint exclusivo de administração: Alterar papel/role de um usuário (promover/rebaixar)
app.patch('/users/:id/role', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await pool.query('SELECT papel FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (currentUser.length === 0 || currentUser[0].papel !== 'admin') {
      return res.status(403).json({ error: 'Acesso proibido (403 Forbidden). Apenas administradores podem alterar papéis.' });
    }

    const targetId = req.params.id;
    const { papel } = req.body;
    const papeisValidos = ['usuario', 'premium', 'admin'];

    if (!papeisValidos.includes(papel)) {
      return res.status(400).json({ error: `Papel inválido. Opções válidas: ${papeisValidos.join(', ')}` });
    }

    const [result] = await pool.query('UPDATE usuarios SET papel = ? WHERE id = ?', [papel, targetId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ message: `Papel do usuário ${targetId} alterado com sucesso para "${papel}".` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao alterar papel do usuário.' });
  }
});

app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    const [users] = await pool.query('SELECT id, nome FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    if (users.length === 0) return res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });

    const usuario = users[0];
    const token = crypto.randomBytes(20).toString('hex');
    const expiraEm = new Date(Date.now() + 30 * 60000); // 30 minutos

    await pool.query('INSERT INTO reset_tokens (token, usuario_id, expira_em) VALUES (?, ?, ?)', [token, usuario.id, expiraEm]);

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await transporter.sendMail({
      from: '"Catálogo Tom Hanks" <noreply@tomhanks.com>',
      to: email,
      subject: 'Recuperação de Senha',
      html: `<p>Olá ${usuario.nome},</p><p>Clique no link para redefinir sua senha: <a href="${resetLink}">Redefinir Senha</a></p><p>O link expira em 30 minutos.</p>`
    });

    res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha || novaSenha.length < 4) return res.status(400).json({ error: 'Dados inválidos.' });

    const [tokens] = await pool.query('SELECT * FROM reset_tokens WHERE token = ?', [token]);
    if (tokens.length === 0) return res.status(400).json({ error: 'Token inválido ou expirado.' });

    const resetRequest = tokens[0];
    if (resetRequest.usado) return res.status(400).json({ error: 'Token já utilizado.' });
    if (new Date() > new Date(resetRequest.expira_em)) return res.status(400).json({ error: 'Token expirado.' });

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [senhaHash, resetRequest.usuario_id]);
      await conn.query('UPDATE reset_tokens SET usado = TRUE WHERE token = ?', [token]);
      await conn.commit();
      res.json({ message: 'Senha atualizada com sucesso!' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth-service rodando na porta ${PORT}`);
});

