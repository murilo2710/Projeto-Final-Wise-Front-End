<p align="center">
  <img width="160" height="160" alt="OdontoFlow Logo" src="public/assets/logo.png" />
</p>

# OdontoFlow - Frontend

Interface web do OdontoFlow, uma aplicação para gestão de clínica odontológica com controle de pacientes, dentistas, especialidades, consultas, materiais, estoque, relatórios, administração e notificações em tempo real.

Projeto final desenvolvido para o Programa Trainee da **Wise Systems**.

---

## Sobre o Projeto

O frontend foi desenvolvido em **Angular 20** com **Standalone Components**, **Signals**, formulários reativos e integração com uma API REST em Spring Boot. A aplicação utiliza autenticação JWT com **access token** e **refresh token**, controle de rotas por perfil, gráficos com Chart.js, notificações via WebSocket/STOMP e execução em produção local com Docker + Nginx.

O sistema possui dois perfis principais:

- **ADMIN**: acesso completo, incluindo painel administrativo e gestão de usuários.
- **DENTISTA**: acesso às funcionalidades operacionais permitidas pelo backend, sem acesso ao painel administrativo.

---

## Tecnologias

- **Angular** 20.3
- **TypeScript** 5.9
- **Angular Router**
- **Angular Signals**
- **Reactive Forms**
- **RxJS** 7.8
- **HttpClient** com interceptor funcional
- **Chart.js** 4.5
- **SweetAlert2** 11
- **SockJS + STOMP** para WebSocket
- **CSS puro** com fontes locais Lufga
- **Docker** com build multi-stage
- **Nginx** para servir o build de produção
- **Karma + Jasmine** para testes unitários

---

## Funcionalidades

### Autenticação

- Login com validação de formulário.
- Persistência de sessão em `localStorage`.
- Uso de `accessToken` nas requisições autenticadas.
- Renovação automática da sessão com `refreshToken`.
- Logout com revogação do refresh token no backend.
- Redirecionamento para login quando a sessão expira.
- Proteção de rotas com `authGuard`.
- Controle de acesso por perfil.

### Dashboard

- Indicadores de consultas.
- Totais por status: agendadas, finalizadas e canceladas.
- Indicadores de pacientes e dentistas com consultas.
- Lista de próximas consultas.
- Visualização gráfica da distribuição por status.

### Consultas

- Listagem, criação, edição e cancelamento.
- Vínculo com paciente e dentista.
- Status: agendada, finalizada e cancelada.
- Motivo obrigatório para cancelamento.
- Upload, listagem, download e remoção de anexos.
- Confirmações com SweetAlert antes de ações sensíveis.

### Pacientes

- Cadastro, edição, listagem e exclusão.
- Validação de nome, CPF, e-mail e telefone.
- CPF aceito com ou sem pontuação.
- CPF exibido de forma formatada no sistema.

### Dentistas

- Cadastro, edição, listagem, ativação e inativação.
- Validação de nome, CPF, e-mail e CRO.
- Vínculo com uma ou mais especialidades.
- Opção de vincular usuário existente com perfil `DENTISTA` ao cadastrar um profissional.
- Filtro visual por ativos, inativos e todos.

### Especialidades

- Cadastro, edição, listagem e exclusão.
- Validação de nome com letras, espaços e hífen.
- Utilizada por dentistas e materiais.

### Materiais e Estoque

- Tela única com navegação interna por abas:
  - Dashboard
  - Materiais
  - Movimentações
- Cadastro e edição de materiais.
- Ativação e inativação de materiais.
- Controle de quantidade atual e mínima.
- Indicador de baixo estoque.
- Filtros por status, baixo estoque e especialidade.
- Registro de movimentações de estoque:
  - Entrada
  - Saída
  - Ajuste
- Histórico de movimentações.

### Relatórios

- Filtros por paciente, dentista, especialidade, usuário, status e período.
- Indicadores de consultas.
- Gráficos com Chart.js.
- Cálculo de horas por paciente, dentista e especialidade vinculada.
- Modos de cálculo:
  - Horas ocupadas
  - Horas realizadas

### Administração

Disponível apenas para `ADMIN`.

- Visão geral administrativa.
- Gestão de usuários.
- Criação, edição e exclusão de usuários.
- Alteração de perfil: `ADMIN` ou `DENTISTA`.
- Status ativo/inativo.
- Status profissional para usuários dentistas:
  - Cadastro profissional pendente
  - Dentista cadastrado
- Logs de atividade com filtros.

### Perfil

- Dados do usuário autenticado.
- CPF, perfil, status, data de criação e último acesso.
- Logout.

### Notificações

- WebSocket/STOMP com SockJS.
- Inscrição em `/topic/notificacoes`.
- Toasts globais para sucesso, informação e alerta.
- Notificações amigáveis para erros relevantes do backend.

### Onboarding

- Guia inicial exibido automaticamente no primeiro acesso autenticado do usuário após o login.
- Destaque visual da navegação lateral.
- Persistência em `localStorage` para exibir o tour apenas uma vez por usuário.
- Ajuda o usuário a entender as principais áreas do sistema logo no primeiro uso.

---

## Pré-requisitos

Para desenvolvimento local:

- Node.js 18 ou superior
- npm
- Angular CLI compatível com Angular 20
- Backend em execução em `http://127.0.0.1:8080`

Para execução com Docker:

- Docker Desktop ou Docker Engine
- Backend publicado na máquina host em `127.0.0.1:8080`

---

## Rodando em Desenvolvimento

Instale as dependências:

```bash
npm install
```

Inicie o frontend:

```bash
npm start
```

O comando acima executa:

```bash
ng serve --proxy-config proxy.conf.json
```

Acesse:

```txt
http://127.0.0.1:4200/login
```

---

## Proxy de Desenvolvimento

Em desenvolvimento, as chamadas do frontend usam caminhos relativos:

```txt
/api
/ws
```

O arquivo `proxy.conf.json` redireciona essas chamadas para o backend:

```json
{
  "/api": {
    "target": "http://127.0.0.1:8080",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": {
      "^/api": ""
    }
  },
  "/ws": {
    "target": "http://127.0.0.1:8080",
    "secure": false,
    "changeOrigin": true,
    "ws": true
  }
}
```

Exemplo:

```txt
/api/auth/login -> http://127.0.0.1:8080/auth/login
/ws             -> http://127.0.0.1:8080/ws
```

---

## Rodando com Docker

O projeto possui Dockerfile multi-stage:

1. Build Angular com `node:lts-alpine`.
2. Execução do build estático com `nginx:alpine`.

Gere a imagem:

```bash
docker build -t sistema-odonto-frontend .
```

Execute o container:

```bash
docker run --rm --name sistema-odonto-frontend -p 4200:80 sistema-odonto-frontend
```

Acesse:

```txt
http://127.0.0.1:4200/login
```

### Comunicação com o Backend no Docker

Dentro do container, `127.0.0.1` aponta para o próprio container do frontend. Por isso, o `nginx.conf` usa:

```txt
http://host.docker.internal:8080
```

Esse endereço permite que o container do frontend acesse o backend publicado no host em:

```txt
http://127.0.0.1:8080
```

O Nginx encaminha:

```txt
/api -> http://host.docker.internal:8080
/ws  -> http://host.docker.internal:8080/ws
```

---

## Scripts

| Script | Descrição |
| --- | --- |
| `npm start` | Inicia o servidor de desenvolvimento com proxy |
| `npm run build` | Gera build de produção em `dist/` |
| `npm run watch` | Build em modo observação |
| `npm test` | Executa testes unitários com Karma/Jasmine |

---

## Estrutura de Pastas

```txt
/
├── public/
│   └── assets/
│       ├── font/
│       └── logo.png
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── consultas/
│   │   │   ├── dashboard/
│   │   │   ├── dentistas/
│   │   │   ├── especialidades/
│   │   │   ├── login/
│   │   │   ├── materiais/
│   │   │   ├── pacientes/
│   │   │   ├── perfil/
│   │   │   └── relatorios/
│   │   ├── services/
│   │   │   ├── admin.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   ├── auth.interceptor.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── consulta-arquivo.service.ts
│   │   │   ├── consulta.service.ts
│   │   │   ├── dentista.service.ts
│   │   │   ├── especialidade.service.ts
│   │   │   ├── estoque-movimentacao.service.ts
│   │   │   ├── material.service.ts
│   │   │   ├── paciente.service.ts
│   │   │   ├── perfil.service.ts
│   │   │   └── usuario.service.ts
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── app-layout/
│   │   │   │   ├── edit-modal/
│   │   │   │   ├── notificacao-toasts/
│   │   │   │   ├── onboarding-tour/
│   │   │   │   └── sidebar/
│   │   │   ├── services/
│   │   │   │   ├── alert.service.ts
│   │   │   │   ├── notificacao-realtime.service.ts
│   │   │   │   └── notificacao-toast.service.ts
│   │   │   ├── styles/
│   │   │   │   ├── dashboard-page.css
│   │   │   │   └── odonto-page.css
│   │   │   ├── utils/
│   │   │   │   └── cpf.ts
│   │   │   └── validators/
│   │   │       └── form-validators.ts
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   └── app.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── .dockerignore
├── Dockerfile
├── nginx.conf
├── proxy.conf.json
├── angular.json
├── package.json
└── README.md
```

---

## Rotas

| Rota | Tela | Proteção |
| --- | --- | --- |
| `/login` | Login | Pública |
| `/dashboard` | Dashboard | `authGuard` |
| `/consultas` | Consultas | `authGuard` |
| `/pacientes` | Pacientes | `authGuard` |
| `/dentistas` | Dentistas | `authGuard` |
| `/especialidades` | Especialidades | `authGuard` |
| `/materiais` | Materiais/Estoque | `authGuard` |
| `/relatorios` | Relatórios | `authGuard` |
| `/admin` | Administração | `authGuard` + perfil `ADMIN` |
| `/perfil` | Perfil | `authGuard` |
| `/usuarios` | Redireciona para `/admin` | Compatibilidade |
| `/` | Redireciona para `/dashboard` | - |
| `**` | Redireciona para `/dashboard` | - |

---

## Autenticação e Sessão

No login, o backend retorna:

```json
{
  "id": 1,
  "nome": "Admin Odonto",
  "email": "admin@odonto.com",
  "perfil": "ADMIN",
  "token": "access-token",
  "accessToken": "access-token",
  "refreshToken": "refresh-token",
  "tipoToken": "Bearer",
  "expiresInMs": 86400000,
  "refreshExpiresInMs": 604800000
}
```

O frontend salva:

```txt
sistemaodonto.usuario
sistemaodonto.token
sistemaodonto.refreshToken
sistemaodonto.tipoToken
```

O interceptor:

- adiciona `Authorization: Bearer <accessToken>`;
- tenta renovar sessão com `/api/auth/refresh` quando recebe `401`;
- salva os novos tokens;
- repete a requisição original;
- limpa sessão e redireciona para login se o refresh falhar.

No logout, o frontend chama:

```txt
POST /api/auth/logout
```

com o corpo:

```json
{
  "refreshToken": "refresh-token-atual"
}
```

Mesmo se o logout remoto falhar, a sessão local é limpa.

---

## Validações

Os formulários do frontend reforçam as validações do backend:

- Nome com mínimo de 3 caracteres e apenas letras, acentos, espaços e separadores simples.
- CPF obrigatório e válido.
- E-mail obrigatório e válido.
- Telefone opcional com formato controlado.
- CRO obrigatório e com caracteres válidos.
- Especialidade sem números ou símbolos aleatórios.
- Material com nome, unidade, descrição e quantidades validadas.
- Consulta com descrição mínima e data final posterior à data inicial.
- Cancelamento com motivo obrigatório.
- Movimentação de estoque com quantidade maior que zero e motivo obrigatório.

---

## WebSocket

O serviço de notificações em tempo real conecta em:

```txt
/ws
```

No desenvolvimento, o `proxy.conf.json` encaminha para:

```txt
http://127.0.0.1:8080/ws
```

No Docker, o Nginx encaminha para:

```txt
http://host.docker.internal:8080/ws
```

O tópico utilizado é:

```txt
/topic/notificacoes
```

---

## Testes Manuais Recomendados

1. Login como `ADMIN`.
2. Login como `DENTISTA`.
3. Renovação automática do access token.
4. Logout com revogação de refresh token.
5. CRUD de pacientes.
6. CRUD, ativação e inativação de dentistas.
7. CRUD de especialidades.
8. CRUD, cancelamento e anexos de consultas.
9. Dashboard principal.
10. Relatórios com filtros e gráficos.
11. Administração e logs.
12. Perfil do usuário logado.
13. Materiais e movimentações de estoque.
14. Notificações em tempo real.
15. Responsividade mobile/tablet/desktop.
16. Execução via Docker em `http://127.0.0.1:4200/login`.

---

## Boas Práticas Aplicadas

- Standalone Components.
- Guards funcionais.
- Interceptor funcional.
- Formulários reativos.
- Signals para estado local.
- Serviços dedicados para comunicação HTTP.
- Tratamento de loading, erro e estado vazio.
- SweetAlert para confirmações.
- Toasts globais para feedback.
- Validação de perfil no front e backend.
- Rotas protegidas.
- Dockerização com Nginx.
- SPA compatível com refresh de rota.

---

## Licença

Este projeto faz parte do **Programa Trainee da Wise Systems**.
