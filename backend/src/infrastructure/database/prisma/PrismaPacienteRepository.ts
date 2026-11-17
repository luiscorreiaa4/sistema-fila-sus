import { PrismaClient } from '@prisma/client';
import { Paciente } from '../../../domain/entities/Paciente';
import { IPacienteRepository } from '../../../domain/repositories/IPacienteRepository';
import { paraDominioPaciente } from './mappers';

export class PrismaPacienteRepository implements IPacienteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async buscarPorId(id: string): Promise<Paciente | null> {
    const row = await this.prisma.paciente.findUnique({ where: { id } });
    return row ? paraDominioPaciente(row) : null;
  }

  public async buscarPorCpf(cpf: string): Promise<Paciente | null> {
    const row = await this.prisma.paciente.findUnique({ where: { cpf } });
    return row ? paraDominioPaciente(row) : null;
  }

  public async buscarPorCns(cns: string): Promise<Paciente | null> {
    const row = await this.prisma.paciente.findUnique({ where: { cns } });
    return row ? paraDominioPaciente(row) : null;
  }

  public async buscarPorEmail(email: string): Promise<Paciente | null> {
    const row = await this.prisma.paciente.findUnique({
      where: { email: email.toLowerCase() },
    });
    return row ? paraDominioPaciente(row) : null;
  }

  public async salvar(paciente: Paciente): Promise<Paciente> {
    const endereco = paciente.getEndereco();
    const row = await this.prisma.paciente.create({
      data: {
        id: paciente.getId(),
        cpf: paciente.getCpf().getValor(),
        cns: paciente.getCns().getValor(),
        nomeCompleto: paciente.getNomeCompleto(),
        nomeSocial: paciente.getNomeSocial(),
        dataNascimento: paciente.getDataNascimento(),
        email: paciente.getEmail(),
        celular: paciente.getCelular(),
        celularWhatsapp: paciente.getCelularWhatsapp(),
        possuiDeficiencia: paciente.getPossuiDeficiencia(),
        tiposDeficiencia: paciente.getTiposDeficiencia(),
        preferenciasAcessibilidade: paciente.getPreferenciasAcessibilidade(),
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento ?? null,
        bairro: endereco.bairro,
        municipio: endereco.municipio,
        estado: endereco.estado,
        senhaHash: paciente.getSenhaHash().getHash(),
        cienciaPrivacidadeEm: paciente.getCienciaPrivacidadeEm(),
        situacaoCns: paciente.getSituacaoCns(),
        origemCadastro: paciente.getOrigemCadastro(),
        status: paciente.getStatus(),
        tentativasMalsucedidas: paciente.getTentativasMalsucedidas(),
        bloqueioTemporarioAte: paciente.getBloqueioTemporarioAte(),
        ultimoAcesso: paciente.getUltimoAcesso(),
      },
    });
    return paraDominioPaciente(row);
  }

  public async atualizar(paciente: Paciente): Promise<Paciente> {
    const endereco = paciente.getEndereco();
    const row = await this.prisma.paciente.update({
      where: { id: paciente.getId() },
      data: {
        nomeSocial: paciente.getNomeSocial(),
        email: paciente.getEmail(),
        celular: paciente.getCelular(),
        celularWhatsapp: paciente.getCelularWhatsapp(),
        possuiDeficiencia: paciente.getPossuiDeficiencia(),
        tiposDeficiencia: paciente.getTiposDeficiencia(),
        preferenciasAcessibilidade: paciente.getPreferenciasAcessibilidade(),
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento ?? null,
        bairro: endereco.bairro,
        municipio: endereco.municipio,
        estado: endereco.estado,
        situacaoCns: paciente.getSituacaoCns(),
        status: paciente.getStatus(),
        tentativasMalsucedidas: paciente.getTentativasMalsucedidas(),
        bloqueioTemporarioAte: paciente.getBloqueioTemporarioAte(),
        ultimoAcesso: paciente.getUltimoAcesso(),
        updatedAt: paciente.getUpdatedAt(),
      },
    });
    return paraDominioPaciente(row);
  }
}
