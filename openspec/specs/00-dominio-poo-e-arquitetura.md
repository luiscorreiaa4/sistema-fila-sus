# OpenSpec 00 — Domínio POO e Arquitetura de Camadas (`AV03`)

## 1. Objetivo
Garantir que toda a regra de negócio do Sistema de Transparência de Filas Públicas (SUS) esteja implementada em TypeScript na camada `backend/src/domain`, totalmente desacoplada do Express (HTTP) e do Prisma ORM (persistência), evidenciando os 4 pilares da Programação Orientada a Objetos.

---

## 2. Regras de Isolamento de Camadas
- `backend/src/domain/**` **NÃO PODE** importar `@prisma/client`, `express`, `zod` ou bibliotecas de banco/HTTP.
- `backend/src/application/use-cases/**` **PODE** importar apenas `domain/**` e utilitários puros (ex.: serviço de token/hash por interface `ITokenService`, `IHashService`).
- `backend/src/infrastructure/**` implementa as interfaces definidas em `domain/repositories/` e `application/`, adaptando DTOs HTTP (Zod) e modelos do Prisma para entidades de domínio.

---

## 3. Value Objects (`backend/src/domain/value-objects/`)

### 3.1. `Cpf` (`Cpf.ts`)
- **Estado interno:** `private readonly valor: string` (sempre 11 dígitos numéricos).
- **Validações no método fábrica `Cpf.criar(raw: string): Cpf`:**
  1. Remove caracteres não numéricos.
  2. Exige exatamente 11 dígitos.
  3. Recusa sequências repetidas (`00000000000` a `99999999999`).
  4. Calcula e valida o 1º e o 2º dígito verificador pelo algoritmo módulo 11 oficial da Receita Federal.
  5. Lança `ValidationError("CPF inválido")` caso qualquer critério falhe.
- **Métodos públicos:** `getValor(): string`, `formatado(): string` (`000.000.000-00`), `equals(outro: Cpf): boolean`.

### 3.2. `Cns` (`Cns.ts`)
- **Estado interno:** `private readonly valor: string` (sempre 15 dígitos numéricos).
- **Validações em `Cns.criar(raw: string): Cns`:**
  1. Remove caracteres não numéricos.
  2. Exige exatamente 15 dígitos e recusa sequências repetidas.
  3. Se iniciar com `1` ou `2` (CNS definitivo): aplica algoritmo oficial do Ministério da Saúde (soma ponderada dos 11 primeiros dígitos com pesos `15..5`, cálculo do DV `11 - (soma % 11)`, tratando resto 10 adicionando +2 e sufixo `001` ou `000`).
  4. Se iniciar com `7`, `8` ou `9` (CNS provisório): exige `(soma ponderada com pesos 15..1) % 11 === 0`.
  5. Qualquer outro dígito inicial ou falha no módulo 11 lança `ValidationError("CNS inválido")`.
- **Métodos públicos:** `getValor(): string`, `equals(outro: Cns): boolean`.

### 3.3. `Senha` (`Senha.ts`)
- **Estado interno:** `private readonly hash: string`.
- **Fábricas:**
  - `Senha.criarDeTextoPlano(senhaPlana: string, cpfLimpo: string, dataNascimento?: Date, hashFn?: (s: string) => Promise<string>)` — ou validação síncrona `Senha.validarForca(senhaPlana, cpfLimpo, dataNascimento)` combinada com `IPasswordHasher`:
    - Comprimento entre **8 e 64 caracteres**.
    - Deve conter ao menos **1 letra** (`[a-zA-Z]`) e **1 número** (`[0-9]`).
    - Não pode ser igual ao CPF (limpo ou formatado) nem coincidir com a data de nascimento (`DDMMAAAA` ou `AAAAMMDD`).
  - `Senha.deHash(hash: string): Senha` para reconstituição a partir do banco de dados.

---

## 4. Hierarquia de Usuários (`Abstração` e `Herança`)

### 4.1. `abstract class Usuario` (`Usuario.ts`)
- **Atributos protegidos:**
  - `id: string`
  - `cpf: Cpf`
  - `nomeCompleto: string` (3 a 150 caracteres)
  - `nomeSocial?: string | null`
  - `email?: string | null`
  - `celular?: string | null`
  - `senhaHash: Senha`
  - `status: 'ATIVO' | 'INATIVO'`
  - `tentativasMalsucedidas: number`
  - `bloqueioTemporarioAte?: Date | null`
  - `ultimoAcesso?: Date | null`
- **Métodos concretos compartilhados:**
  - `obterNomeExibicao(): string` — retorna `nomeSocial` se preenchido e não vazio; caso contrário retorna `nomeCompleto`.
  - `estaBloqueado(agora: Date): boolean` — retorna `true` se `bloqueioTemporarioAte != null && bloqueioTemporarioAte > agora`.
  - `registrarFalhaAutenticacao(agora: Date): void` — incrementa `tentativasMalsucedidas`; ao atingir **5**, define `bloqueioTemporarioAte = agora + 15 minutos`.
  - `registrarSucessoAutenticacao(agora: Date): void` — zera `tentativasMalsucedidas`, limpa `bloqueioTemporarioAte` e atualiza `ultimoAcesso = agora`.
- **Contratos abstratos:**
  - `abstract obterPerfilAcesso(): string`
  - `abstract podeAutenticar(): boolean`

### 4.2. `class Paciente extends Usuario` (`Paciente.ts`)
- **Atributos específicos:** `cns: Cns`, `dataNascimento: Date`, `possuiDeficiencia: 'SIM' | 'NAO' | 'PREFIRO_NAO_INFORMAR'`, `tiposDeficiencia: TipoDeficiencia[]`, `preferenciasAcessibilidade?: string`, `endereco: Endereco`, `celularWhatsapp: boolean`, `cienciaPrivacidadeEm: Date`, `situacaoCns: 'PENDENTE_CONFIRMACAO' | 'CONFIRMADO' | 'DIVERGENTE'`, `origemCadastro: 'AUTOATENDIMENTO' | 'ASSISTIDO'`.
- **Invariantes encapsuladas:**
  - Pelo menos `email` ou `celular` deve estar preenchido.
  - `dataNascimento` não pode ser futura nem resultar em idade > 130 anos.
  - `cienciaPrivacidadeEm` obrigatório no autocadastro.
- **Métodos:**
  - `calcularIdade(referencia = new Date()): number`
  - `ehPrioritarioLegal(referencia = new Date()): boolean` (`idade >= 60 || possuiDeficiencia === 'SIM'`)
  - `obterCriterioPrioridade(referencia = new Date()): 'IDOSO_60_MAIS' | 'PCD' | 'AMBOS' | 'PADRAO'`
  - `obterPerfilAcesso(): string` (retorna `'PACIENTE'`)
  - `podeAutenticar(): boolean` (retorna `status === 'ATIVO'`)

### 4.3. `class Profissional extends Usuario` (`Profissional.ts`)
- **Atributos específicos:** `conselhoProfissional?: string`, `numeroRegistro?: string`, `ufRegistro?: string`, `nivelAcesso: 'ATENDENTE' | 'PROFISSIONAL_SAUDE' | 'ADMINISTRADOR'`, `situacaoAcesso: 'CONVITE_PENDENTE' | 'ATIVO' | 'BLOQUEADO'`, `unidadesVinculadas: string[]`, `especialidades: string[]`, `motivoInativacao?: string`.
- **Invariantes encapsuladas:**
  - Exige pelo menos 1 unidade em `unidadesVinculadas`.
  - Se `nivelAcesso === 'PROFISSIONAL_SAUDE'`, exige `conselhoProfissional`, `numeroRegistro`, `ufRegistro` e pelo menos 1 especialidade.
  - Exige `email` obrigatório e válido.
- **Métodos:**
  - `estaVinculadoAUnidade(unidadeId: string): boolean`
  - `podeGerenciarAgenda(): boolean` (`ADMINISTRADOR` ou `PROFISSIONAL_SAUDE`)
  - `podeChamarFila(): boolean` (`ATENDENTE`, `PROFISSIONAL_SAUDE` ou `ADMINISTRADOR`)
  - `inativar(motivo: string): void` (exige motivo obrigatório)
  - `obterPerfilAcesso(): string` (retorna `nivelAcesso`)
  - `podeAutenticar(): boolean` (`status === 'ATIVO' && situacaoAcesso === 'ATIVO'`)

---

## 5. Polimorfismo (`EstrategiaChamadaFila` e `I*Repository`)

### 5.1. Estratégias de Chamada (`backend/src/domain/strategies/`)
```ts
export interface EstrategiaChamadaFila {
  selecionarProximaEntrada(
    aguardando: EntradaFila[],
    prioritariosSeguidosNoCiclo: number
  ): EntradaFila | null;
}
```
- **`RodizioPrioritarioComumStrategy`:**
  - Recebe `proporcaoPrioritarios = 5` no construtor (padrão 5 prioritários para 1 comum).
  - Separa `aguardando` em `prioritarios` (ordenados por `ordemEntrada` ascendente) e `comuns` (ordenados por `ordemEntrada` ascendente).
  - Se ambos vazios -> retorna `null`.
  - Se `prioritariosSeguidosNoCiclo < proporcaoPrioritarios` e houver `prioritarios` -> escolhe o primeiro de `prioritarios`; se não houver prioritários, escolhe o primeiro de `comuns` (sem deixar guichê ocioso).
  - Se `prioritariosSeguidosNoCiclo >= proporcaoPrioritarios` e houver `comuns` -> escolhe o primeiro de `comuns`; se não houver comuns, escolhe o primeiro de `prioritarios`.
- **`OrdemChegadaStrategy`:**
  - Ordena exclusivamente por `ordemEntrada` ascendente e retorna o primeiro registro.

### 5.2. Interfaces de Repositório (`backend/src/domain/repositories/`)
- `IUnidadeSaudeRepository`
- `IPacienteRepository`
- `IProfissionalRepository`
- `IServicoRepository`
- `IAgendaRepository`
- `IAgendamentoRepository`
- `IFilaRepository`
- `IPainelPublicoRepository`

---

## 6. Critérios de Aceitação (Verificação)
- Nenhuma entidade de domínio importa Prisma ou Express.
- Testes unitários de domínio validam `Cpf`, `Cns`, `Senha`, bloqueio após 5 falhas em `Usuario`, cálculo de prioridade em `Paciente` e rodízio 5:1 em `RodizioPrioritarioComumStrategy`.
