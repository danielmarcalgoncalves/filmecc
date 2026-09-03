# 🎬 Catálogo de Filmes — Tom Hanks (Atividade 4 · Autorização RBAC)

Aplicação web completa para exploração da filmografia de **Tom Hanks**, com consumo ao vivo da API externa do **TMDB (The Movie Database)** e persistência individual de favoritos e comentários com **segregação de dados por usuário** no **MariaDB**.

Conta com **Arquitetura de Microsserviços Desacoplados** e **Controle de Acesso Baseado em Papéis (RBAC - Role-Based Access Control)** com enforcement rigoroso no servidor backend.

> 🎓 Projeto desenvolvido para a disciplina de **Computação em Nuvem / Infraestrutura** lecionada pelo professor **[@siriani](https://github.com/siriani)**.

---

## 🔐 Requisito 1: Matriz de Permissões por Papel (RBAC)

O controle de acesso é aplicado de forma estrita no **servidor backend** (nunca confiando no frontend). O sistema implementa 3 papéis:

| Ação / Endpoint | Método | Recurso | `usuario` (Comum) | `premium` (VIP) | `admin` (Administrador) |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **Explorar catálogo TMDB** (`/api/movies/tom-hanks`) | `GET` | Filmes Tom Hanks | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Listar favoritos** (`/api/favorites`) | `GET` | Meus Favoritos | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Adicionar favorito** (`/api/favorites`) | `POST` | Favorito | ⚠️ Limite de **5 filmes** | ✅ **Ilimitado** | ✅ **Ilimitado** |
| **Remover favorito próprio** (`/api/favorites/:id`) | `DELETE` | Favorito Próprio | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Comentar em filme** (`/api/comments`) | `POST` | Comentário | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Apagar comentário próprio** (`/api/comments/:id`) | `DELETE` | Comentário Próprio | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **🛡️ MODERAÇÃO: Apagar comentário de QUALQUER usuário** (`/api/comments/admin/:id`) | `DELETE` | Qualquer Comentário | ❌ **403 Forbidden** | ❌ **403 Forbidden** | ✅ **Permitido** |
| **🛡️ Listar todos os usuários cadastrados** (`/api/auth/users`) | `GET` | Usuários do sistema | ❌ **403 Forbidden** | ❌ **403 Forbidden** | ✅ **Permitido** |
| **🛡️ Alterar papel de usuário (Promover / Rebaixar)** (`/api/auth/users/:id/role`) | `PATCH` | Papel de Usuário | ❌ **403 Forbidden** | ❌ **403 Forbidden** | ✅ **Permitido** |

---

## 🏛️ Requisito 5: Resposta Curta — Padrão A ou Padrão B?

### 1. Qual dos dois padrões o sistema utiliza hoje?
> **O sistema utiliza o PADRÃO B (Claims embutidas no token JWT).**

### 2. Onde isso está no código?
- No momento do login no microsserviço de autenticação ([`auth-service/server.js`](auth-service/server.js)), o campo `papel` (`usuario`, `premium` ou `admin`) é assinado e gravado dentro do payload do JWT:
  ```js
  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  ```
- No serviço de catálogo backend ([`backend/src/middlewares/auth.js`](backend/src/middlewares/auth.js)), o middleware de autenticação decodifica e verifica a assinatura do token com `jwt.verify(token, JWT_SECRET)` e extrai diretamente `req.usuarioPapel = decoded.papel`. Em seguida, o middleware `requireAdmin` ou `requireRole` valida a permissão **localmente no próprio processo, sem realizar nenhuma chamada de rede adicional ao `auth-service`**.

### 3. O que mudaria no código se fosse migrado para o PADRÃO A (Enforcement Centralizado)?
Caso o sistema adotasse o **Padrão A**:
1. **Chamada de rede síncrona a cada requisição sensível:** O middleware do catálogo backend (`backend/src/middlewares/auth.js`) precisaria fazer uma requisição HTTP via Axios para o `auth-service` (ex: `POST http://auth-service:3000/verify-permission` passando o token e a permissão desejada como `delete:comment:any`).
2. **Endpoint de autorização no auth-service:** O `auth-service` precisaria manter um endpoint ativo consultando o banco de dados em tempo real ou uma tabela de permissões para responder com `200 OK (permitido)` ou `403 Forbidden`.
3. **Compensação arquitetural (Trade-offs):**
   - *Vantagem do Padrão A:* Revogação instantânea de privilégios (se um admin rebaixar um usuário no banco, a próxima requisição dele já é bloqueada imediatamente).
   - *Desvantagem do Padrão A:* Latência adicional de rede em todas as ações sensíveis e acoplamento crítico (se o `auth-service` cair, o catálogo para de funcionar para operações autorizadas).
   - *Vantagem do Padrão B (atual):* Altíssima performance e desacoplamento, pois o token assinado criptograficamente é autocontido e validado instantaneamente em memória pelo catálogo.

---

## 🛠️ Requisitos 2 e 3: Ação Exclusiva de Admin & Enforcement no Backend

### Endpoint de Moderação Exclusiva:
- **Rota:** `DELETE /api/comments/admin/:commentId`
- **Middleware:** `authMiddleware` + `requireAdmin`
- **Comportamento:**
  - Se a requisição for feita com o token de um **Usuário Comum (`usuario`)** ou **Premium (`premium`)**, o backend recusa a ação imediatamente com **HTTP 403 Forbidden**:
    ```json
    {
      "error": "Acesso proibido (403 Forbidden). Seu papel de usuário não possui permissão para realizar esta ação sensível.",
      "papelAtual": "usuario",
      "papeisPermitidos": ["admin"]
    }
    ```
  - Se a requisição for feita com o token de um **Administrador (`admin`)**, o backend executa a exclusão no MariaDB e responde com **HTTP 200 OK**:
    ```json
    {
      "message": "Comentário moderado e removido com sucesso pela administração (RBAC Admin).",
      "comentarioRemovido": { "id": 12, "autor_nome": "Alice", "texto": "..." }
    }
    ```

---

## 📸 Requisito 4: Demonstração Prática (Roteiro de Testes)

Você pode testar diretamente pela **Interface Web** ou via **cURL / Postman**:

### Teste 1: Na Interface Web
1. Cadastre um usuário comum (ex: `alice@teste.com` com papel `Usuário Comum`).
2. Abra qualquer filme (ex: *Forrest Gump*) e publique um comentário.
3. Faça Logout e cadastre outro usuário comum (ex: `bob@teste.com` com papel `Usuário Comum`).
4. Abra o mesmo filme com Bob: Bob consegue visualizar o comentário de Alice, mas **NÃO** tem acesso ao botão de moderação. Ele só pode apagar os próprios comentários.
5. Faça Logout e entre/cadastre uma conta com papel **🛡️ Administrador** (ex: `admin@teste.com`).
6. Abra o filme: o Administrador verá o botão vermelho **"🛡️ Moderar"** em comentários de terceiros. Ao clicar, o comentário é excluído com sucesso do banco de dados.

---

### Teste 2: Direto via Terminal / Postman (Enforcement no Backend)

#### 1. Fazer login com o Usuário Comum para pegar o token:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@teste.com", "senha": "1234"}'
```
*(Copie o token JWT retornado)*

#### 2. Tentar executar a ação exclusiva de Admin com o token do Usuário Comum:
```bash
curl -X DELETE http://localhost:3000/api/comments/admin/1 \
  -H "Authorization: Bearer <TOKEN_DO_USUARIO_COMUM>"
```
> **Resultado:** Status **403 Forbidden** com a mensagem de bloqueio RBAC.

#### 3. Fazer login com o Administrador:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@teste.com", "senha": "1234"}'
```
*(Copie o token do admin)*

#### 4. Executar a mesma ação com o token do Administrador:
```bash
curl -X DELETE http://localhost:3000/api/comments/admin/1 \
  -H "Authorization: Bearer <TOKEN_DO_ADMIN>"
```
> **Resultado:** Status **200 OK** com confirmação da exclusão.

---

## 🚀 Como Subir o Projeto

```bash
docker compose up --build
```
Acesse em: [http://localhost:3000](http://localhost:3000).

---

## 👤 Autor e Créditos
- Disciplina: **Computação em Nuvem / Infraestrutura**
- Professor: **[@siriani](https://github.com/siriani)**
- Integração de Dados: [The Movie Database (TMDB)](https://www.themoviedb.org/)

