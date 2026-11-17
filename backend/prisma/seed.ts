import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Agenda } from '../src/domain/entities/Agenda';
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
