import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { obterIntervaloDiaMaceio } from '../../../application/utils/dataMaceio';
import { prisma } from '../../database/prisma/client';
import { createApp } from '../app';

const CPF_ADMIN_SEED = '11144477735';
const SENHA_ADMIN_SEED = 'AdminSus2026';

const CPF_PACIENTE_IDOSO = '33366699957';
const CNS_PACIENTE_IDOSO = '700000000000005';
const CPF_PACIENTE_COMUM = '71428596364';
const CNS_PACIENTE_COMUM = '800000000000001';
const CPF_MEDICO_TESTE = '98765432100';

let server: http.Server;
let baseUrl = '';

const idsParaLimpar = {
  unidadeIds: [] as string[],
  profissionalIds: [] as string[],
  pacienteIds: [] as string[],
  servicoIds: [] as string[],
  agendaIds: [] as string[],
  vagaIds: [] as string[],
  agendamentoIds: [] as string[],
  entradaFilaIds: [] as string[],
};

async function apiRequest<T = Record<string, unknown>>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; headers: Headers; data: T }> {
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const texto = await response.text();
  const data = (texto ? JSON.parse(texto) : {}) as T;

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

async function limparDadosDeTeste(): Promise<void> {
  if (idsParaLimpar.entradaFilaIds.length > 0) {
    await prisma.chamadaFila.deleteMany({
      where: { entradaFilaId: { in: idsParaLimpar.entradaFilaIds } },
    });
    await prisma.historicoEvento.deleteMany({
      where: {
        entidade: 'ENTRADA_FILA',
        entidadeId: { in: idsParaLimpar.entradaFilaIds },
      },
    });
    await prisma.entradaFila.deleteMany({
      where: { id: { in: idsParaLimpar.entradaFilaIds } },
    });
  }

  if (idsParaLimpar.agendamentoIds.length > 0) {
    await prisma.historicoEvento.deleteMany({
      where: {
        entidade: 'AGENDAMENTO',
        entidadeId: { in: idsParaLimpar.agendamentoIds },
      },
    });
    await prisma.agendamento.deleteMany({
      where: { id: { in: idsParaLimpar.agendamentoIds } },
    });
  }

  if (idsParaLimpar.vagaIds.length > 0) {
    await prisma.vagaAgenda.deleteMany({
      where: { id: { in: idsParaLimpar.vagaIds } },
    });
  }

  if (idsParaLimpar.agendaIds.length > 0) {
    await prisma.vagaAgenda.deleteMany({
      where: { agendaId: { in: idsParaLimpar.agendaIds } },
    });
    await prisma.agenda.deleteMany({
      where: { id: { in: idsParaLimpar.agendaIds } },
    });
  }

  if (idsParaLimpar.servicoIds.length > 0) {
    await prisma.servico.deleteMany({
      where: { id: { in: idsParaLimpar.servicoIds } },
    });
  }

  if (idsParaLimpar.pacienteIds.length > 0) {
    await prisma.paciente.deleteMany({
      where: { id: { in: idsParaLimpar.pacienteIds } },
    });
  }

  if (idsParaLimpar.profissionalIds.length > 0) {
    await prisma.profissional.deleteMany({
      where: { id: { in: idsParaLimpar.profissionalIds } },
    });
  }

  if (idsParaLimpar.unidadeIds.length > 0) {
    await prisma.unidadeSaude.deleteMany({
      where: { id: { in: idsParaLimpar.unidadeIds } },
    });
  }
}

describe('Integração Ponta a Ponta — API HTTP + Casos de Uso + Prisma + PostgreSQL 3AF', () => {
  let tokenAdmin = '';
  let tokenMedico = '';
  let tokenIdoso = '';
  let tokenComum = '';

  let unidadeTesteId = '';
  let servicoTesteId = '';
  let medicoTesteId = '';
  let pacienteIdosoId = '';
  let pacienteComumId = '';
  let vagaConcorrenciaId = '';
  let vagaSecundariaId = '';
  let agendamentoIdosoId = '';
  let protocoloIdoso = '';
  let agendamentoComumId = '';
  let protocoloComum = '';
  let entradaIdosoId = '';
  let entradaComumId = '';

  before(async () => {
    // Limpa eventuais sobras de execução abortada anterior pelos identificadores únicos de teste
    const pacientesResiduais = await prisma.paciente.findMany({
      where: { cpf: { in: [CPF_PACIENTE_IDOSO, CPF_PACIENTE_COMUM] } },
      select: { id: true },
    });
    const profResiduais = await prisma.profissional.findMany({
      where: { cpf: CPF_MEDICO_TESTE },
      select: { id: true },
    });
    const unidadesResiduais = await prisma.unidadeSaude.findMany({
      where: { cnes: '9999001' },
      select: { id: true },
    });
    const servicosResiduais = await prisma.servico.findMany({
      where: { nome: 'Consulta Teste Integração' },
      select: { id: true },
    });

    const pIds = pacientesResiduais.map((p) => p.id);
    if (pIds.length > 0) {
      const entradas = await prisma.entradaFila.findMany({
        where: { pacienteId: { in: pIds } },
        select: { id: true },
      });
      const ags = await prisma.agendamento.findMany({
        where: { pacienteId: { in: pIds } },
        select: { id: true },
      });
      idsParaLimpar.entradaFilaIds.push(...entradas.map((e) => e.id));
      idsParaLimpar.agendamentoIds.push(...ags.map((a) => a.id));
      idsParaLimpar.pacienteIds.push(...pIds);
    }
    if (unidadesResiduais.length > 0) {
      const agendas = await prisma.agenda.findMany({
        where: { unidadeId: { in: unidadesResiduais.map((u) => u.id) } },
        select: { id: true },
      });
      idsParaLimpar.agendaIds.push(...agendas.map((a) => a.id));
      idsParaLimpar.unidadeIds.push(...unidadesResiduais.map((u) => u.id));
    }
    if (servicosResiduais.length > 0) {
      idsParaLimpar.servicoIds.push(...servicosResiduais.map((s) => s.id));
    }
    if (profResiduais.length > 0) {
      idsParaLimpar.profissionalIds.push(...profResiduais.map((p) => p.id));
    }
    await limparDadosDeTeste();

    idsParaLimpar.unidadeIds.length = 0;
    idsParaLimpar.profissionalIds.length = 0;
    idsParaLimpar.pacienteIds.length = 0;
    idsParaLimpar.servicoIds.length = 0;
    idsParaLimpar.agendaIds.length = 0;
    idsParaLimpar.vagaIds.length = 0;
    idsParaLimpar.agendamentoIds.length = 0;
    idsParaLimpar.entradaFilaIds.length = 0;

    const app = createApp(prisma);
    server = app.listen(0);
    await new Promise<void>((resolve) => {
      server.once('listening', resolve);
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await limparDadosDeTeste();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await prisma.$disconnect();
  });

  it('deve responder GET /api/health com CORS habilitado', async () => {
    const res = await apiRequest<{ status: string }>('/api/health', {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
    assert.equal(
      res.headers.get('access-control-allow-origin'),
      'http://localhost:5173'
    );
  });

  it('Spec 01: deve autenticar admin do seed, criar unidade, profissional e autocadastrar pacientes com proteção de perfil', async () => {
    const loginAdmin = await apiRequest<{
      token: string;
      usuario: { perfil: string };
    }>('/api/auth/login', {
      method: 'POST',
      body: {
        cpf: CPF_ADMIN_SEED,
        senha: SENHA_ADMIN_SEED,
        tipoUsuario: 'PROFISSIONAL',
      },
    });
    assert.equal(loginAdmin.status, 200);
    assert.ok(loginAdmin.data.token);
    assert.equal(loginAdmin.data.usuario.perfil, 'ADMINISTRADOR');
    tokenAdmin = loginAdmin.data.token;

    const meAdmin = await apiRequest<{
      tipoUsuario: string;
      usuario: { perfil: string };
    }>('/api/auth/me', { token: tokenAdmin });
    assert.equal(meAdmin.status, 200);
    assert.equal(meAdmin.data.tipoUsuario, 'PROFISSIONAL');

    // Criar unidade de teste
    const criarUnidade = await apiRequest<{ unidade: { id: string } }>(
      '/api/unidades',
      {
        method: 'POST',
        token: tokenAdmin,
        body: {
          cnes: '9999001',
          cnpj: '11222333000181',
          nome: 'UBS Teste Integração',
          cep: '57050000',
          logradouro: 'Rua Teste',
          numero: '10',
          bairro: 'Farol',
          municipio: 'Maceió',
          estado: 'AL',
        },
      }
    );
    assert.equal(criarUnidade.status, 201);
    unidadeTesteId = criarUnidade.data.unidade.id;
    idsParaLimpar.unidadeIds.push(unidadeTesteId);

    // Criar profissional de saúde vinculado à unidade de teste
    const criarMedico = await apiRequest<{ profissional: { id: string } }>(
      '/api/profissionais',
      {
        method: 'POST',
        token: tokenAdmin,
        body: {
          cpf: CPF_MEDICO_TESTE,
          nomeCompleto: 'Dr. Integracao Teste',
          conselhoProfissional: 'CRM',
          numeroRegistro: '99999',
          ufRegistro: 'AL',
          email: 'medico.integracao@sus.gov.br',
          unidadesVinculadas: [unidadeTesteId],
          especialidades: ['Cardiologia'],
          nivelAcesso: 'PROFISSIONAL_SAUDE',
          senha: 'MedicoTeste2026',
        },
      }
    );
    assert.equal(criarMedico.status, 201);
    medicoTesteId = criarMedico.data.profissional.id;
    idsParaLimpar.profissionalIds.push(medicoTesteId);

    const loginMedico = await apiRequest<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: {
        cpf: CPF_MEDICO_TESTE,
        senha: 'MedicoTeste2026',
        tipoUsuario: 'PROFISSIONAL',
      },
    });
    assert.equal(loginMedico.status, 200);
    tokenMedico = loginMedico.data.token;

    // Recusar autocadastro com CNS inválido
    const cnsInvalido = await apiRequest('/api/pacientes/autocadastro', {
      method: 'POST',
      body: {
        cpf: CPF_PACIENTE_IDOSO,
        cns: '700000000000001',
        nomeCompleto: 'José Idoso Teste',
        dataNascimento: '1955-03-10',
        email: 'jose.idoso@teste.com',
        possuiDeficiencia: 'NAO',
        cep: '57050000',
        logradouro: 'Rua A',
        numero: '1',
        bairro: 'Centro',
        municipio: 'Maceió',
        estado: 'AL',
        senha: 'Paciente2026',
        cienciaPrivacidade: true,
      },
    });
    assert.equal(cnsInvalido.status, 400);

    // Autocadastro válido de idoso (>= 60 anos) e comum (< 60 anos)
    const cadIdoso = await apiRequest<{
      paciente: { id: string; ehPrioritarioLegal: boolean; senhaHash?: string };
    }>('/api/pacientes/autocadastro', {
      method: 'POST',
      body: {
        cpf: CPF_PACIENTE_IDOSO,
        cns: CNS_PACIENTE_IDOSO,
        nomeCompleto: 'José Idoso Teste',
        dataNascimento: '1955-03-10',
        email: 'jose.idoso@teste.com',
        possuiDeficiencia: 'NAO',
        cep: '57050000',
        logradouro: 'Rua A',
        numero: '1',
        bairro: 'Centro',
        municipio: 'Maceió',
        estado: 'AL',
        senha: 'Paciente2026',
        cienciaPrivacidade: true,
      },
    });
    assert.equal(cadIdoso.status, 201);
    assert.equal(cadIdoso.data.paciente.ehPrioritarioLegal, true);
    assert.equal(cadIdoso.data.paciente.senhaHash, undefined);
    pacienteIdosoId = cadIdoso.data.paciente.id;
    idsParaLimpar.pacienteIds.push(pacienteIdosoId);

    const cadComum = await apiRequest<{
      paciente: { id: string; ehPrioritarioLegal: boolean };
    }>('/api/pacientes/autocadastro', {
      method: 'POST',
      body: {
        cpf: CPF_PACIENTE_COMUM,
        cns: CNS_PACIENTE_COMUM,
        nomeCompleto: 'Ana Comum Teste',
        dataNascimento: '1995-07-20',
        email: 'ana.comum@teste.com',
        possuiDeficiencia: 'NAO',
        cep: '57050000',
        logradouro: 'Rua B',
        numero: '2',
        bairro: 'Centro',
        municipio: 'Maceió',
        estado: 'AL',
        senha: 'Paciente2026',
        cienciaPrivacidade: true,
      },
    });
    assert.equal(cadComum.status, 201);
    assert.equal(cadComum.data.paciente.ehPrioritarioLegal, false);
    pacienteComumId = cadComum.data.paciente.id;
    idsParaLimpar.pacienteIds.push(pacienteComumId);

    // Login dos pacientes
    const loginIdoso = await apiRequest<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: {
        cpf: CPF_PACIENTE_IDOSO,
        senha: 'Paciente2026',
        tipoUsuario: 'PACIENTE',
      },
    });
    assert.equal(loginIdoso.status, 200);
    tokenIdoso = loginIdoso.data.token;

    // Paciente não pode criar unidade (403)
    const pacienteCriarUnidade = await apiRequest('/api/unidades', {
      method: 'POST',
      token: tokenIdoso,
      body: {},
    });
    assert.equal(pacienteCriarUnidade.status, 403);

    // PATCH /api/pacientes/me bloqueia alteração de CPF e atualiza nomeSocial
    const patchCpf = await apiRequest('/api/pacientes/me', {
      method: 'PATCH',
      token: tokenIdoso,
      body: { cpf: CPF_PACIENTE_COMUM },
    });
    assert.equal(patchCpf.status, 400);

    const patchNomeSocial = await apiRequest<{
      paciente: { nomeExibicao: string };
    }>('/api/pacientes/me', {
      method: 'PATCH',
      token: tokenIdoso,
      body: { nomeSocial: 'Seu Zé' },
    });
    assert.equal(patchNomeSocial.status, 200);
    assert.equal(patchNomeSocial.data.paciente.nomeExibicao, 'Seu Zé');

    // Bloqueio após 5 tentativas erradas no paciente comum (423 Locked na 6ª)
    for (let i = 0; i < 5; i += 1) {
      const falha = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          cpf: CPF_PACIENTE_COMUM,
          senha: 'SenhaErrada99',
          tipoUsuario: 'PACIENTE',
        },
      });
      assert.equal(falha.status, 401);
    }

    const bloqueado = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        cpf: CPF_PACIENTE_COMUM,
        senha: 'Paciente2026',
        tipoUsuario: 'PACIENTE',
      },
    });
    assert.equal(bloqueado.status, 423);

    // Limpa bloqueio no banco para prosseguir os próximos cenários com o paciente comum
    await prisma.paciente.update({
      where: { id: pacienteComumId },
      data: { tentativasMalsucedidas: 0, bloqueioTemporarioAte: null },
    });

    const loginComum = await apiRequest<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: {
        cpf: CPF_PACIENTE_COMUM,
        senha: 'Paciente2026',
        tipoUsuario: 'PACIENTE',
      },
    });
    assert.equal(loginComum.status, 200);
    tokenComum = loginComum.data.token;
  });

  it('Spec 02: deve criar serviço/agenda, garantir concorrência atômica na última vaga, bloquear duplicidade e liberar ao cancelar', async () => {
    const criarServico = await apiRequest<{ servico: { id: string } }>(
      '/api/servicos',
      {
        method: 'POST',
        token: tokenAdmin,
        body: {
          nome: 'Consulta Teste Integração',
          categoria: 'CONSULTA',
          especialidade: 'Cardiologia',
          modoAcesso: 'DIRETO',
        },
      }
    );
    assert.equal(criarServico.status, 201);
    servicoTesteId = criarServico.data.servico.id;
    idsParaLimpar.servicoIds.push(servicoTesteId);

    // Agenda publicada para hoje em Maceió com 2 horários (capacidade 1 por horário)
    const agora = new Date();
    const hojeMaceio = obterIntervaloDiaMaceio(agora).dataIso;
    const diaSemanaMaceio = new Date(`${hojeMaceio}T12:00:00.000Z`).getUTCDay();

    const criarAgenda = await apiRequest<{
      agenda: { id: string };
      vagasCriadas: number;
    }>('/api/agendas', {
      method: 'POST',
      token: tokenMedico,
      body: {
        unidadeId: unidadeTesteId,
        servicoId: servicoTesteId,
        profissionalId: medicoTesteId,
        dataInicio: hojeMaceio,
        dataFim: hojeMaceio,
        diasHorarios: [
          {
            diaSemana: diaSemanaMaceio,
            horarios: ['23:50', '23:55'],
          },
        ],
        capacidadePorHorario: 1,
        publicar: true,
      },
    });
    assert.equal(criarAgenda.status, 201);
    assert.equal(criarAgenda.data.vagasCriadas, 2);
    idsParaLimpar.agendaIds.push(criarAgenda.data.agenda.id);

    const disp = await apiRequest<{
      vagas: Array<{
        id: string;
        vagasDisponiveis: number;
        profissionalRegistro: string | null;
        categoria: string;
      }>;
    }>(
      `/api/agendas/disponiveis?unidadeId=${unidadeTesteId}&servicoId=${servicoTesteId}&especialidade=Cardiologia&buscaProfissional=Integracao&data=${hojeMaceio}&turno=NOITE`
    );
    assert.equal(disp.status, 200);
    assert.equal(disp.data.vagas.length, 2);
    assert.equal(disp.data.vagas[0].profissionalRegistro, 'CRM 99999/AL');
    assert.equal(disp.data.vagas[0].categoria, 'CONSULTA');
    vagaConcorrenciaId = disp.data.vagas[0].id;
    vagaSecundariaId = disp.data.vagas[1].id;
    idsParaLimpar.vagaIds.push(vagaConcorrenciaId, vagaSecundariaId);

    // Catálogo público de busca não deve expor CPF/e-mail
    const catalogo = await apiRequest<{
      especialidades: string[];
      profissionais: Array<Record<string, unknown>>;
    }>('/api/agendas/catalogo-busca');
    assert.equal(catalogo.status, 200);
    assert.ok(catalogo.data.especialidades.includes('Cardiologia'));
    const profCatalogo = catalogo.data.profissionais.find(
      (p) => p.id === medicoTesteId
    );
    assert.ok(profCatalogo);
    assert.equal('cpf' in profCatalogo, false);
    assert.equal('email' in profCatalogo, false);

    // Médico não pode criar agenda vinculada a outro profissionalId
    const agendaOutroProf = await apiRequest('/api/agendas', {
      method: 'POST',
      token: tokenMedico,
      body: {
        unidadeId: unidadeTesteId,
        servicoId: servicoTesteId,
        profissionalId: '00000000-0000-4000-8000-000000000000',
        dataInicio: hojeMaceio,
        dataFim: hojeMaceio,
        diasHorarios: [{ diaSemana: diaSemanaMaceio, horarios: ['23:40'] }],
        capacidadePorHorario: 1,
      },
    });
    assert.equal(agendaOutroProf.status, 403);

    // Concorrência simultânea na última vaga (capacidade = 1)
    const [resA, resB] = await Promise.all([
      apiRequest<{ agendamento?: { id: string; protocolo: string } }>(
        '/api/agendamentos',
        {
          method: 'POST',
          token: tokenIdoso,
          body: { vagaId: vagaConcorrenciaId },
        }
      ),
      apiRequest<{ agendamento?: { id: string; protocolo: string } }>(
        '/api/agendamentos',
        {
          method: 'POST',
          token: tokenComum,
          body: { vagaId: vagaConcorrenciaId },
        }
      ),
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    assert.deepEqual(statuses, [201, 409]);

    const vencedor = resA.status === 201 ? resA : resB;
    const tokenVencedor = resA.status === 201 ? tokenIdoso : tokenComum;
    const tokenPerdedor = resA.status === 201 ? tokenComum : tokenIdoso;
    const agendamentoVencedorId = vencedor.data.agendamento!.id;
    idsParaLimpar.agendamentoIds.push(agendamentoVencedorId);

    // Bloqueio de duplicidade futura no mesmo serviço
    const duplicado = await apiRequest('/api/agendamentos', {
      method: 'POST',
      token: tokenVencedor,
      body: { vagaId: vagaSecundariaId },
    });
    assert.equal(duplicado.status, 409);

    // Cancelamento libera imediatamente a vaga
    const cancelamento = await apiRequest<{ agendamento: { status: string } }>(
      `/api/agendamentos/${agendamentoVencedorId}/cancelar`,
      {
        method: 'PATCH',
        token: tokenVencedor,
        body: { motivoCancelamento: 'Teste de liberação imediata de vaga' },
      }
    );
    assert.equal(cancelamento.status, 200);
    assert.equal(cancelamento.data.agendamento.status, 'CANCELADO');

    // Agora ambos conseguem marcar (idoso na vaga 1 e comum na vaga 2)
    const marcaIdoso = await apiRequest<{
      agendamento: { id: string; protocolo: string };
    }>('/api/agendamentos', {
      method: 'POST',
      token: tokenIdoso,
      body: { vagaId: vagaConcorrenciaId },
    });
    assert.equal(marcaIdoso.status, 201);
    agendamentoIdosoId = marcaIdoso.data.agendamento.id;
    protocoloIdoso = marcaIdoso.data.agendamento.protocolo;
    idsParaLimpar.agendamentoIds.push(agendamentoIdosoId);

    const marcaComum = await apiRequest<{
      agendamento: { id: string; protocolo: string };
    }>('/api/agendamentos', {
      method: 'POST',
      token: tokenComum,
      body: { vagaId: vagaSecundariaId },
    });
    assert.equal(marcaComum.status, 201);
    agendamentoComumId = marcaComum.data.agendamento.id;
    protocoloComum = marcaComum.data.agendamento.protocolo;
    idsParaLimpar.agendamentoIds.push(agendamentoComumId);

    // Verifica que perdedor também teve marcação válida e meus agendamentos lista corretamente
    const meusComum = await apiRequest<{ agendamentos: Array<{ id: string }> }>(
      '/api/agendamentos/meus',
      { token: tokenComum }
    );
    assert.equal(meusComum.status, 200);
    assert.ok(meusComum.data.agendamentos.some((a) => a.id === agendamentoComumId));
    assert.ok(tokenPerdedor.length > 0);
  });

  it('Spec 03: deve realizar check-in idempotente, chamar por prioridade, consultar painel LGPD e concluir/registrar ausências', async () => {
    // Check-in do paciente comum primeiro (chegou antes, ordem 1)
    const checkinComum = await apiRequest<{
      jaRegistrado: boolean;
      entrada: { id: string; grupoAtendimento: string; senhaAtendimento: string };
    }>('/api/fila/check-in', {
      method: 'POST',
      token: tokenAdmin,
      body: {
        unidadeId: unidadeTesteId,
        protocolo: protocoloComum,
      },
    });
    assert.equal(checkinComum.status, 201);
    assert.equal(checkinComum.data.jaRegistrado, false);
    assert.equal(checkinComum.data.entrada.grupoAtendimento, 'COMUM');
    assert.equal(checkinComum.data.entrada.senhaAtendimento, 'C-001');
    entradaComumId = checkinComum.data.entrada.id;
    idsParaLimpar.entradaFilaIds.push(entradaComumId);

    // Check-in do paciente idoso depois (chegou depois, mas é PRIORITARIO)
    const checkinIdoso1 = await apiRequest<{
      jaRegistrado: boolean;
      entrada: {
        id: string;
        grupoAtendimento: string;
        criterioPrioridade: string;
        senhaAtendimento: string;
      };
    }>('/api/fila/check-in', {
      method: 'POST',
      token: tokenAdmin,
      body: {
        unidadeId: unidadeTesteId,
        protocolo: protocoloIdoso,
      },
    });
    assert.equal(checkinIdoso1.status, 201);
    assert.equal(checkinIdoso1.data.entrada.grupoAtendimento, 'PRIORITARIO');
    assert.equal(
      checkinIdoso1.data.entrada.criterioPrioridade,
      'IDOSO_60_MAIS'
    );
    assert.equal(checkinIdoso1.data.entrada.senhaAtendimento, 'P-001');
    entradaIdosoId = checkinIdoso1.data.entrada.id;
    idsParaLimpar.entradaFilaIds.push(entradaIdosoId);

    // Idempotência do check-in
    const checkinIdoso2 = await apiRequest<{
      jaRegistrado: boolean;
      entrada: { id: string };
    }>('/api/fila/check-in', {
      method: 'POST',
      token: tokenAdmin,
      body: {
        unidadeId: unidadeTesteId,
        protocolo: protocoloIdoso,
      },
    });
    assert.equal(checkinIdoso2.status, 200);
    assert.equal(checkinIdoso2.data.jaRegistrado, true);
    assert.equal(checkinIdoso2.data.entrada.id, entradaIdosoId);

    // Posição do paciente comum: deve estar em 2º lugar (atrás do prioritário)
    const posComum = await apiRequest<{
      entradas: Array<{
        entradaId: string;
        posicaoNaFila: number;
        pessoasAFrente: number;
      }>;
    }>('/api/fila/minha-posicao', { token: tokenComum });
    assert.equal(posComum.status, 200);
    assert.equal(posComum.data.entradas[0].posicaoNaFila, 2);
    assert.equal(posComum.data.entradas[0].pessoasAFrente, 1);

    // Chamar próximo (deve selecionar P-001 via RodizioPrioritarioComumStrategy + FOR UPDATE SKIP LOCKED)
    const chamada1 = await apiRequest<{
      entrada: { id: string; senhaAtendimento: string; situacao: string };
      chamada: { tentativa: number; estado: string; guicheSala: string };
    }>('/api/fila/chamar-proximo', {
      method: 'POST',
      token: tokenMedico,
      body: {
        unidadeId: unidadeTesteId,
        guicheSala: 'Consultório 01',
      },
    });
    assert.equal(chamada1.status, 200);
    assert.equal(chamada1.data.entrada.id, entradaIdosoId);
    assert.equal(chamada1.data.entrada.senhaAtendimento, 'P-001');
    assert.equal(chamada1.data.entrada.situacao, 'CHAMADO');

    // Painel público LGPD sem JWT (zero dados pessoais)
    const painel = await apiRequest<{
      chamadas: Array<Record<string, unknown>>;
    }>(`/api/publico/painel/${unidadeTesteId}`);
    assert.equal(painel.status, 200);
    assert.equal(painel.data.chamadas.length, 1);
    const registroPainel = painel.data.chamadas[0];
    assert.equal(registroPainel.senhaAtendimento, 'P-001');
    assert.equal(registroPainel.guicheSala, 'Consultório 01');
    assert.equal('nomeCompleto' in registroPainel, false);
    assert.equal('nomeSocial' in registroPainel, false);
    assert.equal('cpf' in registroPainel, false);
    assert.equal('cns' in registroPainel, false);
    assert.equal('pacienteId' in registroPainel, false);
    assert.equal('criterioPrioridade' in registroPainel, false);

    // Rechamar -> Iniciar -> Concluir
    const rechamada = await apiRequest<{ chamada: { tentativa: number } }>(
      `/api/fila/chamadas/${entradaIdosoId}/rechamar`,
      { method: 'POST', token: tokenMedico }
    );
    assert.equal(rechamada.status, 200);
    assert.equal(rechamada.data.chamada.tentativa, 2);

    const iniciar = await apiRequest<{
      entrada: { situacao: string };
      chamada: { estado: string };
    }>(`/api/fila/chamadas/${entradaIdosoId}/iniciar`, {
      method: 'PATCH',
      token: tokenMedico,
    });
    assert.equal(iniciar.status, 200);
    assert.equal(iniciar.data.entrada.situacao, 'EM_ATENDIMENTO');

    const concluir = await apiRequest<{
      entrada: { situacao: string };
      agendamento: { status: string };
    }>(`/api/fila/chamadas/${entradaIdosoId}/concluir`, {
      method: 'PATCH',
      token: tokenMedico,
    });
    assert.equal(concluir.status, 200);
    assert.equal(concluir.data.entrada.situacao, 'CONCLUIDO');
    assert.equal(concluir.data.agendamento.status, 'REALIZADO');

    // Chamar C-001, marcar ausente (recoloca 1x), chamar novamente e encerrar ausência definitiva
    const chamadaComum1 = await apiRequest<{
      entrada: { id: string; situacao: string };
    }>('/api/fila/chamar-proximo', {
      method: 'POST',
      token: tokenMedico,
      body: {
        unidadeId: unidadeTesteId,
        guicheSala: 'Consultório 01',
      },
    });
    assert.equal(chamadaComum1.status, 200);
    assert.equal(chamadaComum1.data.entrada.id, entradaComumId);

    const ausente1 = await apiRequest<{
      entrada: { situacao: string; recolocacoes: number };
    }>(`/api/fila/chamadas/${entradaComumId}/ausente`, {
      method: 'PATCH',
      token: tokenMedico,
      body: { motivoAusencia: 'Não compareceu à 1ª chamada' },
    });
    assert.equal(ausente1.status, 200);
    assert.equal(ausente1.data.entrada.situacao, 'AGUARDANDO');
    assert.equal(ausente1.data.entrada.recolocacoes, 1);

    const chamadaComum2 = await apiRequest<{
      entrada: { id: string };
      chamada: { tentativa: number };
    }>('/api/fila/chamar-proximo', {
      method: 'POST',
      token: tokenMedico,
      body: {
        unidadeId: unidadeTesteId,
        guicheSala: 'Consultório 01',
      },
    });
    assert.equal(chamadaComum2.status, 200);
    assert.equal(chamadaComum2.data.entrada.id, entradaComumId);
    assert.equal(chamadaComum2.data.chamada.tentativa, 2);

    const ausente2 = await apiRequest<{
      entrada: { situacao: string };
    }>(`/api/fila/chamadas/${entradaComumId}/ausente`, {
      method: 'PATCH',
      token: tokenMedico,
      body: { motivoAusencia: 'Ausência definitiva após 2ª chamada' },
    });
    assert.equal(ausente2.status, 200);
    assert.equal(ausente2.data.entrada.situacao, 'NAO_ATENDIDO');

    // Fila vazia deve retornar 200 com chamada: null
    const filaVazia = await apiRequest<{ chamada: null; mensagem: string }>(
      '/api/fila/chamar-proximo',
      {
        method: 'POST',
        token: tokenMedico,
        body: {
          unidadeId: unidadeTesteId,
          guicheSala: 'Consultório 01',
        },
      }
    );
    assert.equal(filaVazia.status, 200);
    assert.equal(filaVazia.data.chamada, null);

    // Conferir trilha de auditoria gravada pela Trigger PL/pgSQL no PostgreSQL
    const eventos = await prisma.historicoEvento.findMany({
      where: { entidadeId: { in: [agendamentoIdosoId, entradaIdosoId] } },
    });
    assert.ok(eventos.length >= 4);

    // Consultar grade clínica do médico (slots com agendamentos realizados/ativos + livres)
    const hojeIsoGrade = obterIntervaloDiaMaceio(new Date()).dataIso;
    const grade = await apiRequest<{
      slots: Array<{
        id: string;
        agendamentos: Array<{
          protocolo: string;
          status: string;
          situacaoFila: string | null;
        }>;
      }>;
      resumoDias: Array<{
        data: string;
        totalHorarios: number;
        totalAgendados: number;
      }>;
    }>(
      `/api/agendas/grade?unidadeId=${unidadeTesteId}&dataInicio=${hojeIsoGrade}&dataFim=${hojeIsoGrade}`,
      { token: tokenMedico }
    );
    assert.equal(grade.status, 200);
    assert.ok(grade.data.slots.length >= 2);
    assert.equal(grade.data.resumoDias[0].data, hojeIsoGrade);
    assert.ok(grade.data.resumoDias[0].totalAgendados >= 1);
  });
});
