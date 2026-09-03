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
  host: process.env.MAIL_HOST || "smtp-relay.brevo.com",
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: process.env.MAIL_PORT == 465, // true para SSL 465, false para TLS 587
  auth: {
    user: process.env.MAIL_USER || "fake_user",
    pass: process.env.MAIL_PASS || "fake_pass"
  },
  tls: {
    rejectUnauthorized: false
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

// Função auxiliar para envio de e-mail com código de confirmação (OTP) via Brevo SMTP
async function sendVerificationEmail(email, nome, codigo) {
  const mailSender = process.env.MAIL_FROM || `"Catálogo Tom Hanks" <${process.env.MAIL_USER}>`;

  await transporter.sendMail({
    from: mailSender,
    to: email,
    subject: `Seu Código de Confirmação: ${codigo} - Catálogo Tom Hanks`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #334155; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #f59e0b; margin: 0 0 6px 0; font-size: 1.5rem;">🎬 Catálogo Tom Hanks</h2>
          <p style="color: #94a3b8; font-size: 0.9rem; margin: 0;">Confirmação de Criação de Conta</p>
        </div>
        <p>Olá, <strong>${nome || 'Cineasta'}</strong>!</p>
        <p style="color: #cbd5e1; line-height: 1.5;">Obrigado por se registrar. Para garantir a segurança da sua conta e validar que este e-mail realmente pertence a você, digite o código de verificação abaixo:</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #1e293b; border: 2px solid #f59e0b; border-radius: 10px; padding: 14px 32px; letter-spacing: 8px; font-size: 2rem; font-weight: 800; color: #fbbf24; font-family: monospace;">
            ${codigo}
          </div>
          <p style="color: #f59e0b; font-size: 0.85rem; margin-top: 10px; font-weight: 500;">⏱️ Válido por 15 minutos</p>
        </div>

        <p style="color: #94a3b8; font-size: 0.85rem; line-height: 1.4;">Se você não solicitou este cadastro, pode ignorar esta mensagem com segurança. Nenhuma conta será ativada sem este código.</p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0 16px 0;" />
        <p style="color: #64748b; font-size: 0.75rem; text-align: center; margin: 0;">
          Catálogo Tom Hanks &bull; Computação em Nuvem &bull; Prof. @siriani
        </p>
      </div>
    `
  });
}

app.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, e-mail e senha obrigatórios.' });
    if (senha.length < 4) return res.status(400).json({ error: 'Senha deve ter min 4 chars.' });

    // Blindagem rigorosa de segurança:
    // Qualquer parâmetro 'papel' enviado pelo cliente é estritamente ignorado.
    // Todo novo registro é criado como usuário comum ('usuario') e com email_verificado = FALSE.
    const papelFinal = 'usuario';

    const emailTrimmed = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id, email_verificado FROM usuarios WHERE email = ?', [emailTrimmed]);
    
    if (existing.length > 0) {
      // Se o e-mail já existe mas ainda não foi verificado, reenviamos um código para ele conseguir validar
      if (existing[0].email_verificado === 0 || existing[0].email_verificado === false) {
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiraEm = new Date(Date.now() + 15 * 60000); // 15 minutos

        await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE email = ?', [emailTrimmed]);
        await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);

        await sendVerificationEmail(emailTrimmed, nome.trim(), codigo);

        return res.status(200).json({
          message: 'Cadastro pendente encontrado. Um novo código de verificação foi enviado para seu e-mail.',
          requireVerification: true,
          email: emailTrimmed
        });
      }
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, papel, email_verificado) VALUES (?, ?, ?, ?, FALSE)',
      [nome.trim(), emailTrimmed, senhaHash, papelFinal]
    );

    // Gera o código numérico de 6 dígitos (OTP) válido por 15 minutos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEm = new Date(Date.now() + 15 * 60000); // 15 minutos

    await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);

    // Envia o e-mail pelo Brevo SMTP
    await sendVerificationEmail(emailTrimmed, nome.trim(), codigo);

    return res.status(201).json({
      message: 'Código de verificação enviado para o seu e-mail.',
      requireVerification: true,
      email: emailTrimmed
    });
  } catch (error) {
    console.error('[REGISTER ERROR]:', error);
    res.status(500).json({ error: `Erro no cadastro: ${error.message || 'Erro interno.'}` });
  }
});

// Validação do código de 6 dígitos recebido por e-mail
app.post('/verify-code', async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) {
      return res.status(400).json({ error: 'E-mail e código de 6 dígitos são obrigatórios.' });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const codigoTrimmed = codigo.toString().trim();

    // Busca o código mais recente não utilizado para este e-mail
    const [codigos] = await pool.query(
      'SELECT * FROM codigos_verificacao WHERE email = ? AND codigo = ? AND usado = FALSE ORDER BY id DESC LIMIT 1',
      [emailTrimmed, codigoTrimmed]
    );

    if (codigos.length === 0) {
      return res.status(400).json({ error: 'Código de verificação incorreto ou já utilizado.' });
    }

    const regCodigo = codigos[0];
    if (new Date() > new Date(regCodigo.expira_em)) {
      return res.status(400).json({ error: 'Este código expirou (limite de 15 minutos excedido). Solicite um novo código.' });
    }

    // Marca o código como usado e ativa o usuário no banco
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE codigos_verificacao SET usado = TRUE WHERE id = ?', [regCodigo.id]);
      await conn.query('UPDATE usuarios SET email_verificado = TRUE WHERE email = ?', [emailTrimmed]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Busca usuário ativado para gerar o token e logar automaticamente
    const [users] = await pool.query('SELECT id, nome, email, papel FROM usuarios WHERE email = ?', [emailTrimmed]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const usuario = users[0];
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel || 'usuario' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'E-mail verificado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel || 'usuario'
      }
    });
  } catch (error) {
    console.error('[VERIFY-CODE ERROR]:', error);
    res.status(500).json({ error: 'Erro interno ao verificar código.' });
  }
});

// Reenvio de novo código de verificação
app.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    const emailTrimmed = email.trim().toLowerCase();
    const [users] = await pool.query('SELECT id, nome, email_verificado FROM usuarios WHERE email = ?', [emailTrimmed]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada para este e-mail.' });
    }

    if (users[0].email_verificado === 1 || users[0].email_verificado === true) {
      return res.status(400).json({ error: 'Este e-mail já foi verificado anteriormente. Você já pode fazer login.' });
    }

    // Invalida códigos anteriores
    await pool.query('UPDATE codigos_verificacao SET usado = TRUE WHERE email = ?', [emailTrimmed]);

    // Gera novo código
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiraEm = new Date(Date.now() + 15 * 60000); // 15 minutos

    await pool.query('INSERT INTO codigos_verificacao (email, codigo, expira_em) VALUES (?, ?, ?)', [emailTrimmed, codigo, expiraEm]);

    // Envia novo e-mail pelo Brevo
    await sendVerificationEmail(emailTrimmed, users[0].nome, codigo);

    return res.json({ message: 'Novo código de verificação enviado para o seu e-mail!' });
  } catch (error) {
    console.error('[RESEND-CODE ERROR]:', error);
    res.status(500).json({ error: `Erro ao reenviar código: ${error.message || 'Erro interno.'}` });
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

    // Bloqueia caso o e-mail ainda não tenha sido verificado
    if (usuario.email_verificado === 0 || usuario.email_verificado === false) {
      return res.status(403).json({
        error: 'Seu e-mail ainda não foi confirmado. Digite o código de 6 dígitos enviado para sua caixa de entrada.',
        requireVerification: true,
        email: usuario.email
      });
    }

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

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/?token=${token}`;
    const mailSender = process.env.MAIL_FROM || `"Catálogo Tom Hanks" <${process.env.MAIL_USER}>`;

    await transporter.sendMail({
      from: mailSender,
      to: email,
      subject: 'Recuperação de Senha - Catálogo Tom Hanks',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
          <h2 style="color: #d97706; margin-top: 0;">Recuperação de Senha</h2>
          <p>Olá <strong>${usuario.nome}</strong>,</p>
          <p>Você solicitou a redefinição de senha da sua conta no <strong>Catálogo de Filmes Tom Hanks</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background-color: #f59e0b; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Redefinir Minha Senha
            </a>
          </p>
          <p style="color: #64748b; font-size: 0.85rem;">Ou copie e cole o link no seu navegador:<br><a href="${resetLink}" style="color: #3b82f6;">${resetLink}</a></p>
          <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 20px;">Este link expira em 30 minutos. Se você não solicitou, pode ignorar esta mensagem.</p>
        </div>
      `
    });

    res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
  } catch (error) {
    console.error('[FORGOT-PASSWORD ERROR]:', error);
    res.status(500).json({ error: `Falha ao enviar e-mail: ${error.message || 'Erro interno.'}` });
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

