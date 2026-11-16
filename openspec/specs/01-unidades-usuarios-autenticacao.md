# OpenSpec 01 — Unidades de Saúde, Usuários e Autenticação (`RF003`, `RF001`, `RF002`, `RF007`)

## 1. Escopo
Especifica o cadastro e manutenção de Unidades de Saúde (`RF003`), Pacientes (`RF001`), Profissionais (`RF002`) e o fluxo de Autenticação e Autorização (`RF007`).

---

## 2. Requisitos e Endpoints

### 2.1. Unidades de Saúde (`RF003`)
- `POST /api/unidades` — Somente `ADMINISTRADOR`.
  - **Payload:** `{ cnes?: string(7 dígitos), cnpj: string(14 dígitos válidos), nome: string(3..150), telefone?: string, email?: string, cep: string, logradouro: string, numero: string, bairro: string, municipio: string, estado: string(2), complemento?: string, fusoHorario?: string('America/Maceio') }`.
  - **Regras:** `cnes` único quando informado; `nome + municipio` único; `cnpj` validado por dígito verificador (pode se repetir entre unidades da mesma rede).
- `GET /api/unidades` — Lista unidades (público autenticado ou filtros `?status=ATIVA&municipio=...` para permitir que o cidadão escolha a unidade ao agendar).
- `PATCH /api/unidades/:id/inativar` — Somente `ADMINISTRADOR`.
  - **Payload:** `{ motivoInativacao: string(min 5) }`.
  - **Regra:** Altera `status = INATIVA`; proíbe novas agendas e marcações nesta unidade. Sem `DELETE`.

### 2.2. Pacientes (`RF001`)
- `POST /api/pacientes/autocadastro` — Rota pública.
  - **Payload:** `{ cpf, cns, nomeCompleto, nomeSocial?, dataNascimento, email?, celular?, celularWhatsapp?, possuiDeficiencia, tiposDeficiencia?, preferenciasAcessibilidade?, cep, logradouro, numero, bairro, municipio, estado, complemento?, senha, cienciaPrivacidade: true }`.
  - **Regras:**
    - `cienciaPrivacidade` deve ser `true` (grava `cienciaPrivacidadeEm = now()`).
    - Validação de `Cpf`, `Cns` e `Senha` no domínio.
    - Pelo menos um contato (`email` ou `celular`) obrigatório.
    - `origemCadastro = 'AUTOATENDIMENTO'`, `situacaoCns = 'PENDENTE_CONFIRMACAO'`, `status = 'ATIVO'`.
    - Retorna `201 Created` sem expor `senhaHash`.
- `POST /api/pacientes/assistido` — Somente `ATENDENTE` ou `ADMINISTRADOR`.
  - Mesmas validações de domínio, com `origemCadastro = 'ASSISTIDO'`.
- `GET /api/pacientes/me` e `PATCH /api/pacientes/me` — Somente `PACIENTE` autenticado.
  - Permite atualizar contato, nome social, endereço e acessibilidade; **bloqueia alteração de `cpf`**.

### 2.3. Profissionais (`RF002`)
- `POST /api/profissionais` — Somente `ADMINISTRADOR`.
  - **Payload:** `{ cpf, nomeCompleto, nomeSocial?, conselhoProfissional?, numeroRegistro?, ufRegistro?, email, celular?, unidadesVinculadas: string[], especialidades?: string[], nivelAcesso, senha }`.
  - **Regras:**
    - Valida que todas as `unidadesVinculadas` existem e estão `ATIVA` (mínimo 1).
    - Para `PROFISSIONAL_SAUDE`, `conselhoProfissional`, `numeroRegistro`, `ufRegistro` e `especialidades` (>= 1) são obrigatórios.
    - Cadastro independente da tabela `pacientes` (o mesmo CPF pode existir em ambas).
    - Inicialmente `situacaoAcesso = 'ATIVO'` (simplificação MVP para operação imediata após cadastro pelo admin) e `status = 'ATIVO'`.
- `GET /api/profissionais` — Somente `ADMINISTRADOR`.
- `PATCH /api/profissionais/:id/inativar` — Somente `ADMINISTRADOR`.
  - Exige `{ motivoInativacao: string(min 5) }`. Impede que o administrador inative a si mesmo ou altere o próprio `nivelAcesso`.

### 2.4. Autenticação (`RF007`)
- `POST /api/auth/login` — Rota pública.
  - **Payload:** `{ cpf: string, senha: string, tipoUsuario: 'PACIENTE' | 'PROFISSIONAL' }`.
  - **Fluxo e Regras:**
    1. Normaliza e valida sintaxe do CPF; busca usuário na tabela correspondente (`pacientes` ou `profissionais`).
    2. Se não encontrado -> retorna `401 Unauthorized` com `{ erro: "CPF ou senha inválidos" }`.
    3. Se `!usuario.podeAutenticar()` (ex.: inativo ou bloqueado administrativamente) -> retorna `401` com `{ erro: "CPF ou senha inválidos" }` (ou mensagem de acesso indisponível sem vazar dados sensíveis; manter genérico `"CPF ou senha inválidos"` ou bloquear com status `403` apenas se já autenticado). Para aderência estrita ao `RF007`, retornar `"CPF ou senha inválidos"` em falha de credencial/inativo e `"Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente em 15 minutos."` (`423 Locked`) quando `estaBloqueado(agora)` for verdadeiro.
    4. Verifica hash `bcrypt`. Se incorreto: chama `usuario.registrarFalhaAutenticacao(agora)`, persiste no banco e retorna `401` `"CPF ou senha inválidos"`.
    5. Se correto: chama `usuario.registrarSucessoAutenticacao(agora)`, persiste no banco e gera JWT (`exp: 8h`) com payload `{ sub: usuario.id, tipoUsuario, perfil: usuario.obterPerfilAcesso(), unidadesVinculadas, nomeExibicao }`.
- `GET /api/auth/me` — Retorna dados do usuário logado a partir do JWT validado no servidor.

---

## 3. Cenários de Comportamento (Given / When / Then)

- **Cenário 1 — Autocadastro com CNS inválido:**
  - *Dado* que um cidadão envia CPF válido e CNS com dígito verificador inválido;
  - *Quando* submete `POST /api/pacientes/autocadastro`;
  - *Então* o Value Object `Cns` rejeita a criação e a API responde `400 Bad Request` sem gravar no banco.
- **Cenário 2 — Bloqueio após 5 tentativas falhas:**
  - *Dado* um paciente ou profissional ativo com `tentativasMalsucedidas = 4`;
  - *Quando* tenta login com senha incorreta;
  - *Então* o domínio incrementa para `5`, grava `bloqueioTemporarioAte = agora + 15min` e na próxima tentativa dentro dos 15 minutos responde `423 Locked`.
- **Cenário 3 — Mesmo CPF em Paciente e Profissional:**
  - *Dado* um cidadão já cadastrado em `pacientes` com CPF `X`;
  - *Quando* o Administrador cadastra o profissional com o mesmo CPF `X` e o usuário faz login selecionando `"PROFISSIONAL"`;
  - *Então* o cadastro e o login ocorrem normalmente no contexto profissional sem colisão com o cadastro de paciente.
