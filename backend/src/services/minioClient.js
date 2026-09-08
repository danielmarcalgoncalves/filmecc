/**
 * minioClient.js
 * Serviço de acesso ao MinIO (Object Storage S3-compatível).
 *
 * Como funciona:
 * - O SDK minio se conecta ao container MinIO usando as variáveis MINIO_*
 * - ensureBucket() cria o bucket automaticamente na primeira vez que o backend sobe
 * - uploadFile() recebe um Buffer (da memória), gera um nome único e envia ao MinIO,
 *   retornando a URL pública do objeto para salvar no banco de dados
 * - deleteFile() remove um objeto pelo nome (usado ao trocar foto)
 */

const Minio = require('minio');

const ENDPOINT    = process.env.MINIO_ENDPOINT     || 'minio';
const PORT        = parseInt(process.env.MINIO_PORT || '9000', 10);
const ACCESS_KEY  = process.env.MINIO_ROOT_USER    || 'minioadmin';
const SECRET_KEY  = process.env.MINIO_ROOT_PASSWORD || 'minioadmin123';
const BUCKET      = process.env.MINIO_BUCKET       || 'perfil-fotos';
const PUBLIC_URL  = process.env.MINIO_PUBLIC_URL   || 'http://localhost:9000';

const minioClient = new Minio.Client({
  endPoint:  ENDPOINT,
  port:      PORT,
  useSSL:    false,
  accessKey: ACCESS_KEY,
  secretKey: SECRET_KEY
});

async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET, 'us-east-1');
      console.log('[MinIO] Bucket "' + BUCKET + '" criado com sucesso.');
    } else {
      console.log('[MinIO] Bucket "' + BUCKET + '" ja existe. Pronto.');
    }

    // Configurar política de leitura pública para permitir que o navegador acesse as fotos via HTTP GET
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKET}/*`]
        }
      ]
    };
    await minioClient.setBucketPolicy(BUCKET, JSON.stringify(policy));
    console.log('[MinIO] Politica de leitura publica configurada no bucket "' + BUCKET + '".');
  } catch (err) {
    console.error('[MinIO] Erro ao verificar/criar bucket ou configurar politica:', err.message);
  }
}

async function uploadFile(buffer, filename, mimetype, usuarioId) {
  const ext = filename.split('.').pop().toLowerCase();
  const rawFileName = 'usuario-' + usuarioId + '-' + Date.now() + '.' + ext;
  const objectName = 'avatar/' + rawFileName;
  await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': mimetype
  });
  // Rota pública do backend que faz streaming do MinIO de forma transparente
  const url = '/api/profile/avatar/' + rawFileName;
  return { objectName, url };
}

async function getFileStream(objectName) {
  return await minioClient.getObject(BUCKET, objectName);
}

async function deleteFile(objectName) {
  try {
    await minioClient.removeObject(BUCKET, objectName);
    console.log('[MinIO] Objeto removido: ' + objectName);
  } catch (err) {
    console.warn('[MinIO] Aviso ao remover objeto antigo:', err.message);
  }
}

module.exports = { minioClient, ensureBucket, uploadFile, getFileStream, deleteFile, BUCKET, PUBLIC_URL };
