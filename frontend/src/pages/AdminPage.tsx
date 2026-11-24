import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Ban,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Stethoscope,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useViaCep } from '../hooks/useViaCep';
import {
  ApiError,
  extrairMensagemErro,
  profissionaisApi,
  servicosApi,
  unidadesApi,
} from '../services/api';
import type {
  CategoriaServico,
  ModoAcessoServico,
  NivelAcesso,
  ProfissionalDTO,
  ServicoDTO,
  UnidadeSaudeDTO,
} from '../types/api';
import {
  LABELS_CATEGORIA_SERVICO,
  LABELS_MODO_ACESSO,
  LABELS_NIVEL_ACESSO,
  UFS_BRASIL,
  formatarCnpj,
  maskCep,
  maskCnpj,
  maskCpf,
  maskTelefone,
  nullableTrim,
  somenteDigitos,
} from '../utils/formatters';
import { Navbar } from '../components/layout/Navbar';
import { EmptyState } from '../components/ui/EmptyState';
import { FormField, SelectInput, TextAreaInput, TextInput } from '../components/ui/FormControls';
import { Modal } from '../components/ui/Modal';
import { PillButton } from '../components/ui/PillButton';
import { TableSkeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';

type AbaAdmin = 'unidades' | 'profissionais' | 'servicos';

export function AdminPage() {
  const { usuario } = useAuth();
  const toast = useToast();

  const [aba, setAba] = useState<AbaAdmin>('unidades');
  const [unidades, setUnidades] = useState<UnidadeSaudeDTO[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalDTO[]>([]);
  const [servicos, setServicos] = useState<ServicoDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais de criação
  const [modalUnidade, setModalUnidade] = useState(false);
  const [modalProfissional, setModalProfissional] = useState(false);
  const [modalServico, setModalServico] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Modal de inativação (unidade ou profissional)
  const [alvoInativacao, setAlvoInativacao] = useState<
    | { tipo: 'unidade'; id: string; nome: string }
    | { tipo: 'profissional'; id: string; nome: string }
    | null
  >(null);
  const [motivoInativacao, setMotivoInativacao] = useState('');
  const [inativando, setInativando] = useState(false);

  // Form Unidade
  const [uNome, setUNome] = useState('');
  const [uCnes, setUCnes] = useState('');
  const [uCnpj, setUCnpj] = useState('');
  const [uTelefone, setUTelefone] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uCep, setUCep] = useState('');
  const [uLogradouro, setULogradouro] = useState('');
  const [uNumero, setUNumero] = useState('');
  const [uComplemento, setUComplemento] = useState('');
  const [uBairro, setUBairro] = useState('');
  const [uMunicipio, setUMunicipio] = useState('Maceió');
  const [uEstado, setUEstado] = useState('AL');

  const {
    buscandoCep: buscandoCepUnidade,
    erroCep: erroCepUnidade,
    buscarCep: buscarCepUnidade,
    limparEstadoCep: limparEstadoCepUnidade,
  } = useViaCep({
    onSuccess: (dados) => {
      if (dados.logradouro) setULogradouro(dados.logradouro);
      if (dados.bairro) setUBairro(dados.bairro);
      if (dados.municipio) setUMunicipio(dados.municipio);
      const ufValida = UFS_BRASIL.find((uf) => uf === dados.estado);
      if (ufValida) setUEstado(ufValida);
    },
  });

  // Form Profissional
  const [pCpf, setPCpf] = useState('');
  const [pNome, setPNome] = useState('');
  const [pNomeSocial, setPNomeSocial] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pCelular, setPCelular] = useState('');
  const [pNivelAcesso, setPNivelAcesso] = useState<NivelAcesso>('ATENDENTE');
  const [pConselho, setPConselho] = useState('');
  const [pRegistro, setPRegistro] = useState('');
  const [pUfRegistro, setPUfRegistro] = useState('AL');
  const [pEspecialidadesTexto, setPEspecialidadesTexto] = useState('');
  const [pUnidades, setPUnidades] = useState<string[]>([]);
  const [pSenha, setPSenha] = useState('');
  const [pMostrarSenha, setPMostrarSenha] = useState(false);

  // Form Serviço
  const [sNome, setSNome] = useState('');
  const [sCategoria, setSCategoria] = useState<CategoriaServico>('CONSULTA');
  const [sEspecialidade, setSEspecialidade] = useState('');
  const [sModoAcesso, setSModoAcesso] = useState<ModoAcessoServico>('DIRETO');
  const [sPreparo, setSPreparo] = useState('');

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, pRes, sRes] = await Promise.all([
        unidadesApi.listar(),
        profissionaisApi.listar(),
        servicosApi.listar({ incluirInativos: true }),
      ]);
      setUnidades(uRes.unidades);
      setProfissionais(pRes.profissionais);
      setServicos(sRes.servicos);
    } catch (err) {
      toast.error('Erro ao carregar dados administrativos', extrairMensagemErro(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

  const unidadesAtivas = useMemo(
    () => unidades.filter((u) => u.status === 'ATIVA'),
    [unidades]
  );

  const resetFormUnidade = () => {
    setUNome('');
    setUCnes('');
    setUCnpj('');
    setUTelefone('');
    setUEmail('');
    setUCep('');
    setULogradouro('');
    setUNumero('');
    setUComplemento('');
    setUBairro('');
    setUMunicipio('Maceió');
    setUEstado('AL');
    limparEstadoCepUnidade();
  };

  const handleCriarUnidade = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await unidadesApi.criar({
        cnes: nullableTrim(uCnes ? somenteDigitos(uCnes) : ''),
        cnpj: somenteDigitos(uCnpj),
        nome: uNome.trim(),
        telefone: nullableTrim(uTelefone),
        email: nullableTrim(uEmail),
        cep: somenteDigitos(uCep),
        logradouro: uLogradouro.trim(),
        numero: uNumero.trim(),
        complemento: nullableTrim(uComplemento),
        bairro: uBairro.trim(),
        municipio: uMunicipio.trim(),
        estado: uEstado.trim().toUpperCase(),
        fusoHorario: 'America/Maceio',
      });
      toast.success('Unidade cadastrada com sucesso');
      setModalUnidade(false);
      resetFormUnidade();
      await carregarTudo();
    } catch (err) {
      if (err instanceof ApiError && err.detalhes?.length) {
        toast.error('Dados inválidos', err.detalhes[0].mensagem);
      } else {
        toast.error('Erro ao cadastrar unidade', extrairMensagemErro(err));
      }
    } finally {
      setSalvando(false);
    }
  };

  const resetFormProfissional = () => {
    setPCpf('');
    setPNome('');
    setPNomeSocial('');
    setPEmail('');
    setPCelular('');
    setPNivelAcesso('ATENDENTE');
    setPConselho('');
    setPRegistro('');
    setPUfRegistro('AL');
    setPEspecialidadesTexto('');
    setPUnidades(unidadesAtivas[0] ? [unidadesAtivas[0].id] : []);
    setPSenha('');
  };

  const handleCriarProfissional = async (e: FormEvent) => {
    e.preventDefault();
    if (pUnidades.length === 0) {
      toast.warning('Unidade obrigatória', 'Vincule ao menos uma unidade ativa.');
      return;
    }

    const especialidades = pEspecialidadesTexto
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSalvando(true);
    try {
      await profissionaisApi.criar({
        cpf: somenteDigitos(pCpf),
        nomeCompleto: pNome.trim(),
        nomeSocial: nullableTrim(pNomeSocial),
        conselhoProfissional: nullableTrim(pConselho),
        numeroRegistro: nullableTrim(pRegistro),
        ufRegistro:
          pNivelAcesso === 'PROFISSIONAL_SAUDE' || pRegistro.trim()
            ? nullableTrim(pUfRegistro)
            : null,
        email: pEmail.trim(),
        celular: nullableTrim(pCelular ? somenteDigitos(pCelular) : ''),
        unidadesVinculadas: pUnidades,
        especialidades,
        nivelAcesso: pNivelAcesso,
        senha: pSenha,
      });
      toast.success('Profissional cadastrado com sucesso');
      setModalProfissional(false);
      resetFormProfissional();
      await carregarTudo();
    } catch (err) {
      toast.error('Erro ao cadastrar profissional', extrairMensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const resetFormServico = () => {
    setSNome('');
    setSCategoria('CONSULTA');
    setSEspecialidade('');
    setSModoAcesso('DIRETO');
    setSPreparo('');
  };

  const handleCriarServico = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await servicosApi.criar({
        nome: sNome.trim(),
        categoria: sCategoria,
        especialidade: sEspecialidade.trim(),
        modoAcesso: sModoAcesso,
        orientacoesPreparo: nullableTrim(sPreparo),
      });
      toast.success('Serviço cadastrado com sucesso');
      setModalServico(false);
      resetFormServico();
      await carregarTudo();
    } catch (err) {
      toast.error('Erro ao cadastrar serviço', extrairMensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const handleInativarComMotivo = async (e: FormEvent) => {
    e.preventDefault();
    if (!alvoInativacao) return;
    if (motivoInativacao.trim().length < 5) {
      toast.warning('Motivo obrigatório', 'Informe pelo menos 5 caracteres.');
      return;
    }

    setInativando(true);
    try {
      if (alvoInativacao.tipo === 'unidade') {
        await unidadesApi.inativar(alvoInativacao.id, motivoInativacao.trim());
        toast.success('Unidade inativada');
      } else {
        await profissionaisApi.inativar(alvoInativacao.id, motivoInativacao.trim());
        toast.success('Profissional inativado');
      }
      setAlvoInativacao(null);
      setMotivoInativacao('');
      await carregarTudo();
    } catch (err) {
      toast.error('Erro ao inativar', extrairMensagemErro(err));
    } finally {
      setInativando(false);
    }
  };

  const handleInativarServico = async (s: ServicoDTO) => {
    try {
      await servicosApi.inativar(s.id);
      toast.success(`Serviço "${s.nome}" inativado`);
      await carregarTudo();
    } catch (err) {
      toast.error('Erro ao inativar serviço', extrairMensagemErro(err));
    }
  };

  const toggleUnidadeProf = (id: string) => {
    setPUnidades((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const nomeUnidade = (id: string) =>
    unidades.find((u) => u.id === id)?.nome ?? id.slice(0, 8);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-[#0F172A] pb-16">
      <Navbar variant="portal" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Cabeçalho + KPIs */}
        <section className="rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] p-5 sm:p-8 shadow-soft space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <StatusBadge tone="info">Gestão da rede · Administrador</StatusBadge>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A]">
                Painel administrativo
              </h1>
              <p className="mt-1 text-xs text-[#64748B]">
                Gerencie as unidades de saúde, os profissionais vinculados e os
                serviços oferecidos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/operacao"
                className="inline-flex items-center gap-2 rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-4 py-2 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE] transition-colors"
              >
                <Activity className="h-3.5 w-3.5" />
                Ir para operação e agendas
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E2E8F0]">
            <div className="rounded-2xl bg-[#F8FAFC] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#64748B]">Unidades ativas</p>
                <p className="kpi-number text-3xl text-[#0F172A] mt-1">
                  {unidadesAtivas.length}
                  <span className="text-sm font-normal text-[#64748B]">
                    {' '}
                    / {unidades.length}
                  </span>
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
                <Building2 className="h-5 w-5" />
              </span>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#64748B]">Profissionais ativos</p>
                <p className="kpi-number text-3xl text-[#0F172A] mt-1">
                  {profissionais.filter((p) => p.status === 'ATIVO').length}
                  <span className="text-sm font-normal text-[#64748B]">
                    {' '}
                    / {profissionais.length}
                  </span>
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
                <UserCog className="h-5 w-5" />
              </span>
            </div>

            <div className="rounded-2xl bg-[#F8FAFC] p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#64748B]">Serviços ativos</p>
                <p className="kpi-number text-3xl text-[#0F172A] mt-1">
                  {servicos.filter((s) => s.status === 'ATIVO').length}
                  <span className="text-sm font-normal text-[#64748B]">
                    {' '}
                    / {servicos.length}
                  </span>
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FB] text-[#1E6BFF]">
                <Stethoscope className="h-5 w-5" />
              </span>
            </div>
          </div>
        </section>

        {/* Tabs + Botão Novo */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:inline-flex w-full sm:w-auto gap-1.5 rounded-2xl sm:rounded-full bg-white border border-[#E2E8F0] p-1.5 shadow-pill">
            {(
              [
                { id: 'unidades', label: 'Unidades de saúde', icon: Building2 },
                { id: 'profissionais', label: 'Profissionais', icon: UserCog },
                { id: 'servicos', label: 'Serviços', icon: Stethoscope },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const ativo = aba === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAba(item.id)}
                  className={`w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl sm:rounded-full px-4 py-2.5 sm:py-2 text-xs font-semibold transition-colors ${
                    ativo
                      ? 'bg-[#1E6BFF] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {aba === 'unidades' && (
            <PillButton
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                resetFormUnidade();
                setModalUnidade(true);
              }}
              className="w-full sm:w-auto"
            >
              Nova unidade
            </PillButton>
          )}
          {aba === 'profissionais' && (
            <PillButton
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                resetFormProfissional();
                setModalProfissional(true);
              }}
              className="w-full sm:w-auto"
            >
              Novo profissional
            </PillButton>
          )}
          {aba === 'servicos' && (
            <PillButton
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                resetFormServico();
                setModalServico(true);
              }}
              className="w-full sm:w-auto"
            >
              Novo serviço
            </PillButton>
          )}
        </div>

        {/* Lista */}
        <section className="rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] shadow-soft overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : aba === 'unidades' ? (
            unidades.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title="Nenhuma unidade cadastrada"
                description="Cadastre a primeira unidade de saúde da rede."
                className="border-none"
              />
            ) : (
              <>
                <div className="md:hidden divide-y divide-[#E2E8F0]">
                  {unidades.map((u) => (
                    <div key={u.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-[#0F172A] break-words">
                            {u.nome}
                          </p>
                          <p className="text-xs text-[#64748B] break-words">
                            {u.email || u.telefone || 'Sem contato informado'}
                          </p>
                        </div>
                        <StatusBadge
                          tone={u.status === 'ATIVA' ? 'success' : 'danger'}
                          dot
                        >
                          {u.status}
                        </StatusBadge>
                      </div>

                      <div className="text-xs text-[#64748B] space-y-1">
                        <p>
                          CNES: {u.cnes || '—'} · CNPJ: {formatarCnpj(u.cnpj)}
                        </p>
                        <p>
                          {u.endereco.bairro}, {u.endereco.municipio}/
                          {u.endereco.estado}
                        </p>
                        {u.motivoInativacao && (
                          <p className="text-[11px] text-red-600 break-words">
                            {u.motivoInativacao}
                          </p>
                        )}
                      </div>

                      {u.status === 'ATIVA' && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAlvoInativacao({
                                tipo: 'unidade',
                                id: u.id,
                                nome: u.nome,
                              });
                              setMotivoInativacao('');
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Inativar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B]">
                        <th className="py-3.5 px-6">Unidade</th>
                        <th className="py-3.5 px-4">CNES / CNPJ</th>
                        <th className="py-3.5 px-4">Localização</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/70 text-sm">
                      {unidades.map((u) => (
                        <tr key={u.id} className="hover:bg-[#F4F7FC]/70">
                          <td className="py-4 px-6">
                            <p className="font-medium text-[#0F172A]">{u.nome}</p>
                            <p className="text-xs text-[#64748B]">
                              {u.email || u.telefone || 'Sem contato informado'}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-xs text-[#64748B]">
                            <p>CNES: {u.cnes || '—'}</p>
                            <p>CNPJ: {formatarCnpj(u.cnpj)}</p>
                          </td>
                          <td className="py-4 px-4 text-xs text-[#64748B]">
                            {u.endereco.bairro}, {u.endereco.municipio}/
                            {u.endereco.estado}
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge
                              tone={u.status === 'ATIVA' ? 'success' : 'danger'}
                              dot
                            >
                              {u.status}
                            </StatusBadge>
                            {u.motivoInativacao && (
                              <p className="mt-1 text-[11px] text-red-600 max-w-xs">
                                {u.motivoInativacao}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {u.status === 'ATIVA' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAlvoInativacao({
                                    tipo: 'unidade',
                                    id: u.id,
                                    nome: u.nome,
                                  });
                                  setMotivoInativacao('');
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Inativar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          ) : aba === 'profissionais' ? (
            profissionais.length === 0 ? (
              <EmptyState
                icon={<UserCog className="h-6 w-6" />}
                title="Nenhum profissional cadastrado"
                description="Cadastre atendentes, profissionais de saúde e administradores."
                className="border-none"
              />
            ) : (
              <>
                <div className="md:hidden divide-y divide-[#E2E8F0]">
                  {profissionais.map((p) => {
                    const ehProprioUsuario = usuario?.id === p.id;
                    return (
                      <div key={p.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-[#0F172A] break-words">
                              {p.nomeExibicao}
                            </p>
                            <p className="text-xs text-[#64748B] break-words">
                              {p.cpfFormatado} · {p.email}
                            </p>
                          </div>
                          <StatusBadge
                            tone={p.status === 'ATIVO' ? 'success' : 'danger'}
                            dot
                          >
                            {p.status}
                          </StatusBadge>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <StatusBadge tone="info">
                            {LABELS_NIVEL_ACESSO[p.nivelAcesso]}
                          </StatusBadge>
                          {p.conselhoProfissional && (
                            <span className="text-[#64748B]">
                              {p.conselhoProfissional} {p.numeroRegistro}/{p.ufRegistro}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {p.unidadesVinculadas.map((uid) => (
                            <span
                              key={uid}
                              className="rounded-full bg-[#EFF4FB] px-2.5 py-0.5 text-[11px] text-[#1E6BFF]"
                            >
                              {nomeUnidade(uid)}
                            </span>
                          ))}
                        </div>

                        {p.status === 'ATIVO' && !ehProprioUsuario && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAlvoInativacao({
                                  tipo: 'profissional',
                                  id: p.id,
                                  nome: p.nomeExibicao,
                                });
                                setMotivoInativacao('');
                              }}
                              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Inativar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B]">
                        <th className="py-3.5 px-6">Profissional</th>
                        <th className="py-3.5 px-4">Perfil / Conselho</th>
                        <th className="py-3.5 px-4">Unidades vinculadas</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/70 text-sm">
                      {profissionais.map((p) => {
                        const ehProprioUsuario = usuario?.id === p.id;
                        return (
                          <tr key={p.id} className="hover:bg-[#F4F7FC]/70">
                            <td className="py-4 px-6">
                              <p className="font-medium text-[#0F172A]">
                                {p.nomeExibicao}
                              </p>
                              <p className="text-xs text-[#64748B]">
                                {p.cpfFormatado} · {p.email}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-xs">
                              <StatusBadge tone="info">
                                {LABELS_NIVEL_ACESSO[p.nivelAcesso]}
                              </StatusBadge>
                              {p.conselhoProfissional && (
                                <p className="mt-1 text-[#64748B]">
                                  {p.conselhoProfissional} {p.numeroRegistro}/
                                  {p.ufRegistro}
                                </p>
                              )}
                            </td>
                            <td className="py-4 px-4 text-xs text-[#64748B]">
                              <div className="flex flex-wrap gap-1">
                                {p.unidadesVinculadas.map((uid) => (
                                  <span
                                    key={uid}
                                    className="rounded-full bg-[#EFF4FB] px-2.5 py-0.5 text-[11px] text-[#1E6BFF]"
                                  >
                                    {nomeUnidade(uid)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <StatusBadge
                                tone={p.status === 'ATIVO' ? 'success' : 'danger'}
                                dot
                              >
                                {p.status}
                              </StatusBadge>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {p.status === 'ATIVO' && !ehProprioUsuario && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAlvoInativacao({
                                      tipo: 'profissional',
                                      id: p.id,
                                      nome: p.nomeExibicao,
                                    });
                                    setMotivoInativacao('');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Inativar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          ) : servicos.length === 0 ? (
            <EmptyState
              icon={<Stethoscope className="h-6 w-6" />}
              title="Nenhum serviço cadastrado"
              description="Cadastre consultas, procedimentos e cirurgias ofertados."
              className="border-none"
            />
          ) : (
            <>
              <div className="md:hidden divide-y divide-[#E2E8F0]">
                {servicos.map((s) => (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#0F172A] break-words">
                          {s.nome}
                        </p>
                        <p className="text-xs text-[#64748B]">{s.especialidade}</p>
                      </div>
                      <StatusBadge
                        tone={s.status === 'ATIVO' ? 'success' : 'danger'}
                        dot
                      >
                        {s.status}
                      </StatusBadge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                      <StatusBadge tone="info">
                        {LABELS_CATEGORIA_SERVICO[s.categoria]}
                      </StatusBadge>
                      <span>{LABELS_MODO_ACESSO[s.modoAcesso]}</span>
                    </div>

                    {s.orientacoesPreparo && (
                      <p className="text-xs text-[#64748B] line-clamp-2">
                        {s.orientacoesPreparo}
                      </p>
                    )}

                    {s.status === 'ATIVO' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => void handleInativarServico(s)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Inativar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B]">
                      <th className="py-3.5 px-6">Serviço</th>
                      <th className="py-3.5 px-4">Categoria e especialidade</th>
                      <th className="py-3.5 px-4">Modo de acesso</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]/70 text-sm">
                    {servicos.map((s) => (
                      <tr key={s.id} className="hover:bg-[#F4F7FC]/70">
                        <td className="py-4 px-6">
                          <p className="font-medium text-[#0F172A]">{s.nome}</p>
                          {s.orientacoesPreparo && (
                            <p className="text-xs text-[#64748B] line-clamp-1 max-w-md">
                              {s.orientacoesPreparo}
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          <StatusBadge tone="info">
                            {LABELS_CATEGORIA_SERVICO[s.categoria]}
                          </StatusBadge>
                          <p className="mt-1 text-[#64748B]">{s.especialidade}</p>
                        </td>
                        <td className="py-4 px-4 text-xs text-[#64748B]">
                          {LABELS_MODO_ACESSO[s.modoAcesso]}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge
                            tone={s.status === 'ATIVO' ? 'success' : 'danger'}
                            dot
                          >
                            {s.status}
                          </StatusBadge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {s.status === 'ATIVO' && (
                            <button
                              type="button"
                              onClick={() => void handleInativarServico(s)}
                              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Inativar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>

      {/* Modal Nova Unidade */}
      <Modal
        open={modalUnidade}
        onClose={() => setModalUnidade(false)}
        title="Nova unidade de saúde"
        size="lg"
      >
        <form onSubmit={handleCriarUnidade} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Nome da unidade"
              htmlFor="u-nome"
              required
              className="sm:col-span-2"
            >
              <TextInput
                id="u-nome"
                value={uNome}
                onChange={(e) => setUNome(e.target.value)}
                placeholder="Ex.: UPA Trapiche da Barra"
              />
            </FormField>

            <FormField label="CNES (7 dígitos, opcional)" htmlFor="u-cnes">
              <TextInput
                id="u-cnes"
                maxLength={7}
                value={uCnes}
                onChange={(e) => setUCnes(somenteDigitos(e.target.value).slice(0, 7))}
                placeholder="2001002"
              />
            </FormField>

            <FormField label="CNPJ" htmlFor="u-cnpj" required>
              <TextInput
                id="u-cnpj"
                value={uCnpj}
                onChange={(e) => setUCnpj(maskCnpj(e.target.value))}
                placeholder="00.000.000/0001-00"
              />
            </FormField>

            <FormField label="Telefone" htmlFor="u-tel">
              <TextInput
                id="u-tel"
                value={uTelefone}
                onChange={(e) => setUTelefone(maskTelefone(e.target.value))}
                placeholder="(82) 3312-0000"
              />
            </FormField>

            <FormField label="E-mail" htmlFor="u-email">
              <TextInput
                id="u-email"
                type="email"
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                placeholder="unidade@saude.gov.br"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 pt-2 border-t border-[#E2E8F0]">
            <FormField
              label="CEP"
              htmlFor="u-cep"
              required
              hint={
                buscandoCepUnidade
                  ? 'Buscando endereço pelo CEP...'
                  : 'Preenchimento automático ao digitar 8 dígitos.'
              }
              error={erroCepUnidade || undefined}
              className="sm:col-span-2"
            >
              <div className="relative">
                <TextInput
                  id="u-cep"
                  inputMode="numeric"
                  value={uCep}
                  onChange={(e) => {
                    const v = maskCep(e.target.value);
                    setUCep(v);
                    void buscarCepUnidade(v);
                  }}
                  onBlur={() => {
                    if (somenteDigitos(uCep).length === 8) {
                      void buscarCepUnidade(uCep);
                    }
                  }}
                  placeholder="57020-050"
                  hasError={Boolean(erroCepUnidade)}
                  className={buscandoCepUnidade ? 'pr-10' : ''}
                />
                {buscandoCepUnidade && (
                  <Loader2
                    aria-label="Consultando CEP"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#1E6BFF]"
                  />
                )}
              </div>
            </FormField>
            <FormField
              label="Logradouro"
              htmlFor="u-log"
              required
              className="sm:col-span-4"
            >
              <TextInput
                id="u-log"
                value={uLogradouro}
                onChange={(e) => setULogradouro(e.target.value)}
              />
            </FormField>
            <FormField label="Número" htmlFor="u-num" required className="sm:col-span-2">
              <TextInput
                id="u-num"
                value={uNumero}
                onChange={(e) => setUNumero(e.target.value)}
              />
            </FormField>
            <FormField label="Complemento" htmlFor="u-comp" className="sm:col-span-4">
              <TextInput
                id="u-comp"
                value={uComplemento}
                onChange={(e) => setUComplemento(e.target.value)}
              />
            </FormField>
            <FormField label="Bairro" htmlFor="u-bairro" required className="sm:col-span-2">
              <TextInput
                id="u-bairro"
                value={uBairro}
                onChange={(e) => setUBairro(e.target.value)}
              />
            </FormField>
            <FormField
              label="Município"
              htmlFor="u-mun"
              required
              className="sm:col-span-3"
            >
              <TextInput
                id="u-mun"
                value={uMunicipio}
                onChange={(e) => setUMunicipio(e.target.value)}
              />
            </FormField>
            <FormField label="UF" htmlFor="u-uf" required className="sm:col-span-1">
              <SelectInput
                id="u-uf"
                value={uEstado}
                onChange={(e) => setUEstado(e.target.value)}
              >
                {UFS_BRASIL.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setModalUnidade(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </PillButton>
            <PillButton
              type="submit"
              loading={salvando}
              className="w-full sm:w-auto"
            >
              Cadastrar unidade
            </PillButton>
          </div>
        </form>
      </Modal>

      {/* Modal Novo Profissional */}
      <Modal
        open={modalProfissional}
        onClose={() => setModalProfissional(false)}
        title="Novo profissional ou colaborador"
        size="lg"
      >
        <form onSubmit={handleCriarProfissional} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nome completo" htmlFor="pr-nome" required>
              <TextInput
                id="pr-nome"
                value={pNome}
                onChange={(e) => setPNome(e.target.value)}
              />
            </FormField>

            <FormField label="Nome social" htmlFor="pr-social">
              <TextInput
                id="pr-social"
                value={pNomeSocial}
                onChange={(e) => setPNomeSocial(e.target.value)}
              />
            </FormField>

            <FormField label="CPF" htmlFor="pr-cpf" required>
              <TextInput
                id="pr-cpf"
                value={pCpf}
                onChange={(e) => setPCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
              />
            </FormField>

            <FormField label="Nível de acesso" htmlFor="pr-nivel" required>
              <SelectInput
                id="pr-nivel"
                value={pNivelAcesso}
                onChange={(e) => setPNivelAcesso(e.target.value as NivelAcesso)}
              >
                <option value="ATENDENTE">Atendente</option>
                <option value="PROFISSIONAL_SAUDE">Profissional de saúde</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </SelectInput>
            </FormField>

            <FormField label="E-mail" htmlFor="pr-email" required>
              <TextInput
                id="pr-email"
                type="email"
                value={pEmail}
                onChange={(e) => setPEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Celular" htmlFor="pr-cel">
              <TextInput
                id="pr-cel"
                value={pCelular}
                onChange={(e) => setPCelular(maskTelefone(e.target.value))}
              />
            </FormField>
          </div>

          {pNivelAcesso === 'PROFISSIONAL_SAUDE' && (
            <div className="rounded-2xl bg-[#F4F7FC] border border-[#DBEAFE] p-4 space-y-3">
              <p className="text-xs font-semibold text-[#1E6BFF]">
                Registro profissional (obrigatório para profissional de saúde)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="Conselho" htmlFor="pr-conselho" required>
                  <TextInput
                    id="pr-conselho"
                    value={pConselho}
                    onChange={(e) => setPConselho(e.target.value)}
                    placeholder="CRM, COREN..."
                  />
                </FormField>
                <FormField label="Nº Registro" htmlFor="pr-reg" required>
                  <TextInput
                    id="pr-reg"
                    value={pRegistro}
                    onChange={(e) => setPRegistro(e.target.value)}
                    placeholder="12345"
                  />
                </FormField>
                <FormField label="UF Registro" htmlFor="pr-uf" required>
                  <SelectInput
                    id="pr-uf"
                    value={pUfRegistro}
                    onChange={(e) => setPUfRegistro(e.target.value)}
                  >
                    {UFS_BRASIL.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              </div>
              <FormField
                label="Especialidades (separadas por vírgula)"
                htmlFor="pr-esp"
                required
              >
                <TextInput
                  id="pr-esp"
                  value={pEspecialidadesTexto}
                  onChange={(e) => setPEspecialidadesTexto(e.target.value)}
                  placeholder="Clínica Médica, Pediatria"
                />
              </FormField>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#0F172A]">
              Unidades ativas vinculadas <span className="text-[#1E6BFF]">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {unidadesAtivas.map((u) => {
                const marcado = pUnidades.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUnidadeProf(u.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                      marcado
                        ? 'bg-[#1E6BFF] text-white border-[#1E6BFF]'
                        : 'bg-white text-[#64748B] border-[#E2E8F0]'
                    }`}
                  >
                    {u.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <FormField
            label="Senha de acesso"
            htmlFor="pr-senha"
            required
            hint="8 a 64 caracteres, com letras e números, diferente do CPF."
          >
            <div className="relative">
              <TextInput
                id="pr-senha"
                type={pMostrarSenha ? 'text' : 'password'}
                value={pSenha}
                onChange={(e) => setPSenha(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setPMostrarSenha((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
              >
                {pMostrarSenha ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setModalProfissional(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </PillButton>
            <PillButton
              type="submit"
              loading={salvando}
              className="w-full sm:w-auto"
            >
              Cadastrar profissional
            </PillButton>
          </div>
        </form>
      </Modal>

      {/* Modal Novo Serviço */}
      <Modal
        open={modalServico}
        onClose={() => setModalServico(false)}
        title="Novo serviço assistencial"
      >
        <form onSubmit={handleCriarServico} className="space-y-4">
          <FormField label="Nome do serviço" htmlFor="s-nome" required>
            <TextInput
              id="s-nome"
              value={sNome}
              onChange={(e) => setSNome(e.target.value)}
              placeholder="Ex.: Consulta em Cardiologia"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Categoria" htmlFor="s-cat" required>
              <SelectInput
                id="s-cat"
                value={sCategoria}
                onChange={(e) => setSCategoria(e.target.value as CategoriaServico)}
              >
                <option value="CONSULTA">Consulta</option>
                <option value="PROCEDIMENTO">Procedimento</option>
                <option value="CIRURGIA">Cirurgia</option>
              </SelectInput>
            </FormField>

            <FormField label="Modo de acesso" htmlFor="s-modo">
              <SelectInput
                id="s-modo"
                value={sModoAcesso}
                onChange={(e) =>
                  setSModoAcesso(e.target.value as ModoAcessoServico)
                }
              >
                <option value="DIRETO">Direto</option>
                <option value="REGULADO">Regulado</option>
              </SelectInput>
            </FormField>
          </div>

          <FormField label="Especialidade" htmlFor="s-esp" required>
            <TextInput
              id="s-esp"
              value={sEspecialidade}
              onChange={(e) => setSEspecialidade(e.target.value)}
              placeholder="Ex.: Cardiologia"
            />
          </FormField>

          <FormField label="Orientações de preparo (opcional)" htmlFor="s-prep">
            <TextAreaInput
              id="s-prep"
              value={sPreparo}
              onChange={(e) => setSPreparo(e.target.value)}
              placeholder="Ex.: trazer exames anteriores e cartão do SUS"
            />
          </FormField>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setModalServico(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </PillButton>
            <PillButton
              type="submit"
              loading={salvando}
              className="w-full sm:w-auto"
            >
              Cadastrar serviço
            </PillButton>
          </div>
        </form>
      </Modal>

      {/* Modal Inativação com Motivo */}
      <Modal
        open={Boolean(alvoInativacao)}
        onClose={() => setAlvoInativacao(null)}
        title={
          alvoInativacao?.tipo === 'unidade'
            ? 'Inativar unidade de saúde'
            : 'Inativar Profissional'
        }
        subtitle={alvoInativacao?.nome}
      >
        <form onSubmit={handleInativarComMotivo} className="space-y-4">
          <FormField
            label="Motivo da inativação"
            htmlFor="adm-motivo-inat"
            required
            hint="Obrigatório, com pelo menos 5 caracteres. O cadastro não é apagado, só inativado."
          >
            <TextAreaInput
              id="adm-motivo-inat"
              value={motivoInativacao}
              onChange={(e) => setMotivoInativacao(e.target.value)}
              placeholder="Descreva o motivo da inativação"
            />
          </FormField>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
            <PillButton
              variant="ghost"
              hideIconCircle
              onClick={() => setAlvoInativacao(null)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </PillButton>
            <PillButton
              type="submit"
              variant="danger"
              loading={inativando}
              className="w-full sm:w-auto"
            >
              Confirmar Inativação
            </PillButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
