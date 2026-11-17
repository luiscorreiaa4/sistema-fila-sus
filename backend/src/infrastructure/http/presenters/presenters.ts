import { Agenda } from '../../../domain/entities/Agenda';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { ChamadaFila } from '../../../domain/entities/ChamadaFila';
import { EntradaFila } from '../../../domain/entities/EntradaFila';
import { Paciente } from '../../../domain/entities/Paciente';
import { Profissional } from '../../../domain/entities/Profissional';
import { Servico } from '../../../domain/entities/Servico';
import { UnidadeSaude } from '../../../domain/entities/UnidadeSaude';
import { VagaAgenda } from '../../../domain/entities/VagaAgenda';
import { VagaDisponivelDTO } from '../../../domain/repositories/IAgendaRepository';
import { AgendamentoDetalhadoDTO } from '../../../domain/repositories/IAgendamentoRepository';
import { EntradaFilaOperacionalDTO } from '../../../domain/repositories/IFilaRepository';
import { ChamadaPainelPublicoDTO } from '../../../domain/repositories/IPainelPublicoRepository';

export function apresentarUnidadeSaude(unidade: UnidadeSaude) {
  return {
    id: unidade.getId(),
    cnes: unidade.getCnes(),
    cnpj: unidade.getCnpj(),
    nome: unidade.getNome(),
    telefone: unidade.getTelefone(),
    email: unidade.getEmail(),
    endereco: unidade.getEndereco(),
    fusoHorario: unidade.getFusoHorario(),
    status: unidade.getStatus(),
    motivoInativacao: unidade.getMotivoInativacao(),
    createdAt: unidade.getCreatedAt(),
    updatedAt: unidade.getUpdatedAt(),
  };
}

export function apresentarPaciente(paciente: Paciente) {
  return {
    id: paciente.getId(),
    cpf: paciente.getCpf().getValor(),
    cpfFormatado: paciente.getCpf().formatado(),
    cns: paciente.getCns().getValor(),
    nomeCompleto: paciente.getNomeCompleto(),
    nomeSocial: paciente.getNomeSocial(),
    nomeExibicao: paciente.obterNomeExibicao(),
    dataNascimento: paciente.getDataNascimento(),
    email: paciente.getEmail(),
    celular: paciente.getCelular(),
    celularWhatsapp: paciente.getCelularWhatsapp(),
    possuiDeficiencia: paciente.getPossuiDeficiencia(),
    tiposDeficiencia: paciente.getTiposDeficiencia(),
    preferenciasAcessibilidade: paciente.getPreferenciasAcessibilidade(),
    endereco: paciente.getEndereco(),
    situacaoCns: paciente.getSituacaoCns(),
    origemCadastro: paciente.getOrigemCadastro(),
    status: paciente.getStatus(),
    ehPrioritarioLegal: paciente.ehPrioritarioLegal(),
    criterioPrioridade: paciente.obterCriterioPrioridade(),
    perfil: paciente.obterPerfilAcesso(),
    createdAt: paciente.getCreatedAt(),
    updatedAt: paciente.getUpdatedAt(),
  };
}

export function apresentarProfissional(profissional: Profissional) {
  return {
    id: profissional.getId(),
    cpf: profissional.getCpf().getValor(),
    cpfFormatado: profissional.getCpf().formatado(),
    nomeCompleto: profissional.getNomeCompleto(),
    nomeSocial: profissional.getNomeSocial(),
    nomeExibicao: profissional.obterNomeExibicao(),
    conselhoProfissional: profissional.getConselhoProfissional(),
    numeroRegistro: profissional.getNumeroRegistro(),
    ufRegistro: profissional.getUfRegistro(),
    email: profissional.getEmail(),
    celular: profissional.getCelular(),
    nivelAcesso: profissional.getNivelAcesso(),
    perfil: profissional.obterPerfilAcesso(),
    situacaoAcesso: profissional.getSituacaoAcesso(),
    status: profissional.getStatus(),
    motivoInativacao: profissional.getMotivoInativacao(),
    unidadesVinculadas: profissional.getUnidadesVinculadas(),
    especialidades: profissional.getEspecialidades(),
    createdAt: profissional.getCreatedAt(),
    updatedAt: profissional.getUpdatedAt(),
  };
}

export function apresentarServico(servico: Servico) {
  return {
    id: servico.getId(),
    nome: servico.getNome(),
    categoria: servico.getCategoria(),
    especialidade: servico.getEspecialidade(),
    modoAcesso: servico.getModoAcesso(),
    orientacoesPreparo: servico.getOrientacoesPreparo(),
    status: servico.getStatus(),
    createdAt: servico.getCreatedAt(),
    updatedAt: servico.getUpdatedAt(),
  };
}

export function apresentarAgenda(agenda: Agenda) {
  return {
    id: agenda.getId(),
    unidadeId: agenda.getUnidadeId(),
    servicoId: agenda.getServicoId(),
    profissionalId: agenda.getProfissionalId(),
    dataInicio: agenda.getDataInicio().toISOString().slice(0, 10),
    dataFim: agenda.getDataFim().toISOString().slice(0, 10),
    diasHorarios: agenda.getDiasHorarios(),
    capacidadePorHorario: agenda.getCapacidadePorHorario(),
    situacao: agenda.getSituacao(),
    createdAt: agenda.getCreatedAt(),
    updatedAt: agenda.getUpdatedAt(),
  };
}

export function apresentarVaga(vaga: VagaAgenda) {
  return {
    id: vaga.getId(),
    agendaId: vaga.getAgendaId(),
    dataHoraInicio: vaga.getDataHoraInicio(),
    capacidadeTotal: vaga.getCapacidadeTotal(),
    vagasOcupadas: vaga.getVagasOcupadas(),
    vagasDisponiveis: vaga.vagasDisponiveis(),
  };
}

export function apresentarVagaDisponivel(dto: VagaDisponivelDTO) {
  return {
    ...apresentarVaga(dto.vaga),
    unidadeId: dto.unidadeId,
    unidadeNome: dto.unidadeNome,
    servicoId: dto.servicoId,
    servicoNome: dto.servicoNome,
    especialidade: dto.especialidade,
    profissionalId: dto.profissionalId,
    profissionalNome: dto.profissionalNome,
  };
}

export function apresentarAgendamento(agendamento: Agendamento) {
  return {
    id: agendamento.getId(),
    pacienteId: agendamento.getPacienteId(),
    unidadeId: agendamento.getUnidadeId(),
    servicoId: agendamento.getServicoId(),
    profissionalId: agendamento.getProfissionalId(),
    vagaId: agendamento.getVagaId(),
    dataHoraAtendimento: agendamento.getDataHoraAtendimento(),
    protocolo: agendamento.getProtocolo(),
    senhaAtendimento: agendamento.getSenhaAtendimento(),
    versao: agendamento.getVersao(),
    origemMarcacao: agendamento.getOrigemMarcacao(),
    status: agendamento.getStatus(),
    motivoCancelamento: agendamento.getMotivoCancelamento(),
    createdAt: agendamento.getCreatedAt(),
    updatedAt: agendamento.getUpdatedAt(),
  };
}

export function apresentarAgendamentoDetalhado(dto: AgendamentoDetalhadoDTO) {
  return {
    ...apresentarAgendamento(dto.agendamento),
    unidadeNome: dto.unidadeNome,
    servicoNome: dto.servicoNome,
    especialidade: dto.especialidade,
    orientacoesPreparo: dto.orientacoesPreparo,
    ...(dto.pacienteNomeExibicao !== undefined
      ? { pacienteNomeExibicao: dto.pacienteNomeExibicao }
      : {}),
    ...(dto.profissionalNomeExibicao !== undefined
      ? { profissionalNomeExibicao: dto.profissionalNomeExibicao }
      : {}),
  };
}

export function apresentarEntradaFila(entrada: EntradaFila) {
  return {
    id: entrada.getId(),
    agendamentoId: entrada.getAgendamentoId(),
    pacienteId: entrada.getPacienteId(),
    unidadeId: entrada.getUnidadeId(),
    atendenteResponsavelId: entrada.getAtendenteResponsavelId(),
    dataHoraChegada: entrada.getDataHoraChegada(),
    grupoAtendimento: entrada.getGrupoAtendimento(),
    criterioPrioridade: entrada.getCriterioPrioridade(),
    senhaAtendimento: entrada.getSenhaAtendimento(),
    ordemEntrada: entrada.getOrdemEntrada(),
    situacao: entrada.getSituacao(),
    recolocacoes: entrada.getRecolocacoes(),
  };
}

export function apresentarChamadaFila(chamada: ChamadaFila) {
  return {
    id: chamada.getId(),
    entradaFilaId: chamada.getEntradaFilaId(),
    profissionalChamadorId: chamada.getProfissionalChamadorId(),
    guicheSala: chamada.getGuicheSala(),
    dataHoraChamada: chamada.getDataHoraChamada(),
    tentativa: chamada.getTentativa(),
    estado: chamada.getEstado(),
    dataHoraInicio: chamada.getDataHoraInicio(),
    dataHoraConclusao: chamada.getDataHoraConclusao(),
    duracaoMinutos: chamada.getDuracaoMinutos(),
    motivoAusencia: chamada.getMotivoAusencia(),
  };
}

export function apresentarEntradaFilaOperacional(
  dto: EntradaFilaOperacionalDTO
) {
  return {
    ...apresentarEntradaFila(dto.entrada),
    nomeExibicao: dto.nomeExibicao,
    protocolo: dto.protocolo,
    servicoNome: dto.servicoNome,
    ultimaChamada: dto.ultimaChamada
      ? apresentarChamadaFila(dto.ultimaChamada)
      : null,
  };
}

export function apresentarChamadaPainelPublico(dto: ChamadaPainelPublicoDTO) {
  return {
    chamadaId: dto.chamadaId,
    unidadeId: dto.unidadeId,
    unidadeNome: dto.unidadeNome,
    senhaAtendimento: dto.senhaAtendimento,
    guicheSala: dto.guicheSala,
    horarioChamada: dto.horarioChamada,
    tentativa: dto.tentativa,
    estado: dto.estado,
  };
}
