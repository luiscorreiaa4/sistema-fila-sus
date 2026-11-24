import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  Agenda,
  Agendamento,
  ChamadaFila,
  Cns,
  ConflictError,
  Cpf,
  EntradaFila,
  OrdemChegadaStrategy,
  Paciente,
  Profissional,
  RodizioPrioritarioComumStrategy,
  Senha,
  Servico,
  UnauthorizedError,
  UnidadeSaude,
  ValidationError,
  VagaAgenda,
} from '../index';
import {
  extrairDataIsoMaceio,
  obterTurnoMaceio,
} from '../../application/utils/dataMaceio';

const ENDERECO_VALIDO = {
  cep: '57050-000',
  logradouro: 'Rua Cônego Machado',
  numero: '100',
  bairro: 'Farol',
  municipio: 'Maceió',
  estado: 'AL',
};

function criarPacienteFixture(overrides: Partial<{
  id: string;
  cpf: string;
  cns: string;
  nomeCompleto: string;
  nomeSocial: string | null;
  dataNascimento: Date;
  email: string | null;
  celular: string | null;
  possuiDeficiencia: 'SIM' | 'NAO' | 'PREFIRO_NAO_INFORMAR';
  status: 'ATIVO' | 'INATIVO';
  tentativasMalsucedidas: number;
  bloqueioTemporarioAte: Date | null;
}> = {}): Paciente {
  const cpfValor = overrides.cpf ?? '52998224725';
  const dataNascimento =
    overrides.dataNascimento ?? new Date('1990-05-15T00:00:00.000Z');

  return new Paciente({
    id: overrides.id ?? 'pac-1',
    cpf: Cpf.criar(cpfValor),
    cns: Cns.criar(overrides.cns ?? '123456789010000'),
    nomeCompleto: overrides.nomeCompleto ?? 'Maria da Silva',
    nomeSocial: overrides.nomeSocial ?? null,
    dataNascimento,
    email: overrides.email === undefined ? 'maria@sus.gov.br' : overrides.email,
    celular: overrides.celular === undefined ? '82999990000' : overrides.celular,
    possuiDeficiencia: overrides.possuiDeficiencia ?? 'NAO',
    endereco: ENDERECO_VALIDO,
    senhaHash: Senha.criarDeTextoPlano('SusSeguro2026', cpfValor, dataNascimento),
    cienciaPrivacidadeEm: new Date('2026-01-10T10:00:00.000Z'),
    status: overrides.status ?? 'ATIVO',
    tentativasMalsucedidas: overrides.tentativasMalsucedidas ?? 0,
    bloqueioTemporarioAte: overrides.bloqueioTemporarioAte ?? null,
  });
}

function criarEntradaFilaFixture(
  id: string,
  grupo: 'PRIORITARIO' | 'COMUM',
  ordemEntrada: number,
  situacao:
    | 'AGUARDANDO'
    | 'CHAMADO'
    | 'EM_ATENDIMENTO'
    | 'CONCLUIDO'
    | 'NAO_ATENDIDO'
    | 'CANCELADO' = 'AGUARDANDO'
): EntradaFila {
  const prefixo = grupo === 'PRIORITARIO' ? 'P' : 'C';
  return new EntradaFila({
    id,
    agendamentoId: `ag-${id}`,
    pacienteId: `pac-${id}`,
    unidadeId: 'uni-1',
    grupoAtendimento: grupo,
    criterioPrioridade: grupo === 'PRIORITARIO' ? 'IDOSO_60_MAIS' : 'PADRAO',
    senhaAtendimento: `${prefixo}-${String(ordemEntrada).padStart(3, '0')}`,
    ordemEntrada,
    situacao,
  });
}

describe('Value Objects: Cpf, Cns e Senha', () => {
  describe('Cpf', () => {
    it('deve criar CPF válido removendo máscara e formatando corretamente', () => {
      const cpf = Cpf.criar('529.982.247-25');
      assert.equal(cpf.getValor(), '52998224725');
      assert.equal(cpf.formatado(), '529.982.247-25');
      assert.equal(cpf.equals(Cpf.criar('52998224725')), true);
    });

    it('deve recusar todas as sequências repetidas de 00000000000 a 99999999999', () => {
      for (let d = 0; d <= 9; d += 1) {
        const repetido = String(d).repeat(11);
        assert.throws(() => Cpf.criar(repetido), ValidationError);
      }
    });

    it('deve recusar CPF com dígito verificador inválido ou tamanho incorreto', () => {
      assert.throws(() => Cpf.criar('52998224720'), ValidationError);
      assert.throws(() => Cpf.criar('1234567890'), ValidationError);
      assert.throws(() => Cpf.criar('123456789012'), ValidationError);
      assert.throws(() => Cpf.criar('abc'), ValidationError);
    });
  });

  describe('Cns', () => {
    it('deve aceitar CNS definitivo válido (início 1/2, sufixo 000 e 001)', () => {
      const cns1 = Cns.criar('123.4567.8901.0000');
      assert.equal(cns1.getValor(), '123456789010000');
      assert.equal(cns1.ehDefinitivo(), true);
      assert.equal(cns1.ehProvisorio(), false);

      const cns2Sufixo000 = Cns.criar('200000000010009');
      assert.equal(cns2Sufixo000.ehDefinitivo(), true);

      const cns2Sufixo001 = Cns.criar('200000000030018');
      assert.equal(cns2Sufixo001.ehDefinitivo(), true);
    });

    it('deve aceitar CNS provisório válido (início 7, 8 ou 9)', () => {
      const cns7 = Cns.criar('700000000000005');
      const cns8 = Cns.criar('800000000000001');
      const cns9 = Cns.criar('900000000000008');

      assert.equal(cns7.ehProvisorio(), true);
      assert.equal(cns8.ehProvisorio(), true);
      assert.equal(cns9.ehProvisorio(), true);
    });

    it('deve recusar CNS com início inválido, dígito verificador incorreto ou dígitos repetidos', () => {
      assert.throws(() => Cns.criar('300000000000001'), ValidationError);
      assert.throws(() => Cns.criar('123456789010001'), ValidationError);
      assert.throws(() => Cns.criar('700000000000001'), ValidationError);
      assert.throws(() => Cns.criar('111111111111111'), ValidationError);
      assert.throws(() => Cns.criar('12345'), ValidationError);
    });
  });

  describe('Senha', () => {
    const cpf = '52998224725';
    const nascimento = new Date('1990-05-15T00:00:00.000Z');

    it('deve gerar hash válido para senha forte e validar comparação', () => {
      const senha = Senha.criarDeTextoPlano('Atendimento2026', cpf, nascimento);
      assert.ok(senha.getHash().startsWith('scrypt$'));
      assert.equal(senha.comparar('Atendimento2026'), true);
      assert.equal(senha.comparar('SenhaErrada99'), false);

      const reconstituida = Senha.deHash(senha.getHash());
      assert.equal(reconstituida.comparar('Atendimento2026'), true);
    });

    it('deve aceitar funções injetáveis de hash e comparação', () => {
      const senha = Senha.criarDeTextoPlano(
        'SusAlagoas2026',
        cpf,
        nascimento,
        (plana) => `hash:${plana}`
      );
      assert.equal(senha.getHash(), 'hash:SusAlagoas2026');
      assert.equal(
        senha.comparar('SusAlagoas2026', (p, h) => h === `hash:${p}`),
        true
      );
    });

    it('deve recusar senha menor que 8 ou maior que 64 caracteres', () => {
      assert.throws(
        () => Senha.criarDeTextoPlano('Abc1234', cpf, nascimento),
        ValidationError
      );
      assert.throws(
        () => Senha.criarDeTextoPlano(`A1${'a'.repeat(63)}`, cpf, nascimento),
        ValidationError
      );
    });

    it('deve recusar senha sem letras ou sem números', () => {
      assert.throws(
        () => Senha.criarDeTextoPlano('apenasletras', cpf, nascimento),
        ValidationError
      );
      assert.throws(
        () => Senha.criarDeTextoPlano('12345678', cpf, nascimento),
        ValidationError
      );
    });

    it('deve recusar senha igual ao CPF ou à data de nascimento', () => {
      assert.throws(
        () => Senha.criarDeTextoPlano('52998224725', cpf, nascimento),
        ValidationError
      );
      assert.throws(
        () => Senha.criarDeTextoPlano('529.982.247-25', cpf, nascimento),
        ValidationError
      );
      assert.throws(
        () => Senha.criarDeTextoPlano('cpf52998224725', cpf, nascimento),
        ValidationError
      );
      assert.throws(
        () => Senha.criarDeTextoPlano('15051990', cpf, nascimento),
        ValidationError
      );
      assert.throws(
        () => Senha.criarDeTextoPlano('19900515', cpf, nascimento),
        ValidationError
      );
      assert.throws(
        () => Senha.criarDeTextoPlano('s15051990', cpf, nascimento),
        ValidationError
      );
    });
  });
});

describe('Hierarquia Usuario, Paciente e Profissional', () => {
  it('deve aplicar bloqueio temporário de 15 minutos após 5 falhas consecutivas e limpar após sucesso', () => {
    const paciente = criarPacienteFixture();
    const t0 = new Date('2026-11-17T12:00:00.000Z');

    for (let i = 1; i <= 4; i += 1) {
      paciente.registrarFalhaAutenticacao(t0);
      assert.equal(paciente.getTentativasMalsucedidas(), i);
      assert.equal(paciente.estaBloqueado(t0), false);
    }

    paciente.registrarFalhaAutenticacao(t0);
    assert.equal(paciente.getTentativasMalsucedidas(), 5);
    assert.equal(paciente.estaBloqueado(t0), true);

    const duranteBloqueio = new Date(t0.getTime() + 14 * 60 * 1000);
    assert.equal(paciente.estaBloqueado(duranteBloqueio), true);
    assert.throws(
      () => paciente.registrarSucessoAutenticacao(duranteBloqueio),
      (erro: unknown) =>
        erro instanceof UnauthorizedError && erro.statusCode === 423
    );

    const aposBloqueio = new Date(t0.getTime() + 15 * 60 * 1000 + 1);
    assert.equal(paciente.estaBloqueado(aposBloqueio), false);

    paciente.registrarSucessoAutenticacao(aposBloqueio);
    assert.equal(paciente.getTentativasMalsucedidas(), 0);
    assert.equal(paciente.getBloqueioTemporarioAte(), null);
    assert.equal(
      paciente.getUltimoAcesso()?.getTime(),
      aposBloqueio.getTime()
    );
  });

  it('deve priorizar nome social em obterNomeExibicao e calcular prioridade legal do Paciente', () => {
    const referencia = new Date('2026-11-17T12:00:00.000Z');

    const padrao = criarPacienteFixture({
      nomeCompleto: 'João Pedro Souza',
      nomeSocial: 'Joana Souza',
      dataNascimento: new Date('1990-01-01T00:00:00.000Z'),
      possuiDeficiencia: 'NAO',
    });
    assert.equal(padrao.obterNomeExibicao(), 'Joana Souza');
    assert.equal(padrao.calcularIdade(referencia), 36);
    assert.equal(padrao.ehPrioritarioLegal(referencia), false);
    assert.equal(padrao.obterCriterioPrioridade(referencia), 'PADRAO');
    assert.equal(padrao.obterPerfilAcesso(), 'PACIENTE');

    const idoso = criarPacienteFixture({
      dataNascimento: new Date('1966-11-17T00:00:00.000Z'),
      possuiDeficiencia: 'PREFIRO_NAO_INFORMAR',
    });
    assert.equal(idoso.calcularIdade(referencia), 60);
    assert.equal(idoso.ehPrioritarioLegal(referencia), true);
    assert.equal(idoso.obterCriterioPrioridade(referencia), 'IDOSO_60_MAIS');

    const quaseIdoso = criarPacienteFixture({
      dataNascimento: new Date('1966-11-18T00:00:00.000Z'),
      possuiDeficiencia: 'NAO',
    });
    assert.equal(quaseIdoso.calcularIdade(referencia), 59);
    assert.equal(quaseIdoso.ehPrioritarioLegal(referencia), false);

    const pcd = criarPacienteFixture({
      dataNascimento: new Date('1995-03-20T00:00:00.000Z'),
      possuiDeficiencia: 'SIM',
    });
    assert.equal(pcd.ehPrioritarioLegal(referencia), true);
    assert.equal(pcd.obterCriterioPrioridade(referencia), 'PCD');

    const ambos = criarPacienteFixture({
      dataNascimento: new Date('1950-07-01T00:00:00.000Z'),
      possuiDeficiencia: 'SIM',
    });
    assert.equal(ambos.ehPrioritarioLegal(referencia), true);
    assert.equal(ambos.obterCriterioPrioridade(referencia), 'AMBOS');
  });

  it('deve validar invariantes de contato no Paciente e registro profissional em Profissional', () => {
    assert.throws(
      () => criarPacienteFixture({ email: null, celular: null }),
      ValidationError
    );

    assert.throws(
      () =>
        new Profissional({
          id: 'prof-1',
          cpf: Cpf.criar('12345678909'),
          nomeCompleto: 'Dr. Carlos Lima',
          email: 'carlos@sus.gov.br',
          senhaHash: Senha.criarDeTextoPlano('MedicoSus2026'),
          nivelAcesso: 'PROFISSIONAL_SAUDE',
          unidadesVinculadas: ['uni-1'],
          especialidades: [],
        }),
      ValidationError
    );

    const medico = new Profissional({
      id: 'prof-2',
      cpf: Cpf.criar('12345678909'),
      nomeCompleto: 'Dra. Ana Paula',
      email: 'ana@sus.gov.br',
      senhaHash: Senha.criarDeTextoPlano('MedicaSus2026'),
      conselhoProfissional: 'CRM',
      numeroRegistro: '12345',
      ufRegistro: 'AL',
      nivelAcesso: 'PROFISSIONAL_SAUDE',
      unidadesVinculadas: ['uni-1'],
      especialidades: ['Clínica Médica'],
    });

    assert.equal(medico.obterPerfilAcesso(), 'PROFISSIONAL_SAUDE');
    assert.equal(medico.obterRegistroConselhoFormatado(), 'CRM 12345/AL');
    assert.equal(medico.estaVinculadoAUnidade('uni-1'), true);
    assert.equal(medico.estaVinculadoAUnidade('uni-2'), false);
    assert.equal(medico.podeGerenciarAgenda(), true);
    assert.equal(medico.podeChamarFila(), true);
    assert.throws(
      () => medico.inativar('Motivo válido aqui', 'prof-2'),
      ConflictError
    );
  });
});

describe('Entidades Operacionais e Transições de Estado', () => {
  it('deve validar UnidadeSaude, Servico e materialização de vagas em Agenda', () => {
    const unidade = new UnidadeSaude({
      id: 'uni-1',
      cnes: '2000123',
      cnpj: '11.222.333/0001-81',
      nome: 'UBS Centro Maceió',
      endereco: ENDERECO_VALIDO,
    });
    assert.equal(unidade.aceitaAgendas(), true);
    unidade.inativar('Reforma estrutural programada');
    assert.equal(unidade.aceitaAgendas(), false);

    const servico = new Servico({
      id: 'srv-1',
      nome: 'Consulta Clínica Geral',
      categoria: 'CONSULTA',
      especialidade: 'Clínica Médica',
    });
    assert.equal(servico.estaAtivo(), true);
    servico.inativar();
    assert.equal(servico.estaAtivo(), false);

    const agenda = new Agenda({
      id: 'agd-1',
      unidadeId: 'uni-1',
      servicoId: 'srv-1',
      profissionalId: 'prof-2',
      dataInicio: new Date('2026-11-16T00:00:00.000Z'), // Segunda
      dataFim: new Date('2026-11-20T00:00:00.000Z'), // Sexta
      diasHorarios: [
        { diaSemana: 1, horarios: ['08:00', '09:00'] },
        { diaSemana: 3, horarios: ['14:00'] },
      ],
      capacidadePorHorario: 2,
    });

    let seq = 0;
    const vagas = agenda.publicar('-03:00', () => `vaga-${++seq}`);
    assert.equal(agenda.estaPublicada(), true);
    assert.equal(vagas.length, 3);
    assert.equal(vagas[0].vagasDisponiveis(), 2);

    vagas[0].reservar();
    vagas[0].reservar();
    assert.equal(vagas[0].temDisponibilidade(), false);
    assert.throws(() => vagas[0].reservar(), ConflictError);
    vagas[0].liberar();
    assert.equal(vagas[0].vagasDisponiveis(), 1);
  });

  it('deve proteger transições válidas em Agendamento', () => {
    const agendamento = new Agendamento({
      id: 'ag-1',
      pacienteId: 'pac-1',
      unidadeId: 'uni-1',
      servicoId: 'srv-1',
      vagaId: 'vaga-1',
      dataHoraAtendimento: new Date('2026-11-20T11:00:00.000Z'),
      protocolo: Agendamento.gerarProtocolo(
        new Date('2026-11-17T12:00:00.000Z'),
        'ABC123'
      ),
      senhaAtendimento: 'C-001',
    });

    assert.equal(agendamento.getProtocolo(), 'SUS-20261117-ABC123');
    assert.throws(() => agendamento.cancelar('abc'), ValidationError);

    agendamento.cancelar('Paciente solicitou remarcação');
    assert.equal(agendamento.getStatus(), 'CANCELADO');
    assert.equal(agendamento.getVersao(), 2);

    assert.throws(() => agendamento.marcarRealizado(), ConflictError);
    assert.throws(
      () => agendamento.cancelar('Tentativa duplicada'),
      ConflictError
    );
  });

  it('deve proteger o grafo de transições em EntradaFila e ChamadaFila', () => {
    const entrada = criarEntradaFilaFixture('ent-1', 'PRIORITARIO', 1);

    assert.throws(() => entrada.iniciarAtendimento(), ConflictError);
    assert.throws(() => entrada.concluir(), ConflictError);

    entrada.chamar();
    assert.equal(entrada.getSituacao(), 'CHAMADO');

    // Primeira ausência permite recolocação única para o fim da fila
    entrada.registrarAusencia(true, 10);
    assert.equal(entrada.getSituacao(), 'AGUARDANDO');
    assert.equal(entrada.getRecolocacoes(), 1);
    assert.equal(entrada.getOrdemEntrada(), 10);

    // Segunda chamada e segunda ausência encerra definitivamente como NAO_ATENDIDO
    entrada.chamar();
    entrada.registrarAusencia(true, 15);
    assert.equal(entrada.getSituacao(), 'NAO_ATENDIDO');
    assert.throws(() => entrada.chamar(), ConflictError);

    // Fluxo completo até conclusão
    const entrada2 = criarEntradaFilaFixture('ent-2', 'COMUM', 2);
    const chamada = new ChamadaFila({
      id: 'ch-1',
      entradaFilaId: entrada2.getId(),
      profissionalChamadorId: 'prof-2',
      guicheSala: 'Consultório 02',
      dataHoraChamada: new Date('2026-11-17T08:00:00.000Z'),
    });

    entrada2.chamar();
    chamada.rechamar(new Date('2026-11-17T08:02:00.000Z'));
    assert.equal(chamada.getTentativa(), 2);

    entrada2.iniciarAtendimento();
    chamada.iniciar(new Date('2026-11-17T08:03:00.000Z'));
    assert.equal(entrada2.getSituacao(), 'EM_ATENDIMENTO');

    entrada2.concluir();
    chamada.concluir(new Date('2026-11-17T08:18:00.000Z'));
    assert.equal(entrada2.getSituacao(), 'CONCLUIDO');
    assert.equal(chamada.getEstado(), 'CONCLUIDO');
    assert.equal(chamada.getDuracaoMinutos(), 15);
    assert.throws(() => chamada.rechamar(), ConflictError);
  });
});

describe('Estratégias Polimórficas de Chamada na Fila', () => {
  it('deve aplicar rodízio 5 prioritários para 1 comum respeitando ordemEntrada', () => {
    const estrategia = new RodizioPrioritarioComumStrategy(5);
    const aguardando: EntradaFila[] = [
      criarEntradaFilaFixture('c1', 'COMUM', 1),
      criarEntradaFilaFixture('p1', 'PRIORITARIO', 2),
      criarEntradaFilaFixture('p2', 'PRIORITARIO', 3),
      criarEntradaFilaFixture('p3', 'PRIORITARIO', 4),
      criarEntradaFilaFixture('p4', 'PRIORITARIO', 5),
      criarEntradaFilaFixture('p5', 'PRIORITARIO', 6),
      criarEntradaFilaFixture('p6', 'PRIORITARIO', 7),
      criarEntradaFilaFixture('c2', 'COMUM', 8),
    ];

    for (let seguidos = 0; seguidos < 5; seguidos += 1) {
      const proximo = estrategia.selecionarProximaEntrada(aguardando, seguidos);
      assert.equal(proximo?.getId(), 'p1');
    }

    const vezDoComum = estrategia.selecionarProximaEntrada(aguardando, 5);
    assert.equal(vezDoComum?.getId(), 'c1');

    const simulacao = estrategia.ordenarFilaSimulada(aguardando, 0);
    assert.deepEqual(
      simulacao.map((e) => e.getId()),
      ['p1', 'p2', 'p3', 'p4', 'p5', 'c1', 'p6', 'c2']
    );
  });

  it('deve evitar ociosidade quando só houver comuns ou só houver prioritários', () => {
    const estrategia = new RodizioPrioritarioComumStrategy(5);

    const apenasComuns = [
      criarEntradaFilaFixture('c2', 'COMUM', 4),
      criarEntradaFilaFixture('c1', 'COMUM', 2),
    ];
    assert.equal(
      estrategia.selecionarProximaEntrada(apenasComuns, 0)?.getId(),
      'c1'
    );

    const apenasPrioritarios = [
      criarEntradaFilaFixture('p2', 'PRIORITARIO', 5),
      criarEntradaFilaFixture('p1', 'PRIORITARIO', 3),
    ];
    assert.equal(
      estrategia.selecionarProximaEntrada(apenasPrioritarios, 5)?.getId(),
      'p1'
    );

    assert.equal(estrategia.selecionarProximaEntrada([], 0), null);
  });

  it('deve suportar OrdemChegadaStrategy de forma polimórfica', () => {
    const estrategia = new OrdemChegadaStrategy();
    const fila = [
      criarEntradaFilaFixture('p1', 'PRIORITARIO', 3),
      criarEntradaFilaFixture('c1', 'COMUM', 1),
      criarEntradaFilaFixture('p2', 'PRIORITARIO', 2),
    ];

    assert.equal(estrategia.selecionarProximaEntrada(fila, 0)?.getId(), 'c1');
    assert.equal(estrategia.selecionarProximaEntrada([], 0), null);
  });

  it('deve classificar turnos e datas corretamente no fuso America/Maceio (-03:00)', () => {
    assert.equal(obterTurnoMaceio(new Date('2026-11-24T11:30:00-03:00')), 'MANHA');
    assert.equal(obterTurnoMaceio(new Date('2026-11-24T14:00:00-03:00')), 'TARDE');
    assert.equal(obterTurnoMaceio(new Date('2026-11-24T19:00:00-03:00')), 'NOITE');
    assert.equal(extrairDataIsoMaceio(new Date('2026-11-24T23:30:00-03:00')), '2026-11-24');
  });
});
