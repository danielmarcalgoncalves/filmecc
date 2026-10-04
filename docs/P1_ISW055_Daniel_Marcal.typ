// ============================================================
//  P1 — Relatório bimestral de atividades (entrega INDIVIDUAL)
//  ISW055 · Introdução à Computação em Nuvem · Fatec Pompeia · 2026.2
// ============================================================

// ---------- DADOS DO ALUNO ----------
#let aluno = "Daniel Marçal Gonçalves"
#let turma = "161_SIST. INTELIGENTES_N"
#let data-relatorio = "07/10/2026"

// ---------- CONFIGURAÇÕES DA DISCIPLINA ----------
#let disciplina = "Introdução à Computação em Nuvem"
#let codigo = "ISW055"
#let professor = "Prof. Allan Lincoln Rodrigues Siriani"
#let accent = rgb("#b96f1f")

#set document(title: "P1 — " + codigo + " — " + aluno, author: aluno)
#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2cm))
#set text(size: 11pt, lang: "pt", region: "BR")
#set par(justify: true, leading: 0.7em)
#set heading(numbering: "1.1")
#show heading.where(level: 1): it => { v(0.6em); text(size: 16pt, it); v(0.2em) }
#show heading.where(level: 2): it => { v(0.5em); text(size: 13pt, it); v(0.1em) }
#show link: set text(fill: accent)
#show figure.caption: set text(size: 9pt, fill: luma(90))
#set table(stroke: 0.5pt + luma(200), inset: 6pt)
#show table: set text(hyphenate: false)
#show table: set par(justify: false)

// ---------- AJUDANTES ----------
#let registro = state("registro", ())

#let evidencia(legenda, arquivo: none) = figure(
  if arquivo == none {
    rect(width: 100%, height: 5.5cm, radius: 4pt, stroke: (paint: luma(170), dash: "dashed"))[
      #align(center + horizon)[
        #text(fill: luma(130), size: 9.5pt)[
          cole o print aqui \
          troque `arquivo: none` por `arquivo: "prints/nome.png"`
        ]
      ]
    ]
  } else {
    image(arquivo, width: 100%)
  },
  kind: image,
  supplement: [Figura],
  caption: legenda,
)

#let atividade(
  numero, titulo,
  descricao: "",
  planejada: "",
  realizada: "—",
  situacao: "entregue",
  evidencia: "",
  url: "",
  corpo,
) = {
  registro.update(l => l + ((
    numero: numero, titulo: titulo, descricao: descricao,
    planejada: planejada, realizada: realizada, situacao: situacao,
  ),))
  heading(level: 2, [Atividade #numero — #titulo])
  table(
    columns: (3.4cm, 1fr),
    fill: (x, y) => if x == 0 { luma(245) } else { none },
    [*Descrição*], [#descricao],
    [*Data planejada*], [#planejada],
    [*Data realizada*], [#realizada],
    [*Situação*], [#situacao],
    [*Evidência*], [#evidencia],
    [*Link*], [#if url == "" [—] else [#link(url)]],
  )
  corpo
}

// ============================================================
//  CAPA
// ============================================================

#align(center)[
  #v(2.5cm)
  #text(size: 12pt, tracking: 0.12em)[FATEC POMPEIA]
  #v(0.4em)
  #text(size: 10.5pt, fill: luma(110))[#disciplina · #codigo · #turma]
  #v(4.5cm)
  #text(size: 26pt, weight: "bold")[P1]
  #v(0.3em)
  #text(size: 18pt, weight: "bold")[Relatório bimestral de atividades]
  #v(0.8em)
  #text(size: 11pt, fill: luma(110))[Avaliação individual · 2026.2]
  #v(5cm)
  #text(size: 14pt)[#aluno]
  #v(1fr)
  #text(size: 10.5pt)[#professor \ Pompeia, #data-relatorio]
]

#set page(
  numbering: "1",
  number-align: right,
  header: context {
    set text(size: 8pt, fill: luma(120))
    [#codigo · P1 — Relatório bimestral #h(1fr) #aluno]
    line(length: 100%, stroke: 0.4pt + luma(200))
  },
)
#counter(page).update(1)

#outline(title: "Sumário", indent: 1.2em, depth: 2)
#pagebreak()

// ============================================================
= Introdução
// ============================================================

A disciplina de *Introdução à Computação em Nuvem (ISW055)*, ministrada na Faculdade de Tecnologia de Pompeia pelo Prof. Allan Lincoln Rodrigues Siriani, tem como objetivo central capacitar os estudantes nos fundamentos práticos da engenharia de software voltada para a nuvem. Ao longo das aulas, o foco extrapolou a simples programação web tradicional, adentrando os desafios reais de escalabilidade, desacoplamento de serviços, isolamento em contêineres, controle de concorrência, tolerância a falhas e persistência híbrida de dados (Polyglot Persistence).

Como fio condutor do primeiro bimestre letivo de 2026.2, desenvolveu-se de forma contínua e cumulativa um sistema completo de catálogo cinematográfico temático — o *Catálogo de Filmes Tom Hanks*. O projeto partiu de uma experiência didática inicial de nivelamento em arquitetura monolítica síncrona e evoluiu progressivamente para um ecossistema robusto de múltiplos microsserviços conteinerizados via *Docker* e orquestrados por *Docker Compose*. A aplicação integra consumo dinâmico de APIs externas em tempo real (The Movie Database - TMDB), banco de dados relacional (*MariaDB*), microsserviço desacoplado de autenticação segura com confirmação via e-mail (Brevo SMTP/OTP), controle de acesso baseado em papéis (*RBAC*), microsserviço dedicado de auditoria em altíssima vazão utilizando *Redis Streams*, e armazenamento moderno de objetos compatível com S3 (*MinIO Object Storage*) para upload de avatares.

Este relatório bimestral de avaliação individual (P1) tem a finalidade de documentar formalmente a evolução técnica e cronológica do trabalho desenvolvido. Em conformidade com os princípios da governança de software e da transparência profissional, o documento apresenta a rastreabilidade integral das entregas, confrontando as datas planejadas no cronograma com as datas e horários efetivamente registrados nos históricos de controle de versão, acompanhados de links verificáveis e evidências visuais de execução.

// ============================================================
= Metodologia
// ============================================================

O desenvolvimento prático de todas as entregas foi conduzido sob um único repositório público no GitHub (#link("https://github.com/danielmarcalgoncalves/filmecc")), permitindo uma linha histórica consistente e auditável da transição da arquitetura monolítica para microsserviços. Como ambiente de execução e orquestração local, adotou-se o *Docker Desktop* sobre sistema operacional Windows, com suporte a contêineres Linux e configuração de rede em ponte dedicada (`tomhanks_net`). O stack tecnológico envolveu *Node.js* (versões LTS 20 e 24) com frameworks Express e React (Vite) na camada de Backend-for-Frontend (BFF) e interface de usuário, *MariaDB 10.11* para transações ACID de negócio, *Redis 7* para fluxos de mensageria assíncrona orientados a eventos, e *MinIO* como camada de Object Storage compatível com a API AWS S3.

Para a coleta das evidências apresentadas neste relatório, aplicou-se o princípio da imutabilidade dos registros de controle de versão do Git. Cada entrega possui um identificador de commit (SHA hash) exclusivo, cuja data e horário foram extraídos via comando de terminal `git log -1 --date=format:"%d/%m/%Y %H:%M" --format="%h %ad"` e devidamente checados na interface web do GitHub. As capturas de tela documentadas registram de forma explícita o cabeçalho do repositório, o hash correspondente, os arquivos modificados e o resultado palpável da funcionalidade em operação na máquina local ou no ambiente em nuvem.

// ============================================================
= Quadro de entregas
// ============================================================

#context {
  let l = registro.final()
  table(
    columns: (auto, 1.4fr, 2fr, 2.6cm, 2.9cm, 2.3cm),
    align: (center, left, left, center, center, center),
    fill: (x, y) => if y == 0 { luma(235) } else { none },
    table.header([*Nº*], [*Atividade*], [*Descrição*], [*Data \ planejada*], [*Data \ realizada*], [*Situação*]),
    ..l.map(a => (
      [#a.numero], [#a.titulo], [#text(size: 9pt)[#a.descricao]],
      [#a.planejada], [#a.realizada], [#a.situacao],
    )).flatten()
  )
}

// ============================================================
= Atividades realizadas
// ============================================================

#atividade(
  "1", "Agenda telefônica em Flask",
  descricao: "Nivelamento em sala: sistema monolítico Flask + Jinja com persistência em JSON.",
  planejada: "07/08/2026",
  realizada: "07/08/2026 21:40",
  situacao: "entregue",
  evidencia: "Realizada em sala — print do código/terminal e da aplicação em execução local",
  url: "https://github.com/danielmarcalgoncalves/filmecc",
)[
  *O que foi feito.* A atividade inaugural da disciplina constituiu uma dinâmica prática presencial de nivelamento técnico em laboratório. O objetivo foi conceber e executar uma aplicação web completa sob o padrão monolítico, empregando a linguagem Python com o microframework Flask e motor de renderização de páginas server-side Jinja2. Foi estruturado um CRUD funcional de contatos (nome, número de telefone e e-mail) cuja camada de persistência operava por meio da serialização e desserialização de arquivos em formato JSON (`contatos.json`). A atividade serviu como referência comparativa para evidenciar o acoplamento excessivo existente em arquiteturas monolíticas simples, onde apresentação, regras de negócio e controle de estado residem num único processo síncrono.

  #evidencia([Atividade 1 — evidência da implementação no terminal com servidor Flask em execução], arquivo: "prints/atv1_entrega.png")
  #evidencia([Atividade 1 — resultado da interface da agenda telefônica em Flask operando em localhost:5000], arquivo: "prints/atv1_resultado.png")

  *Dificuldades e como foram resolvidas.* O principal desafio envolveu o controle de concorrência em acessos simultâneos de escrita ao arquivo JSON local, o que gerava exceções de lock no sistema operacional. A questão foi solucionada encapsulando as operações de leitura e escrita com blocos `try/finally` e assegurando a criação atômica do arquivo caso não existisse previamente.
]

#atividade(
  "2", "Catálogo de filmes — Tom Hanks",
  descricao: "Consumo da API TMDB, persistência em MariaDB e segregação por usuário.",
  planejada: "20/08/2026",
  realizada: "20/08/2026 21:13",
  situacao: "entregue",
  evidencia: "GitHub — commit ade9782 + README + print do catálogo",
  url: "https://github.com/danielmarcalgoncalves/filmecc/commit/ade9782d3e562678e55abc73e54802d96957e65e",
)[
  *O que foi feito.* Criação da primeira versão do projeto oficial do catálogo temático de filmes da filmografia do ator Tom Hanks. Foi implementada uma arquitetura client-server com backend em Node.js/Express e frontend em React (Vite). A aplicação consome em tempo real os dados públicos da API externa do The Movie Database (TMDB), efetuando o cache e complementação de metadados. Foi estruturado o banco de dados relacional MariaDB com script `init.sql` contemplando as tabelas de usuários, filmes favoritos e comentários, implementando a segregação lógica de informações por usuário autenticado.

  #evidencia([Atividade 2 — commit ade9782 registrado no GitHub em 20/08/2026 às 21:13], arquivo: "prints/atv2_entrega.png")
  #evidencia([Atividade 2 — interface do catálogo cinematográfico carregando pôsteres dinâmicos da API TMDB], arquivo: "prints/atv2_resultado.png")

  *Dificuldades e como foram resolvidas.* A API do TMDB impõe limite de taxa de requisições (rate limiting) e paginação de dados. Para contornar lentidão na renderização da filmografia completa de mais de 60 obras do ator, implementou-se um mecanismo de cache em memória no backend da aplicação, evitando requisições redundantes a cada recarregamento de página.
]

#atividade(
  "3", "Desacoplando o login — microsserviço de autenticação",
  descricao: "Login, cadastro e esqueci-minha-senha num serviço à parte na rede interna do Docker.",
  planejada: "28/08/2026",
  realizada: "27/08/2026 20:47",
  situacao: "entregue",
  evidencia: "GitHub — commit d73c841 + docker-compose.yml + print do login funcionando",
  url: "https://github.com/danielmarcalgoncalves/filmecc/commit/d73c841fcd9e2bb6776f7c6cfea25fc5afab212e",
)[
  *O que foi feito.* Desacoplamento arquitetural da responsabilidade de autenticação, extraindo as rotas de registro, verificação de e-mail com código OTP, login e recuperação de senha para um serviço independente denominado `auth-service`. A orquestração foi estabelecida via `docker-compose.yml`, configurando uma rede interna bridge isolada na qual o `auth-service` não expõe portas públicas ao host, comunicando-se exclusivamente com o gateway/BFF da aplicação principal via HTTP interno e com o MariaDB na porta 3306. Implementou-se criptografia de senhas com bcrypt (fator de custo 10) e geração de tokens stateless JWT assinados digitalmente. Adicionalmente, integrou-se envio transacional de e-mails de confirmação através do provedor Brevo SMTP.

  #evidencia([Atividade 3 — commit d73c841 registrado no GitHub em 27/08/2026 com desacoplamento no Docker], arquivo: "prints/atv3_entrega.png")
  #evidencia([Atividade 3 — modal de autenticação desacoplado com suporte a login, criação de conta e recuperação], arquivo: "prints/atv3_resultado.png")

  *Dificuldades e como foram resolvidas.* A comunicação entre contêineres no Docker Compose falhava inicialmente quando o serviço tentava acessar `localhost` em vez do nome do serviço registrado no DNS interno do Docker. O problema foi sanado parametrizando a variável `AUTH_SERVICE_URL=http://auth-service:3000` via variáveis de ambiente.
]

#atividade(
  "4", "Controle de acesso por papel — RBAC",
  descricao: "O campo role passa a decidir permissões reais no backend (403 para usuário comum).",
  planejada: "04/09/2026",
  realizada: "04/09/2026 14:59",
  situacao: "entregue",
  evidencia: "GitHub — commit e02ba5a + print da ação e painel de admin com papéis",
  url: "https://github.com/danielmarcalgoncalves/filmecc/commit/e02ba5a31390e2cba2e708656697f283a1265877",
)[
  *O que foi feito.* Implementação de controle rigoroso de acesso baseado em papéis (Role-Based Access Control - RBAC). Foram estabelecidas três categorias de privilégios: Usuário Comum (`usuario`), Usuário VIP (`premium`) e Administrador do Sistema (`admin`). No backend, foram criados middlewares de autorização que interceptam as requisições, validam a role contida no payload verificado do JWT e consultam o estado atual no MariaDB para impedir brechas do tipo Insecure Direct Object References (IDOR). O painel de administração permite que administradores promovam ou rebaixem permissões de usuários, moderem resenhas e visualizem métricas. Usuários comuns que tentam acessar rotas restritas recebem formalmente o status HTTP `403 Forbidden`.

  #evidencia([Atividade 4 — commit e02ba5a no GitHub em 04/09/2026 com validação de papéis e segurança], arquivo: "prints/atv4_entrega.png")
  #evidencia([Atividade 4 — Centro Administrativo com gerenciamento de papéis RBAC e bloqueios 403], arquivo: "prints/atv4_resultado.png")

  *Dificuldades e como foram resolvidas.* O risco de escalonamento indevido de privilégios por manipulação de estado no cliente (frontend). A resolução foi garantir que o frontend apenas reflita a interface de acordo com o token verificado, e que toda e qualquer mutação de perfil no backend seja estritamente checada na camada de banco de dados (`papel == 'admin'`), rejeitando imediatamente qualquer requisição não autorizada.
]

#atividade(
  "5", "Logs e auditoria",
  descricao: "Novo log-service com Redis registrando login, ações sensíveis e tentativas negadas.",
  planejada: "25/09/2026",
  realizada: "08/09/2026 11:21",
  situacao: "entregue",
  evidencia: "GitHub — commit fb46664 + print da consulta de logs pelo admin via Redis Streams",
  url: "https://github.com/danielmarcalgoncalves/filmecc/commit/fb4666424d959184d7d32457da1bf3cd7a09d9f8",
)[
  *O que foi feito.* Construção de um microsserviço dedicado de ingestão e consulta de auditoria (`log-service`) apoiado em *Redis Streams*. Compreendendo que eventos de auditoria possuem um perfil de escrita intensiva e append-only (write-heavy), optou-se tecnicamente por não onerar o banco relacional MariaDB com locks de gravação contínua. Para a ingestão, o serviço utiliza o comando `XADD logs:audit *`, gerando identificadores temporais nativos com precisão de milissegundos UTC. Para a visualização dos administradores no painel web, o endpoint executa `XREVRANGE logs:audit + - COUNT 100`, obtendo os eventos em ordem cronológica inversa com altíssima velocidade. O sistema audita logins com sucesso, tentativas de acesso inválidas, inclusão de favoritos, uploads e bloqueios `403 Forbidden`.

  #evidencia([Atividade 5 — commit fb46664 no GitHub em 08/09/2026 com arquitetura Redis Streams], arquivo: "prints/atv5_entrega.png")
  #evidencia([Atividade 5 — Painel de Auditoria em tempo real consultando eventos no Redis Streams], arquivo: "prints/atv5_resultado.png")

  *Dificuldades e como foram resolvidas.* Garantir que falhas de conectividade ou lentidão eventual no envio de logs não interrompessem a experiência do usuário final nos outros serviços. A solução consistiu na criação de uma rotina assíncrona desacoplada com `AbortController` e tempo limite estrito (timeout de 2,5s), garantindo que a gravação do log ocorra em segundo plano sem bloquear a resposta HTTP principal.
]

#atividade(
  "6", "Upload e perfil de usuário",
  descricao: "Página de perfil com avatar no MinIO; só a referência fica no banco relacional.",
  planejada: "02/10/2026",
  realizada: "09/09/2026 11:54",
  situacao: "entregue",
  evidencia: "GitHub — commit c967db2 + print do perfil com foto carregada do MinIO",
  url: "https://github.com/danielmarcalgoncalves/filmecc/commit/c967db27284846558571ea1ec6a3bd8715b679a8",
)[
  *O que foi feito.* Implementação da camada de armazenamento de arquivos não estruturados através da integração com o *MinIO*, um servidor de Object Storage de alta performance compatível com a API S3 da AWS. Foi desenvolvida a interface de perfil do usuário (`ProfilePage.jsx`), permitindo alteração de nome, biografia e upload de imagem de avatar. O backend recebe o fluxo binário via multipart/form-data, valida o tipo MIME e o tamanho máximo do arquivo, realiza o upload para o bucket seguro `perfil-fotos` no MinIO e grava no MariaDB estritamente a chave do objeto (referência textual), respeitando as boas práticas de arquitetura em nuvem que desaconselham o armazenamento de arquivos binários em colunas relacionais do tipo BLOB.

  #evidencia([Atividade 6 — commit c967db2 no GitHub em 09/09/2026 com upload de avatar no MinIO S3], arquivo: "prints/atv6_entrega.png")
  #evidencia([Atividade 6 — tela de perfil do usuário com foto de perfil e dados carregados], arquivo: "prints/atv6_resultado.png")

  *Dificuldades e como foram resolvidas.* Conflito de portas entre o host e contêineres pré-existentes na porta padrão 9000 do MinIO. A dificuldade foi resolvida mapeando portas dedicadas no Docker Compose (`9010:9000` para a API S3 e `9011:9001` para o Console Web administrativo do MinIO), além de implementar streaming de imagens com fallback visual gracioso quando a foto não está configurada.
]

// ============================================================
= Considerações finais
// ============================================================

O percurso prático trilhado ao longo deste primeiro bimestre proporcionou uma sólida e transformadora base conceitual em computação em nuvem. A experiência de vivenciar na prática a transição arquitetural — partindo de um monólito didático em Flask até atingir uma malha de serviços conteinerizados desacoplados — consolidou a compreensão de conceitos fundamentais como isolamento de ambiente, persistência poliglota especializada e segurança orientada a papéis. 

Dentre as principais dificuldades superadas, destacam-se a orquestração precisa das redes internas de contêineres sem vazamento desnecessário de portas para a máquina hospedeira, a harmonização do protocolo de mensageria assíncrona via Redis Streams para evitar gargalos em bancos relacionais, e a correta segregação de credenciais e segredos em arquivos de ambiente não versionados. Caso o projeto fosse reiniciado, uma decisão arquitetural que seria antecipada envolveria a padronização de contratos de API via Swagger/OpenAPI desde o primeiro microsserviço, o que agilizaria ainda mais a integração entre as equipes de frontend e backend.

Como perspectiva para o segundo bimestre da disciplina, pretendo aprofundar os conhecimentos em infraestrutura como código (IaC), esteiras de integração e entrega contínua (CI/CD) com GitHub Actions e a transposição destes contêineres para plataformas de nuvem pública gerenciadas em modelos PaaS e IaaS.

// ============================================================
= Declaração de autoria
// ============================================================
Declaro que este relatório foi elaborado por mim, individualmente, e que as evidências apresentadas correspondem a entregas de minha autoria, verificáveis nos links informados. Nas atividades realizadas em grupo, o conteúdo aqui descrito refere-se à minha participação.

#v(1.5cm)
#grid(
  columns: (1fr, 1fr), gutter: 2cm,
  align(center)[#line(length: 100%, stroke: 0.5pt) \ #aluno],
  align(center)[#line(length: 100%, stroke: 0.5pt) \ Pompeia, #data-relatorio],
)
