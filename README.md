# 🎬 Catálogo de Filmes — Tom Hanks (Atividade 3)

Aplicação web completa para exploração da filmografia de **Tom Hanks**, com consumo ao vivo da API externa do **TMDB (The Movie Database)** e persistência individual de favoritos e comentários com **segregação de dados por usuário** no **MariaDB**.

Agora com **Serviços Desacoplados**: a autenticação foi extraída para um microsserviço independente (comunicação apenas via rede Docker), incluindo funcionalidade de papéis de usuários (roles) e recuperação de senha por e-mail com expiração (via Mailtrap).

> 🎓 Projeto desenvolvido para a disciplina de **Computação em Nuvem / Infraestrutura** lecionada pelo professor **@siriani**.

---

## 🏛️ Arquitetura do Sistema (Serviços Desacoplados)

A aplicação foi projetada com arquitetura de microsserviços, garantindo isolamento:

```text
Navegador (usuário final)
        |
    [ HTTPS ]
        v
+-------------------------------------------------------+
|  Catálogo (Backend Node.js)                           |
|  - Único ponto público (Porta exposta)                |
|  - Serve Frontend estático                            |
|  - Proxy para Auth Service internamente               |
+-------------------------------------------------------+
        |  (Rede Docker Interna)
        +----------------------------> +--------------------------------+
                                       | Auth Service (Sem porta pub.)  |
                                       | - Login, Cadastro, Role        |
                                       | - Esqueci-Senha (Mailtrap)     |
                                       +--------------------------------+
        |                                       |
        v                                       v
+------------------------+             +--------------------------------+
| MariaDB (db)           |             | Serviços Externos              |
| - usuarios             |<------------+ - SMTP (Mailtrap)              |
| - reset_tokens         |             | - API TMDB                     |
| - favoritos            |             +--------------------------------+
+------------------------+
```

### Componentes:
1. **Catálogo (Público)**: O único serviço com porta mapeada. Ele repassa requisições de `/api/auth/*` para o serviço de autenticação via rede interna.
2. **Serviço de Autenticação (Privado)**: Lida com geração de JWT, hash de senhas, roles e links de expiração por e-mail (Mailtrap). Não é acessível externamente.
3. **Persistência (MariaDB)**: Apenas o que cada usuário decide favoritar ou comentar é gravado nas tabelas do banco de dados relacional.

---

## 🗄️ Esquema do Banco de Dados

O banco de dados é inicializado automaticamente na primeira execução (`initDb`), ou pode ser criado via script SQL [`database/init.sql`](database/init.sql):

```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favoritos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tmdb_movie_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  poster_path VARCHAR(255),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uk_usuario_filme (usuario_id, tmdb_movie_id)
);

CREATE TABLE IF NOT EXISTS comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tmdb_movie_id INT NOT NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

---

## 🔒 Segurança de Credenciais

- Nenhuma chave da TMDB ou credencial do MariaDB está gravada no código-fonte ou no frontend.
- Todas as variáveis sensíveis são injetadas via **variáveis de ambiente** (`.env`).
- O repositório contém apenas o arquivo `.env.example` como modelo. O arquivo real `.env` é ignorado pelo `.gitignore`.

---

## ⚙️ Variáveis de Ambiente (`.env`)

Copie o arquivo `.env.example` para `.env` e preencha com as suas credenciais:

```env
# Porta do Servidor / Container
PORT=3000
RESERVED_PORT=3000

# Chave da API TMDB
TMDB_API_KEY=sua_chave_aqui

# Conexão com o MariaDB
DB_HOST=mariadb
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=filmes_db

# Segredo para assinatura de Tokens JWT
JWT_SECRET=seu_segredo_jwt_super_seguro

# Configuração do Mailtrap (para auth-service)
MAIL_USER=seu_user_do_mailtrap
MAIL_PASS=sua_senha_do_mailtrap
```

---

## 🚀 Como Executar Localmente

### Opção 1: Via Docker Compose (Recomendado)
Para subir a aplicação completa e um banco MariaDB local com um único comando:

```bash
docker compose up --build
```
Acesse em: [http://localhost:3000](http://localhost:3000).

---

### Opção 2: Execução Manual (Node.js)

1. **Instalar dependências do Backend e Frontend:**
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

2. **Compilar o Frontend para Produção:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Iniciar o Servidor Backend:**
   ```bash
   cd ../backend
   npm start
   ```

4. Acesse: [http://localhost:3000](http://localhost:3000).

*(Para ambiente de desenvolvimento com hot-reload do frontend, execute `npm run dev` na pasta `frontend` e `npm run dev` na pasta `backend`).*

---

## 🚢 Deploy no Portainer (Infraestrutura da Disciplina)

1. Acesse o **Portainer** da sua infraestrutura individual.
2. Crie uma nova Stack ou Container apontando para este repositório Git público.
3. Configure as **Variáveis de Ambiente** (`Env`) com a sua chave `TMDB_API_KEY`, os dados de conexão do seu MariaDB da disciplina (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) e a sua porta reservada (`RESERVED_PORT`).
4. Realize o deploy. O container responderá no seu subdomínio individual vinculado à sua porta reservada.

---

## 🧪 Roteiro de Teste de Isolamento (Passo a Passo)

Para validar a segregação de ponta a ponta:

1. **Acesse a aplicação**: Verifique que a primeira tela apresentada é a de **Login / Cadastro**.
2. **Crie o Usuário 1** (ex: `alice@teste.com`):
   - Faça login com Alice.
   - O catálogo de filmes de Tom Hanks será carregado diretamente do TMDB.
   - Favorite o filme **"Forrest Gump"** e adicione o comentário *"Meu filme favorito da vida!"*.
3. **Recarregue a página**:
   - Confirme que *Forrest Gump* permanece marcado nos favoritos e o comentário continua salvo.
4. **Faça Logout e Crie o Usuário 2** (ex: `bob@teste.com`):
   - Faça login com Bob.
   - Abra a aba **"Meus Favoritos"** e **"Comentados"**: a lista estará completamente vazia. Bob não tem acesso aos favoritos nem aos comentários de Alice.
   - Favorite outro filme (ex: **"Náufrago"**) e comente *"Excelente atuação com a bola Wilson!"*.
5. **Faça Logout e Entre novamente como Alice**:
   - Alice continua visualizando apenas *Forrest Gump* e seus próprios comentários, sem qualquer dado de Bob.

---

## 👤 Autor e Créditos
- Disciplina: **Computação em Nuvem / Infraestrutura**
- Professor: **@siriani**
- Integração de Dados: [The Movie Database (TMDB)](https://www.themoviedb.org/)
