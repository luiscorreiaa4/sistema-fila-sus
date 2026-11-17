import { Request, Response } from 'express';
import {
  ChamarProximoPacienteUseCase,
  ConcluirAtendimentoFilaUseCase,
  ConsultarMinhaPosicaoFilaUseCase,
  IniciarAtendimentoFilaUseCase,
  ListarFilaOperacionalUseCase,
  RealizarCheckinUseCase,
  RechamarPacienteUseCase,
  RegistrarAusenciaFilaUseCase,
} from '../../../application/use-cases/fila/FilaUseCases';
import {
  apresentarAgendamento,
  apresentarChamadaFila,
  apresentarEntradaFila,
  apresentarEntradaFilaOperacional,
} from '../presenters/presenters';
import {
  chamarProximoSchema,
  checkinSchema,
  registrarAusenciaSchema,
  uuidSchema,
} from '../validators/schemas';

export class FilaController {
  constructor(
    private readonly realizarCheckinUseCase: RealizarCheckinUseCase,
    private readonly chamarProximoUseCase: ChamarProximoPacienteUseCase,
    private readonly rechamarUseCase: RechamarPacienteUseCase,
    private readonly iniciarUseCase: IniciarAtendimentoFilaUseCase,
    private readonly concluirUseCase: ConcluirAtendimentoFilaUseCase,
    private readonly registrarAusenciaUseCase: RegistrarAusenciaFilaUseCase,
    private readonly listarFilaOperacionalUseCase: ListarFilaOperacionalUseCase,
    private readonly consultarMinhaPosicaoUseCase: ConsultarMinhaPosicaoFilaUseCase
  ) {}

  public checkin = async (req: Request, res: Response): Promise<void> => {
    const body = checkinSchema.parse(req.body);
    const resultado = await this.realizarCheckinUseCase.executar({
      protocolo: body.protocolo,
      cpf: body.cpf,
      unidadeId: body.unidadeId,
      atendenteId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });

    res.status(resultado.jaRegistrado ? 200 : 201).json({
      jaRegistrado: resultado.jaRegistrado,
      entrada: apresentarEntradaFila(resultado.entrada),
    });
  };

  public chamarProximo = async (req: Request, res: Response): Promise<void> => {
    const body = chamarProximoSchema.parse(req.body);
    const resultado = await this.chamarProximoUseCase.executar({
      unidadeId: body.unidadeId,
      guicheSala: body.guicheSala,
      estrategia: body.estrategia,
      profissionalId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });

    if (!resultado) {
      res.status(200).json({
        chamada: null,
        mensagem: 'Nenhum paciente aguardando na fila',
      });
      return;
    }

    res.status(200).json({
      entrada: apresentarEntradaFila(resultado.entrada),
      chamada: apresentarChamadaFila(resultado.chamada),
    });
  };

  public rechamar = async (req: Request, res: Response): Promise<void> => {
    const entradaId = uuidSchema.parse(req.params.entradaId);
    const resultado = await this.rechamarUseCase.executar({
      entradaId,
      profissionalId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });

    res.status(200).json({
      entrada: apresentarEntradaFila(resultado.entrada),
      chamada: apresentarChamadaFila(resultado.chamada),
    });
  };

  public iniciar = async (req: Request, res: Response): Promise<void> => {
    const entradaId = uuidSchema.parse(req.params.entradaId);
    const resultado = await this.iniciarUseCase.executar({
      entradaId,
      profissionalId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });

    res.status(200).json({
      entrada: apresentarEntradaFila(resultado.entrada),
      chamada: apresentarChamadaFila(resultado.chamada),
    });
  };

  public concluir = async (req: Request, res: Response): Promise<void> => {
    const entradaId = uuidSchema.parse(req.params.entradaId);
    const resultado = await this.concluirUseCase.executar({
      entradaId,
      profissionalId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });

    res.status(200).json({
      entrada: apresentarEntradaFila(resultado.entrada),
      chamada: apresentarChamadaFila(resultado.chamada),
      agendamento: apresentarAgendamento(resultado.agendamento),
    });
  };

  public ausente = async (req: Request, res: Response): Promise<void> => {
    const entradaId = uuidSchema.parse(req.params.entradaId);
    const body = registrarAusenciaSchema.parse(req.body ?? {});
    const resultado = await this.registrarAusenciaUseCase.executar({
      entradaId,
      motivoAusencia: body.motivoAusencia,
      permitirRecolocacao: body.permitirRecolocacao,
      profissionalId: req.usuario!.sub,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });

    res.status(200).json({
      entrada: apresentarEntradaFila(resultado.entrada),
      chamada: apresentarChamadaFila(resultado.chamada),
    });
  };

  public listarUnidade = async (req: Request, res: Response): Promise<void> => {
    const unidadeId = uuidSchema.parse(req.params.unidadeId);
    const entradas = await this.listarFilaOperacionalUseCase.executar({
      unidadeId,
      solicitantePerfil: req.usuario!.perfil,
      unidadesVinculadas: req.usuario!.unidadesVinculadas,
    });

    res.status(200).json({
      fila: entradas.map(apresentarEntradaFilaOperacional),
    });
  };

  public minhaPosicao = async (req: Request, res: Response): Promise<void> => {
    const posicoes = await this.consultarMinhaPosicaoUseCase.executar(
      req.usuario!.sub
    );

    res.status(200).json({
      entradas: posicoes,
    });
  };
}
