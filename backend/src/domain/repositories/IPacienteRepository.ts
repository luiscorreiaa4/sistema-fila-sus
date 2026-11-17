import { Paciente } from '../entities/Paciente';

export interface IPacienteRepository {
  buscarPorId(id: string): Promise<Paciente | null>;
  buscarPorCpf(cpf: string): Promise<Paciente | null>;
  buscarPorCns(cns: string): Promise<Paciente | null>;
  buscarPorEmail(email: string): Promise<Paciente | null>;
  salvar(paciente: Paciente): Promise<Paciente>;
  atualizar(paciente: Paciente): Promise<Paciente>;
}
