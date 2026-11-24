import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Agenda } from '../src/domain/entities/Agenda';
import { Agendamento } from '../src/domain/entities/Agendamento';
import { Paciente } from '../src/domain/entities/Paciente';
import { Profissional } from '../src/domain/entities/Profissional';
import { Servico } from '../src/domain/entities/Servico';
import { UnidadeSaude } from '../src/domain/entities/UnidadeSaude';
import { Cns } from '../src/domain/value-objects/Cns';
import { Cpf } from '../src/domain/value-objects/Cpf';
import { Senha } from '../src/domain/value-objects/Senha';
import {
  converterDataIsoParaDateUtc,
  obterIntervaloDiaMaceio,
} from '../src/application/utils/dataMaceio';
import { prisma } from '../src/infrastructure/database/prisma/client';
import { PrismaAgendamentoRepository } from '../src/infrastructure/database/prisma/PrismaAgendamentoRepository';
import { PrismaAgendaRepository } from '../src/infrastructure/database/prisma/PrismaAgendaRepository';
import { PrismaPacienteRepository } from '../src/infrastructure/database/prisma/PrismaPacienteRepository';
import { PrismaProfissionalRepository } from '../src/infrastructure/database/prisma/PrismaProfissionalRepository';
import { PrismaServicoRepository } from '../src/infrastructure/database/prisma/PrismaServicoRepository';
import { PrismaUnidadeSaudeRepository } from '../src/infrastructure/database/prisma/PrismaUnidadeSaudeRepository';
import { BcryptHashService } from '../src/infrastructure/security/BcryptHashService';

async function seed(): Promise<void> {
  const hashService = new BcryptHashService(10);
  const unidadeRepo = new PrismaUnidadeSaudeRepository(prisma);
  const profissionalRepo = new PrismaProfissionalRepository(prisma);
  const servicoRepo = new PrismaServicoRepository(prisma);
  const agendaRepo = new PrismaAgendaRepository(prisma);
  const agendamentoRepo = new PrismaAgendamentoRepository(prisma);
  const pacienteRepo = new PrismaPacienteRepository(prisma);

  console.log('Iniciando seed idempotente do Sistema de Filas SUS...');

  // 1. Unidade de Saúde ativa
  let unidade = await unidadeRepo.buscarPorCnes('2001001');
  if (!unidade) {
    unidade = await unidadeRepo.salvar(
      new UnidadeSaude({
        id: randomUUID(),
        cnes: '2001001',
        cnpj: '11222333000181',
        nome: 'UBS Centro — Maceió',
        telefone: '(82) 3312-5000',
        email: 'ubscentro@saude.maceio.al.gov.br',
        endereco: {
          cep: '57020050',
          logradouro: 'Rua Barão de Alagoas',
          numero: '250',
          bairro: 'Centro',
          municipio: 'Maceió',
          estado: 'AL',
        },
        fusoHorario: 'America/Maceio',
        status: 'ATIVA',
      })
    );
    console.log(`✔ Unidade criada: ${unidade.getNome()} (${unidade.getId()})`);
  } else {
    console.log(`• Unidade já existente: ${unidade.getNome()} (${unidade.getId()})`);
  }

  // 2. Administrador
  let admin = await profissionalRepo.buscarPorCpf('11144477735');
  if (!admin) {
    admin = await profissionalRepo.salvar(
      new Profissional({
        id: randomUUID(),
        cpf: Cpf.criar('11144477735'),
        nomeCompleto: 'Carlos Eduardo Almeida (Admin)',
        email: 'admin@saude.maceio.gov.br',
        celular: '82999001100',
        nivelAcesso: 'ADMINISTRADOR',
        situacaoAcesso: 'ATIVO',
        status: 'ATIVO',
        unidadesVinculadas: [unidade.getId()],
        especialidades: ['Gestão em Saúde'],
        senhaHash: Senha.criarDeTextoPlano(
          'AdminSus2026',
          '11144477735',
          undefined,
          (s) => hashService.gerarHash(s)
        ),
      })
    );
    console.log(`✔ Administrador criado: ${admin.getEmail()} (CPF: 11144477735)`);
  } else {
    console.log(`• Administrador já existente: ${admin.getEmail()}`);
  }

  // 3. Atendente
  let atendente = await profissionalRepo.buscarPorCpf('22255588846');
  if (!atendente) {
    atendente = await profissionalRepo.salvar(
      new Profissional({
        id: randomUUID(),
        cpf: Cpf.criar('22255588846'),
        nomeCompleto: 'Fernanda Oliveira Santos (Recepção)',
        email: 'atendente@saude.maceio.gov.br',
        celular: '82999002200',
        nivelAcesso: 'ATENDENTE',
        situacaoAcesso: 'ATIVO',
        status: 'ATIVO',
        unidadesVinculadas: [unidade.getId()],
        especialidades: [],
        senhaHash: Senha.criarDeTextoPlano(
          'AtendeSus2026',
          '22255588846',
          undefined,
          (s) => hashService.gerarHash(s)
        ),
      })
    );
    console.log(`✔ Atendente criada: ${atendente.getEmail()} (CPF: 22255588846)`);
  } else {
    console.log(`• Atendente já existente: ${atendente.getEmail()}`);
  }

  // 4. Profissional de Saúde
  let medico = await profissionalRepo.buscarPorCpf('12345678909');
  if (!medico) {
    medico = await profissionalRepo.salvar(
      new Profissional({
        id: randomUUID(),
        cpf: Cpf.criar('12345678909'),
        nomeCompleto: 'Dr. Roberto Mendes Silva',
        conselhoProfissional: 'CRM',
        numeroRegistro: '12345',
        ufRegistro: 'AL',
        email: 'medico@saude.maceio.gov.br',
        celular: '82999003300',
        nivelAcesso: 'PROFISSIONAL_SAUDE',
        situacaoAcesso: 'ATIVO',
        status: 'ATIVO',
        unidadesVinculadas: [unidade.getId()],
        especialidades: ['Clínica Médica'],
        senhaHash: Senha.criarDeTextoPlano(
          'MedicoSus2026',
          '12345678909',
          undefined,
          (s) => hashService.gerarHash(s)
        ),
      })
    );
    console.log(`✔ Profissional de Saúde criado: ${medico.getEmail()} (CPF: 12345678909)`);
  } else {
    console.log(`• Profissional de Saúde já existente: ${medico.getEmail()}`);
  }

  // 5. Serviço ativo
  let servico = await servicoRepo.buscarPorNomeEEspecialidade(
    'Consulta em Clínica Médica',
    'Clínica Médica'
  );
  if (!servico) {
    servico = await servicoRepo.salvar(
      new Servico({
        id: randomUUID(),
        nome: 'Consulta em Clínica Médica',
        categoria: 'CONSULTA',
        especialidade: 'Clínica Médica',
        modoAcesso: 'DIRETO',
        orientacoesPreparo:
          'Chegar com 15 minutos de antecedência portando documento oficial com foto e Cartão SUS (CNS).',
        status: 'ATIVO',
      })
    );
    console.log(`✔ Serviço criado: ${servico.getNome()} (${servico.getId()})`);
  } else {
    console.log(`• Serviço já existente: ${servico.getNome()} (${servico.getId()})`);
  }

  // 6. Agenda publicada com vagas
  const agendasExistentes = await agendaRepo.listarAgendas({
    unidadeId: unidade.getId(),
    servicoId: servico.getId(),
    profissionalId: medico.getId(),
    situacao: 'PUBLICADA',
  });

  if (agendasExistentes.length === 0) {
    const hojeIso = obterIntervaloDiaMaceio(new Date()).dataIso;
    const dataInicio = converterDataIsoParaDateUtc(hojeIso);
    const dataFim = new Date(dataInicio.getTime() + 14 * 24 * 60 * 60 * 1000);

    const diasHorarios = [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
      diaSemana,
      horarios: ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '23:30'],
    }));

    const agenda = new Agenda({
      id: randomUUID(),
      unidadeId: unidade.getId(),
      servicoId: servico.getId(),
      profissionalId: medico.getId(),
      dataInicio,
      dataFim,
      diasHorarios,
      capacidadePorHorario: 5,
      situacao: 'RASCUNHO',
    });

    const vagas = agenda.publicar('-03:00');
    await agendaRepo.salvarComVagas(agenda, vagas);
    console.log(
      `✔ Agenda publicada (${agenda.getId()}) com ${vagas.length} vagas materializadas`
    );
  } else {
    console.log(
      `• Agenda publicada já existente (${agendasExistentes[0].getId()})`
    );
  }

  // 7. Paciente de teste (Idosa prioritária)
  let paciente = await pacienteRepo.buscarPorCpf('52998224725');
  if (!paciente) {
    const dataNascimento = new Date('1958-04-12T00:00:00.000Z');
    paciente = await pacienteRepo.salvar(
      new Paciente({
        id: randomUUID(),
        cpf: Cpf.criar('52998224725'),
        cns: Cns.criar('123456789010000'),
        nomeCompleto: 'Maria da Silva',
        dataNascimento,
        email: 'maria.silva@email.com',
        celular: '82999887766',
        celularWhatsapp: true,
        possuiDeficiencia: 'NAO',
        tiposDeficiencia: [],
        endereco: {
          cep: '57050000',
          logradouro: 'Rua Cônego Machado',
          numero: '100',
          bairro: 'Farol',
          municipio: 'Maceió',
          estado: 'AL',
        },
        senhaHash: Senha.criarDeTextoPlano(
          'CidadaoSus2026',
          '52998224725',
          dataNascimento,
          (s) => hashService.gerarHash(s)
        ),
        cienciaPrivacidadeEm: new Date(),
        situacaoCns: 'CONFIRMADO',
        origemCadastro: 'AUTOATENDIMENTO',
        status: 'ATIVO',
      })
    );
    console.log(`✔ Paciente criado: ${paciente.getNomeCompleto()} (CPF: 52998224725)`);
  } else {
    console.log(`• Paciente já existente: ${paciente.getNomeCompleto()}`);
  }

  // 8. Segunda unidade de saúde
  let policlinica = await unidadeRepo.buscarPorCnes('2001002');
  if (!policlinica) {
    policlinica = await unidadeRepo.salvar(
      new UnidadeSaude({
        id: randomUUID(),
        cnes: '2001002',
        cnpj: '11222333000181',
        nome: 'Policlínica Benedito Bentes — Maceió',
        telefone: '(82) 3312-5400',
        email: 'policlinica.bb@saude.maceio.al.gov.br',
        endereco: {
          cep: '57084000',
          logradouro: 'Av. Cachoeira do Meirim',
          numero: '880',
          bairro: 'Benedito Bentes',
          municipio: 'Maceió',
          estado: 'AL',
        },
        fusoHorario: 'America/Maceio',
        status: 'ATIVA',
      })
    );
    console.log(`✔ Unidade criada: ${policlinica.getNome()} (${policlinica.getId()})`);
  } else {
    console.log(`• Unidade já existente: ${policlinica.getNome()}`);
  }

  // 9. Segunda profissional de saúde (Cardiologista)
  let draHelena = await profissionalRepo.buscarPorCpf('45612378955');
  if (!draHelena) {
    draHelena = await profissionalRepo.salvar(
      new Profissional({
        id: randomUUID(),
        cpf: Cpf.criar('45612378955'),
        nomeCompleto: 'Dra. Helena Costa',
        conselhoProfissional: 'CRM',
        numeroRegistro: '54321',
        ufRegistro: 'AL',
        email: 'helena.costa@saude.maceio.gov.br',
        celular: '82999004400',
        nivelAcesso: 'PROFISSIONAL_SAUDE',
        situacaoAcesso: 'ATIVO',
        status: 'ATIVO',
        unidadesVinculadas: [unidade.getId(), policlinica.getId()],
        especialidades: ['Cardiologia', 'Clínica Médica'],
        senhaHash: Senha.criarDeTextoPlano(
          'MedicoSus2026',
          '45612378955',
          undefined,
          (s) => hashService.gerarHash(s)
        ),
      })
    );
    console.log(`✔ Profissional criada: ${draHelena.getEmail()} (CPF: 45612378955)`);
  } else {
    console.log(`• Profissional já existente: ${draHelena.getEmail()}`);
  }

  // 10. Serviços adicionais para busca por especialidade/categoria
  const garantirServico = async (dados: {
    nome: string;
    categoria: 'CONSULTA' | 'PROCEDIMENTO' | 'CIRURGIA';
    especialidade: string;
    orientacoesPreparo: string;
  }) => {
    const existente = await servicoRepo.buscarPorNomeEEspecialidade(
      dados.nome,
      dados.especialidade
    );
    if (existente) return existente;
    const criado = await servicoRepo.salvar(
      new Servico({
        id: randomUUID(),
        nome: dados.nome,
        categoria: dados.categoria,
        especialidade: dados.especialidade,
        modoAcesso: 'DIRETO',
        orientacoesPreparo: dados.orientacoesPreparo,
        status: 'ATIVO',
      })
    );
    console.log(`✔ Serviço criado: ${criado.getNome()} (${criado.getEspecialidade()})`);
    return criado;
  };

  const servicoCardio = await garantirServico({
    nome: 'Consulta em Cardiologia',
    categoria: 'CONSULTA',
    especialidade: 'Cardiologia',
    orientacoesPreparo:
      'Trazer exames cardíacos anteriores e lista de medicamentos de uso contínuo.',
  });

  const servicoEcg = await garantirServico({
    nome: 'Eletrocardiograma (ECG)',
    categoria: 'PROCEDIMENTO',
    especialidade: 'Cardiologia',
    orientacoesPreparo:
      'Evitar uso de cremes ou óleos no tórax no dia do exame. Chegar 15 min antes.',
  });

  await garantirServico({
    nome: 'Consulta em Pediatria',
    categoria: 'CONSULTA',
    especialidade: 'Pediatria',
    orientacoesPreparo:
      'Levar caderneta de vacinação da criança e documento do responsável.',
  });

  // 11. Agendas publicadas da Dra. Helena Costa
  const hojeIso = obterIntervaloDiaMaceio(new Date()).dataIso;
  const dataInicioSeed = converterDataIsoParaDateUtc(hojeIso);
  const dataFimSeed = new Date(dataInicioSeed.getTime() + 14 * 24 * 60 * 60 * 1000);

  const agendasCardio = await agendaRepo.listarAgendas({
    unidadeId: unidade.getId(),
    servicoId: servicoCardio.getId(),
    profissionalId: draHelena.getId(),
    situacao: 'PUBLICADA',
  });
  if (agendasCardio.length === 0) {
    const agendaCardio = new Agenda({
      id: randomUUID(),
      unidadeId: unidade.getId(),
      servicoId: servicoCardio.getId(),
      profissionalId: draHelena.getId(),
      dataInicio: dataInicioSeed,
      dataFim: dataFimSeed,
      diasHorarios: [1, 2, 3, 4, 5].map((diaSemana) => ({
        diaSemana,
        horarios: ['08:30', '09:30', '10:30', '14:30', '15:30'],
      })),
      capacidadePorHorario: 4,
      situacao: 'RASCUNHO',
    });
    const vagasCardio = agendaCardio.publicar('-03:00');
    await agendaRepo.salvarComVagas(agendaCardio, vagasCardio);
    console.log(`✔ Agenda Cardiologia publicada com ${vagasCardio.length} vagas`);
  }

  const agendasEcg = await agendaRepo.listarAgendas({
    unidadeId: policlinica.getId(),
    servicoId: servicoEcg.getId(),
    profissionalId: draHelena.getId(),
    situacao: 'PUBLICADA',
  });
  if (agendasEcg.length === 0) {
    const agendaEcg = new Agenda({
      id: randomUUID(),
      unidadeId: policlinica.getId(),
      servicoId: servicoEcg.getId(),
      profissionalId: draHelena.getId(),
      dataInicio: dataInicioSeed,
      dataFim: dataFimSeed,
      diasHorarios: [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({
        diaSemana,
        horarios: ['08:00', '09:00', '14:00'],
      })),
      capacidadePorHorario: 3,
      situacao: 'RASCUNHO',
    });
    const vagasEcg = agendaEcg.publicar('-03:00');
    await agendaRepo.salvarComVagas(agendaEcg, vagasEcg);
    console.log(`✔ Agenda ECG publicada com ${vagasEcg.length} vagas`);
  }

  // 12. Pacientes extras e agendamentos de demonstração na agenda do Dr. Roberto
  // (Mantém Maria da Silva 52998224725 livre para testes manuais do cidadão)
  const garantirPacienteDemo = async (dados: {
    cpf: string;
    cns: string;
    nomeCompleto: string;
    dataNascimentoIso: string;
    email: string;
    celular: string;
  }) => {
    const existente = await pacienteRepo.buscarPorCpf(dados.cpf);
    if (existente) return existente;
    const dn = new Date(`${dados.dataNascimentoIso}T00:00:00.000Z`);
    const criado = await pacienteRepo.salvar(
      new Paciente({
        id: randomUUID(),
        cpf: Cpf.criar(dados.cpf),
        cns: Cns.criar(dados.cns),
        nomeCompleto: dados.nomeCompleto,
        dataNascimento: dn,
        email: dados.email,
        celular: dados.celular,
        celularWhatsapp: true,
        possuiDeficiencia: 'NAO',
        tiposDeficiencia: [],
        endereco: {
          cep: '57050000',
          logradouro: 'Av. Fernandes Lima',
          numero: '500',
          bairro: 'Farol',
          municipio: 'Maceió',
          estado: 'AL',
        },
        senhaHash: Senha.criarDeTextoPlano(
          'CidadaoSus2026',
          dados.cpf,
          dn,
          (s) => hashService.gerarHash(s)
        ),
        cienciaPrivacidadeEm: new Date(),
        situacaoCns: 'CONFIRMADO',
        origemCadastro: 'AUTOATENDIMENTO',
        status: 'ATIVO',
      })
    );
    console.log(`✔ Paciente demo criado: ${criado.getNomeCompleto()} (CPF: ${dados.cpf})`);
    return criado;
  };

  const pacAntonia = await garantirPacienteDemo({
    cpf: '85274196373',
    cns: '700000000000013',
    nomeCompleto: 'Antônia Ferreira Lima',
    dataNascimentoIso: '1956-08-20',
    email: 'antonia.lima@email.com',
    celular: '82999112233',
  });

  const pacJoao = await garantirPacienteDemo({
    cpf: '65498732155',
    cns: '900000000000008',
    nomeCompleto: 'João Pedro Santos',
    dataNascimentoIso: '1993-05-14',
    email: 'joao.santos@email.com',
    celular: '82999445566',
  });

  const vagasDrRoberto = await agendaRepo.listarVagasDisponiveis({
    unidadeId: unidade.getId(),
    servicoId: servico.getId(),
    profissionalId: medico.getId(),
    aPartirDe: obterIntervaloDiaMaceio(new Date()).dataInicioDia,
  });

  if (vagasDrRoberto.length > 0) {
    const marcarDemoSeNecessario = async (
      pacDemo: Paciente,
      indiceVaga: number,
      senhaDemo: string,
      sufixoProtocolo: string
    ) => {
      const jaTem = await agendamentoRepo.buscarAtivoPorPacienteEServico(
        pacDemo.getId(),
        servico.getId()
      );
      if (jaTem) return;
      const alvo = vagasDrRoberto[Math.min(indiceVaga, vagasDrRoberto.length - 1)];
      if (!alvo) return;
      const ag = new Agendamento({
        id: randomUUID(),
        pacienteId: pacDemo.getId(),
        unidadeId: unidade.getId(),
        servicoId: servico.getId(),
        profissionalId: medico.getId(),
        vagaId: alvo.vaga.getId(),
        dataHoraAtendimento: alvo.vaga.getDataHoraInicio(),
        protocolo: Agendamento.gerarProtocolo(new Date(), sufixoProtocolo),
        senhaAtendimento: senhaDemo,
        origemMarcacao: 'APLICATIVO',
        status: 'AGENDADO',
      });
      await agendamentoRepo.reservarVagaECriar(ag);
      console.log(`✔ Agendamento demo criado para ${pacDemo.obterNomeExibicao()} na agenda do Dr. Roberto`);
    };

    await marcarDemoSeNecessario(pacAntonia, 0, 'P001', 'DEMO01');
    await marcarDemoSeNecessario(pacJoao, vagasDrRoberto.length > 2 ? 2 : 0, 'C002', 'DEMO02');
  }

  console.log('Seed concluído com sucesso!');
}

seed()
  .catch((erro) => {
    console.error('Erro ao executar seed:', erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
