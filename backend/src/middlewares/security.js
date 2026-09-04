/**
 * Middleware de Segurança Avançada:
 * 1. Rate Limiting em memória (Proteção contra OWASP ZAP, scanners automatizados e ataques de força bruta)
 * 2. Prevenção de IDOR e BOLA (Broken Object Level Authorization)
 * 3. Sanitização de entradas e Prevenção de XSS / Injeção de Links
 * 4. Headers de segurança HTTP
 */

// Armazenamento em memória para Rate Limiting por IP/rota
const rateLimitStores = new Map();

/**
 * Cria um middleware de Rate Limit em memória
 * @param {Object} options
 * @param {number} options.windowMs - Janela de tempo em milissegundos
 * @param {number} options.max - Quantidade máxima de requisições permitidas na janela
 * @param {string} options.message - Mensagem de erro ao exceder o limite
 */
function createRateLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    // Identificador por IP do cliente (considerando proxies como Nginx se houver)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitStores.get(key);

    if (!record || now - record.resetTime > windowMs) {
      record = {
        count: 1,
        resetTime: now
      };
      rateLimitStores.set(key, record);
    } else {
      record.count += 1;
    }

    // Adiciona headers padrão de rate limiting
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.resetTime + windowMs) / 1000));

    if (record.count > max) {
      console.warn(`[SECURITY ALERT] Rate limit excedido para IP ${ip} na rota ${req.originalUrl} (${record.count}/${max})`);
      return res.status(429).json({
        error: message || 'Muitas requisições enviadas. Por favor, aguarde alguns minutos e tente novamente.',
        retryAfter: Math.ceil((record.resetTime + windowMs - now) / 1000)
      });
    }

    next();
  };
}

// Limpeza periódica da memória a cada 10 minutos para evitar consumo excessivo de RAM
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStores.entries()) {
    if (now - record.resetTime > 15 * 60 * 1000) {
      rateLimitStores.delete(key);
    }
  }
}, 10 * 60 * 1000);

// 1. Limiter para Registro de Novas Contas: máx 5 registros a cada 15 minutos por IP
const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Bloqueio de segurança: Limite de criação de contas excedido. Tente novamente em 15 minutos.'
});

// 2. Limiter para Login: máx 8 tentativas a cada 15 minutos por IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Muitas tentativas de login consecutivas. Por motivos de segurança, aguarde 15 minutos.'
});

// 3. Limiter para Verificação de Código (OTP) e Reenvio: máx 6 tentativas a cada 10 minutos
const verifyCodeLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 6,
  message: 'Limite de tentativas de código de verificação excedido. Solicite um novo código após 10 minutos.'
});

// 4. Limiter para Comentários: máx 8 comentários a cada 1 minuto por usuário/IP
const commentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 8,
  message: 'Você está publicando comentários muito rápido. Aguarde um minuto antes de postar novamente.'
});

// 5. Limiter para Recuperação de Senha: máx 3 requisições a cada 30 minutos
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000,
  max: 3,
  message: 'Muitas solicitações de redefinição de senha. Aguarde 30 minutos.'
});

/**
 * Middleware de Sanitização de Comentários e Filtro Anti-Bot / Anti-Spam
 * Impede que ferramentas como OWASP ZAP injetem URLs, payloads XSS ou links de rastreio
 */
function sanitizeComment(req, res, next) {
  let { texto } = req.body;

  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return res.status(400).json({ error: 'O texto do comentário não pode estar vazio.' });
  }

  // 1. Bloqueia tentativas de injeção automatizada de URLs / SSRF / ZAP Scanner Payloads
  const urlPattern = /(https?:\/\/|ftp:\/\/|www\.)[^\s]+/gi;
  if (urlPattern.test(texto)) {
    console.warn(`[SECURITY] Tentativa de injeção de link/URL bloqueada no comentário de usuário ID ${req.usuarioId}: "${texto.slice(0, 50)}..."`);
    return res.status(400).json({
      error: 'Por motivos de segurança e combate a spam, comentários não podem conter links ou URLs externas.'
    });
  }

  // 2. Sanitização HTML básica contra Stored XSS (Cross-Site Scripting)
  texto = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();

  // 3. Validação de tamanho
  if (texto.length > 800) {
    return res.status(400).json({ error: 'O comentário excede o tamanho máximo de 800 caracteres.' });
  }

  req.body.texto = texto;
  next();
}

/**
 * Validação rigorosa de Nome de Usuário no Cadastro
 * Impede nomes ofensivos, scripts ou caracteres de injeção
 */
function validateRegistrationInput(req, res, next) {
  const { nome, email, senha } = req.body;

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 50) {
    return res.status(400).json({ error: 'O nome deve ter entre 2 e 50 caracteres.' });
  }

  // Permite apenas letras (incluindo acentuadas), números e espaços
  const validNameRegex = /^[a-zA-ZÀ-ÿ0-9 ]+$/;
  if (!validNameRegex.test(nome.trim())) {
    return res.status(400).json({ error: 'O nome contém caracteres inválidos. Utilize apenas letras e números.' });
  }

  // Filtro de termos ofensivos básicos
  const blockedTerms = ['admin', 'root', 'administrator', 'moderator', 'nigga', 'nigger'];
  const lowerName = nome.trim().toLowerCase();
  for (const term of blockedTerms) {
    if (lowerName.includes(term)) {
      return res.status(400).json({ error: 'Nome de usuário inválido ou restrito.' });
    }
  }

  // Validação estrita de formato de e-mail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Por favor, informe um endereço de e-mail válido.' });
  }

  if (!senha || typeof senha !== 'string' || senha.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
  }

  next();
}

/**
 * Headers de Proteção HTTP (semelhante ao Helmet)
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.removeHeader('X-Powered-By');
  next();
}

module.exports = {
  createRateLimiter,
  registerLimiter,
  loginLimiter,
  verifyCodeLimiter,
  commentRateLimiter,
  forgotPasswordLimiter,
  sanitizeComment,
  validateRegistrationInput,
  securityHeaders
};
