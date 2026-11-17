import {
  Agenda as PrismaAgenda,
  Agendamento as PrismaAgendamento,
  ChamadaFila as PrismaChamadaFila,
  EntradaFila as PrismaEntradaFila,
  Paciente as PrismaPaciente,
  Profissional as PrismaProfissional,
  ProfissionalUnidade as PrismaProfissionalUnidade,
  Servico as PrismaServico,
  UnidadeSaude as PrismaUnidadeSaude,
  VagaAgenda as PrismaVagaAgenda,
} from '@prisma/client';
import {
  Agenda,
  ConfiguracaoDiaHorario,
} from '../../../domain/entities/Agenda';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { ChamadaFila } from '../../../domain/entities/ChamadaFila';
import { EntradaFila } from '../../../domain/entities/EntradaFila';
import {
  Paciente,
  TipoDeficiencia,
} from '../../../domain/entities/Paciente';
import { Profissional } from '../../../domain/entities/Profissional';
import { Servico } from '../../../domain/entities/Servico';
import { UnidadeSaude } from '../../../domain/entities/UnidadeSaude';
import { VagaAgenda } from '../../../domain/entities/VagaAgenda';
import { Cns } from '../../../domain/value-objects/Cns';
import { Cpf } from '../../../domain/value-objects/Cpf';
import { Senha } from '../../../domain/value-objects/Senha';

export function paraDominioUnidadeSaude(row: PrismaUnidadeSaude): UnidadeSaude {
  return new UnidadeSaude({
    id: row.id,
    cnes: row.cnes,
    cnpj: row.cnpj,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    endereco: {
      cep: row.cep,
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      municipio: row.municipio,
      estado: row.estado.trim(),
    },
    fusoHorario: row.fusoHorario,
    status: row.status,
    motivoInativacao: row.motivoInativacao,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function paraDominioPaciente(row: PrismaPaciente): Paciente {
  return new Paciente({
    id: row.id,
    cpf: Cpf.criar(row.cpf),
    cns: Cns.criar(row.cns),
    nomeCompleto: row.nomeCompleto,
    nomeSocial: row.nomeSocial,
    dataNascimento: row.dataNascimento,
    email: row.email,
    celular: row.celular,
    celularWhatsapp: row.celularWhatsapp,
    possuiDeficiencia: row.possuiDeficiencia,
    tiposDeficiencia: row.tiposDeficiencia as TipoDeficiencia[],
    preferenciasAcessibilidade: row.preferenciasAcessibilidade,
    endereco: {
      cep: row.cep,
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      municipio: row.municipio,
      estado: row.estado.trim(),
    },
    senhaHash: Senha.deHash(row.senhaHash),
    cienciaPrivacidadeEm: row.cienciaPrivacidadeEm,
    situacaoCns: row.situacaoCns,
    origemCadastro: row.origemCadastro,
    status: row.status,
    tentativasMalsucedidas: row.tentativasMalsucedidas,
    bloqueioTemporarioAte: row.bloqueioTemporarioAte,
    ultimoAcesso: row.ultimoAcesso,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export type PrismaProfissionalComUnidades = PrismaProfissional & {
  unidades: PrismaProfissionalUnidade[];
};

export function paraDominioProfissional(
  row: PrismaProfissionalComUnidades
): Profissional {
  return new Profissional({
    id: row.id,
    cpf: Cpf.criar(row.cpf),
    nomeCompleto: row.nomeCompleto,
    nomeSocial: row.nomeSocial,
    conselhoProfissional: row.conselhoProfissional,
    numeroRegistro: row.numeroRegistro,
    ufRegistro: row.ufRegistro ? row.ufRegistro.trim() : null,
    email: row.email,
    celular: row.celular,
    nivelAcesso: row.nivelAcesso,
    situacaoAcesso: row.situacaoAcesso,
    status: row.status,
    motivoInativacao: row.motivoInativacao,
    unidadesVinculadas: row.unidades.map((u) => u.unidadeId),
    especialidades: row.especialidades,
    senhaHash: Senha.deHash(row.credencialHash),
    tentativasMalsucedidas: row.tentativasMalsucedidas,
    bloqueioTemporarioAte: row.bloqueioTemporarioAte,
    ultimoAcesso: row.ultimoAcesso,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function paraDominioServico(row: PrismaServico): Servico {
  return new Servico({
    id: row.id,
    nome: row.nome,
    categoria: row.categoria,
    especialidade: row.especialidade,
    modoAcesso: row.modoAcesso,
    orientacoesPreparo: row.orientacoesPreparo,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function paraDominioAgenda(row: PrismaAgenda): Agenda {
  return new Agenda({
    id: row.id,
    unidadeId: row.unidadeId,
    servicoId: row.servicoId,
    profissionalId: row.profissionalId,
    dataInicio: row.dataInicio,
    dataFim: row.dataFim,
    diasHorarios: row.diasHorarios as unknown as ConfiguracaoDiaHorario[],
    capacidadePorHorario: row.capacidadePorHorario,
    situacao: row.situacao,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function paraDominioVagaAgenda(row: PrismaVagaAgenda): VagaAgenda {
  return new VagaAgenda({
    id: row.id,
    agendaId: row.agendaId,
    dataHoraInicio: row.dataHoraInicio,
    capacidadeTotal: row.capacidadeTotal,
    vagasOcupadas: row.vagasOcupadas,
  });
}

export function paraDominioAgendamento(row: PrismaAgendamento): Agendamento {
  return new Agendamento({
    id: row.id,
    pacienteId: row.pacienteId,
    unidadeId: row.unidadeId,
    servicoId: row.servicoId,
    profissionalId: row.profissionalId,
    vagaId: row.vagaId,
    dataHoraAtendimento: row.dataHoraAtendimento,
    protocolo: row.protocolo,
    senhaAtendimento: row.senhaAtendimento,
    versao: row.versao,
    origemMarcacao: row.origemMarcacao,
    status: row.status,
    motivoCancelamento: row.motivoCancelamento,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function paraDominioEntradaFila(row: PrismaEntradaFila): EntradaFila {
  return new EntradaFila({
    id: row.id,
    agendamentoId: row.agendamentoId,
    pacienteId: row.pacienteId,
    unidadeId: row.unidadeId,
    atendenteResponsavelId: row.atendenteResponsavelId,
    dataHoraChegada: row.dataHoraChegada,
    grupoAtendimento: row.grupoAtendimento,
    criterioPrioridade: row.criterioPrioridade,
    senhaAtendimento: row.senhaAtendimento,
    ordemEntrada: row.ordemEntrada,
    situacao: row.situacao,
    recolocacoes: row.recolocacoes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function paraDominioChamadaFila(row: PrismaChamadaFila): ChamadaFila {
  return new ChamadaFila({
    id: row.id,
    entradaFilaId: row.entradaFilaId,
    profissionalChamadorId: row.profissionalChamadorId,
    guicheSala: row.guicheSala,
    dataHoraChamada: row.dataHoraChamada,
    tentativa: row.tentativa,
    estado: row.estado,
    dataHoraInicio: row.dataHoraInicio,
    dataHoraConclusao: row.dataHoraConclusao,
    duracaoMinutos: row.duracaoMinutos,
    motivoAusencia: row.motivoAusencia,
  });
}
