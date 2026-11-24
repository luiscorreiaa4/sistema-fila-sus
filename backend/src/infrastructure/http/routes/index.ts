import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import {
  AlterarSituacaoAgendaUseCase,
  ConsultarGradeAgendaUseCase,
  CriarAgendaUseCase,
  ListarAgendasDetalhadasUseCase,
  ListarVagasDisponiveisUseCase,
  ObterCatalogoBuscaVagasUseCase,
} from '../../../application/use-cases/agendas/AgendaUseCases';
import {
  CancelarAgendamentoUseCase,
  ListarAgendamentosUnidadeUseCase,
  ListarMeusAgendamentosUseCase,
  MarcarAgendamentoUseCase,
} from '../../../application/use-cases/agendamentos/AgendamentoUseCases';
import {
  AutenticarUsuarioUseCase,
  ObterUsuarioAutenticadoUseCase,
} from '../../../application/use-cases/auth/AuthUseCases';
import {
  ChamarProximoPacienteUseCase,
  ConcluirAtendimentoFilaUseCase,
  ConsultarMinhaPosicaoFilaUseCase,
  ConsultarPainelPublicoUseCase,
  IniciarAtendimentoFilaUseCase,
  ListarFilaOperacionalUseCase,
  RealizarCheckinUseCase,
  RechamarPacienteUseCase,
  RegistrarAusenciaFilaUseCase,
} from '../../../application/use-cases/fila/FilaUseCases';
import {
  AtualizarPerfilPacienteUseCase,
  BuscarPacientePorCpfUseCase,
  CadastrarPacienteUseCase,
  ObterPerfilPacienteUseCase,
} from '../../../application/use-cases/pacientes/PacienteUseCases';
import {
  CadastrarProfissionalUseCase,
  InativarProfissionalUseCase,
  ListarProfissionaisUseCase,
} from '../../../application/use-cases/profissionais/ProfissionalUseCases';
import {
  CadastrarServicoUseCase,
  InativarServicoUseCase,
  ListarServicosUseCase,
} from '../../../application/use-cases/servicos/ServicoUseCases';
import {
  CadastrarUnidadeSaudeUseCase,
  InativarUnidadeSaudeUseCase,
  ListarUnidadesSaudeUseCase,
} from '../../../application/use-cases/unidades/UnidadeSaudeUseCases';
import { PrismaAgendamentoRepository } from '../../database/prisma/PrismaAgendamentoRepository';
import { PrismaAgendaRepository } from '../../database/prisma/PrismaAgendaRepository';
import { PrismaFilaRepository } from '../../database/prisma/PrismaFilaRepository';
import { PrismaPacienteRepository } from '../../database/prisma/PrismaPacienteRepository';
import { PrismaPainelPublicoRepository } from '../../database/prisma/PrismaPainelPublicoRepository';
import { PrismaProfissionalRepository } from '../../database/prisma/PrismaProfissionalRepository';
import { PrismaServicoRepository } from '../../database/prisma/PrismaServicoRepository';
import { PrismaUnidadeSaudeRepository } from '../../database/prisma/PrismaUnidadeSaudeRepository';
import { BcryptHashService } from '../../security/BcryptHashService';
import { JwtTokenService } from '../../security/JwtTokenService';
import { AgendamentosController } from '../controllers/AgendamentosController';
import { AgendasController } from '../controllers/AgendasController';
import { AuthController } from '../controllers/AuthController';
import { FilaController } from '../controllers/FilaController';
import { PacientesController } from '../controllers/PacientesController';
import { PainelPublicoController } from '../controllers/PainelPublicoController';
import { ProfissionaisController } from '../controllers/ProfissionaisController';
import { ServicosController } from '../controllers/ServicosController';
import { UnidadesController } from '../controllers/UnidadesController';
import { criarAuthMiddlewares } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

export function criarApiRouter(prisma: PrismaClient): Router {
  const router = Router();

  // Serviços de infraestrutura
  const hashService = new BcryptHashService(10);
  const tokenService = new JwtTokenService();
  const { autenticarJwt, exigirPerfis, verificarVinculoUnidade } =
    criarAuthMiddlewares(tokenService);

  // Repositórios Prisma
  const unidadeRepo = new PrismaUnidadeSaudeRepository(prisma);
  const pacienteRepo = new PrismaPacienteRepository(prisma);
  const profissionalRepo = new PrismaProfissionalRepository(prisma);
  const servicoRepo = new PrismaServicoRepository(prisma);
  const agendaRepo = new PrismaAgendaRepository(prisma);
  const agendamentoRepo = new PrismaAgendamentoRepository(prisma);
  const filaRepo = new PrismaFilaRepository(prisma);
  const painelRepo = new PrismaPainelPublicoRepository(prisma);

  // Controllers + Casos de uso
  const unidadesController = new UnidadesController(
    new CadastrarUnidadeSaudeUseCase(unidadeRepo),
    new ListarUnidadesSaudeUseCase(unidadeRepo),
    new InativarUnidadeSaudeUseCase(unidadeRepo)
  );

  const pacientesController = new PacientesController(
    new CadastrarPacienteUseCase(pacienteRepo, hashService),
    new ObterPerfilPacienteUseCase(pacienteRepo),
    new AtualizarPerfilPacienteUseCase(pacienteRepo),
    new BuscarPacientePorCpfUseCase(pacienteRepo)
  );

  const profissionaisController = new ProfissionaisController(
    new CadastrarProfissionalUseCase(profissionalRepo, unidadeRepo, hashService),
    new ListarProfissionaisUseCase(profissionalRepo),
    new InativarProfissionalUseCase(profissionalRepo)
  );

  const authController = new AuthController(
    new AutenticarUsuarioUseCase(
      pacienteRepo,
      profissionalRepo,
      hashService,
      tokenService
    ),
    new ObterUsuarioAutenticadoUseCase(pacienteRepo, profissionalRepo)
  );

  const servicosController = new ServicosController(
    new CadastrarServicoUseCase(servicoRepo),
    new ListarServicosUseCase(servicoRepo),
    new InativarServicoUseCase(servicoRepo)
  );

  const agendasController = new AgendasController(
    new CriarAgendaUseCase(
      agendaRepo,
      unidadeRepo,
      servicoRepo,
      profissionalRepo
    ),
    new AlterarSituacaoAgendaUseCase(agendaRepo, unidadeRepo, servicoRepo),
    new ListarVagasDisponiveisUseCase(agendaRepo),
    new ListarAgendasDetalhadasUseCase(agendaRepo),
    new ObterCatalogoBuscaVagasUseCase(servicoRepo, profissionalRepo),
    new ConsultarGradeAgendaUseCase(agendaRepo)
  );

  const agendamentosController = new AgendamentosController(
    new MarcarAgendamentoUseCase(
      agendamentoRepo,
      agendaRepo,
      unidadeRepo,
      servicoRepo,
      pacienteRepo
    ),
    new ListarMeusAgendamentosUseCase(agendamentoRepo),
    new ListarAgendamentosUnidadeUseCase(agendamentoRepo),
    new CancelarAgendamentoUseCase(agendamentoRepo)
  );

  const filaController = new FilaController(
    new RealizarCheckinUseCase(agendamentoRepo, pacienteRepo, filaRepo),
    new ChamarProximoPacienteUseCase(filaRepo),
    new RechamarPacienteUseCase(filaRepo),
    new IniciarAtendimentoFilaUseCase(filaRepo),
    new ConcluirAtendimentoFilaUseCase(filaRepo, agendamentoRepo),
    new RegistrarAusenciaFilaUseCase(filaRepo, agendamentoRepo),
    new ListarFilaOperacionalUseCase(filaRepo),
    new ConsultarMinhaPosicaoFilaUseCase(filaRepo)
  );

  const painelPublicoController = new PainelPublicoController(
    new ConsultarPainelPublicoUseCase(painelRepo)
  );

  // =========================================================================
  // Spec 01 — Unidades, Pacientes, Profissionais e Autenticação
  // =========================================================================
  router.post(
    '/unidades',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR'),
    asyncHandler(unidadesController.criar)
  );
  router.get('/unidades', asyncHandler(unidadesController.listar));
  router.patch(
    '/unidades/:id/inativar',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR'),
    asyncHandler(unidadesController.inativar)
  );

  router.post(
    '/pacientes/autocadastro',
    asyncHandler(pacientesController.autocadastro)
  );
  router.post(
    '/pacientes/assistido',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'ADMINISTRADOR'),
    asyncHandler(pacientesController.cadastroAssistido)
  );
  router.get(
    '/pacientes/me',
    autenticarJwt,
    exigirPerfis('PACIENTE'),
    asyncHandler(pacientesController.obterMe)
  );
  router.patch(
    '/pacientes/me',
    autenticarJwt,
    exigirPerfis('PACIENTE'),
    asyncHandler(pacientesController.atualizarMe)
  );
  router.get(
    '/pacientes/cpf/:cpf',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    asyncHandler(pacientesController.buscarPorCpf)
  );

  router.post(
    '/profissionais',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR'),
    asyncHandler(profissionaisController.criar)
  );
  router.get(
    '/profissionais',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR'),
    asyncHandler(profissionaisController.listar)
  );
  router.patch(
    '/profissionais/:id/inativar',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR'),
    asyncHandler(profissionaisController.inativar)
  );

  router.post('/auth/login', asyncHandler(authController.login));
  router.get('/auth/me', autenticarJwt, asyncHandler(authController.me));

  // =========================================================================
  // Spec 02 — Serviços, Agendas e Agendamentos
  // =========================================================================
  router.post(
    '/servicos',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR'),
    asyncHandler(servicosController.criar)
  );
  router.get('/servicos', asyncHandler(servicosController.listar));
  router.patch(
    '/servicos/:id/inativar',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR'),
    asyncHandler(servicosController.inativar)
  );

  router.post(
    '/agendas',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR', 'PROFISSIONAL_SAUDE'),
    asyncHandler(agendasController.criar)
  );
  router.get(
    '/agendas',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR', 'PROFISSIONAL_SAUDE', 'ATENDENTE'),
    asyncHandler(agendasController.listar)
  );
  router.get(
    '/agendas/catalogo-busca',
    asyncHandler(agendasController.catalogoBusca)
  );
  router.get(
    '/agendas/grade',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR', 'PROFISSIONAL_SAUDE', 'ATENDENTE'),
    asyncHandler(agendasController.grade)
  );
  router.get(
    '/agendas/disponiveis',
    asyncHandler(agendasController.listarDisponiveis)
  );
  router.post(
    '/agendas/:id/publicar',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR', 'PROFISSIONAL_SAUDE'),
    asyncHandler(agendasController.publicar)
  );
  router.patch(
    '/agendas/:id/situacao',
    autenticarJwt,
    exigirPerfis('ADMINISTRADOR', 'PROFISSIONAL_SAUDE'),
    asyncHandler(agendasController.alterarSituacao)
  );

  router.post(
    '/agendamentos',
    autenticarJwt,
    exigirPerfis('PACIENTE', 'ATENDENTE', 'ADMINISTRADOR'),
    asyncHandler(agendamentosController.marcar)
  );
  router.get(
    '/agendamentos/meus',
    autenticarJwt,
    exigirPerfis('PACIENTE'),
    asyncHandler(agendamentosController.meus)
  );
  router.get(
    '/agendamentos/unidade/:unidadeId',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    verificarVinculoUnidade((req) => req.params.unidadeId),
    asyncHandler(agendamentosController.porUnidade)
  );
  router.patch(
    '/agendamentos/:id/cancelar',
    autenticarJwt,
    exigirPerfis('PACIENTE', 'ATENDENTE', 'ADMINISTRADOR'),
    asyncHandler(agendamentosController.cancelar)
  );

  // =========================================================================
  // Spec 03 — Check-in, Fila Polimórfica, Atendimento e Painel Público LGPD
  // =========================================================================
  router.post(
    '/fila/check-in',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'ADMINISTRADOR'),
    asyncHandler(filaController.checkin)
  );
  router.post(
    '/fila/chamar-proximo',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    asyncHandler(filaController.chamarProximo)
  );
  router.post(
    '/fila/chamadas/:entradaId/rechamar',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    asyncHandler(filaController.rechamar)
  );
  router.patch(
    '/fila/chamadas/:entradaId/iniciar',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    asyncHandler(filaController.iniciar)
  );
  router.patch(
    '/fila/chamadas/:entradaId/concluir',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    asyncHandler(filaController.concluir)
  );
  router.patch(
    '/fila/chamadas/:entradaId/ausente',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    asyncHandler(filaController.ausente)
  );
  router.get(
    '/fila/unidade/:unidadeId',
    autenticarJwt,
    exigirPerfis('ATENDENTE', 'PROFISSIONAL_SAUDE', 'ADMINISTRADOR'),
    verificarVinculoUnidade((req) => req.params.unidadeId),
    asyncHandler(filaController.listarUnidade)
  );
  router.get(
    '/fila/minha-posicao',
    autenticarJwt,
    exigirPerfis('PACIENTE'),
    asyncHandler(filaController.minhaPosicao)
  );

  router.get(
    '/publico/painel/:unidadeId',
    asyncHandler(painelPublicoController.consultar)
  );

  return router;
}
