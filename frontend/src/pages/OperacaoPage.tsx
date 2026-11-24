import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Monitor,
  Radio,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { extrairMensagemErro, unidadesApi } from '../services/api';
import { isProfissional, type UnidadeSaudeDTO } from '../types/api';
import { LABELS_NIVEL_ACESSO } from '../utils/formatters';
import { Navbar } from '../components/layout/Navbar';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AgendasTab } from './operacao/AgendasTab';
import { FilaTab } from './operacao/FilaTab';
import { RecepcaoTab } from './operacao/RecepcaoTab';

type TabOperacao = 'fila' | 'recepcao' | 'agendas';

export function OperacaoPage() {
  const { usuario, tipoUsuario, perfil } = useAuth();
  const toast = useToast();

  const [unidades, setUnidades] = useState<UnidadeSaudeDTO[]>([]);
  const [unidadeId, setUnidadeId] = useState('');
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [tab, setTab] = useState<TabOperacao>('fila');

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setLoadingUnidades(true);
      try {
        const res = await unidadesApi.listar({ status: 'ATIVA' });
        if (!ativo) return;

        let permitidas = res.unidades;
        if (
          isProfissional(usuario, tipoUsuario) &&
          usuario.nivelAcesso !== 'ADMINISTRADOR'
        ) {
          permitidas = res.unidades.filter((u) =>
            usuario.unidadesVinculadas.includes(u.id)
          );
        }

        setUnidades(permitidas);
        if (permitidas.length > 0) {
          setUnidadeId((prev) =>
            prev && permitidas.some((u) => u.id === prev)
              ? prev
              : permitidas[0].id
          );
        }
      } catch (err) {
        toast.error('Erro ao listar unidades', extrairMensagemErro(err));
      } finally {
        if (ativo) setLoadingUnidades(false);
      }
    };
    void carregar();
    return () => {
      ativo = false;
    };
  }, [usuario, tipoUsuario, toast]);

  const tabs = useMemo(() => {
    const base: Array<{ id: TabOperacao; label: string; icon: typeof Radio }> = [
      { id: 'fila', label: 'Controle da fila', icon: Radio },
      ...(perfil !== 'PROFISSIONAL_SAUDE'
        ? [{ id: 'recepcao' as const, label: 'Recepção e check-in', icon: ClipboardCheck }]
        : []),
      { id: 'agendas', label: 'Agendas e agendamentos', icon: CalendarDays },
    ];
    return base;
  }, [perfil]);

  const unidadeAtual = useMemo(
    () => unidades.find((u) => u.id === unidadeId) ?? null,
    [unidades, unidadeId]
  );

  if (!perfil || perfil === 'PACIENTE') {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-[#0F172A] pb-16">
      <Navbar variant="portal" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Cabeçalho Operacional */}
        <section className="rounded-[24px] sm:rounded-[28px] bg-white border border-[#E2E8F0] p-5 sm:p-6 shadow-soft space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="info" dot>
                  {LABELS_NIVEL_ACESSO[perfil]}
                </StatusBadge>
                {unidadeAtual && (
                  <StatusBadge tone="success">{unidadeAtual.nome}</StatusBadge>
                )}
              </div>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-tight text-[#0F172A]">
                Painel operacional
              </h1>
              <p className="mt-1 text-xs text-[#64748B]">
                Operador: <strong>{usuario?.nomeExibicao}</strong>. Gerencie a recepção, o check-in, as chamadas e as agendas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto min-w-0">
              {/* Seletor de unidade vinculada */}
              <div className="w-full sm:w-auto min-w-0 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-[#1E6BFF]" />
                <select
                  aria-label="Unidade de atuação"
                  disabled={loadingUnidades || unidades.length === 0}
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-xs font-semibold text-[#0F172A] focus:outline-none sm:max-w-[240px]"
                >
                  {unidades.length === 0 ? (
                    <option value="">Sem unidades vinculadas</option>
                  ) : (
                    unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {unidadeId && (
                <Link
                  to={`/painel/${unidadeId}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#EFF4FB] border border-[#DBEAFE] px-4 py-2 text-xs font-semibold text-[#1E6BFF] hover:bg-[#DBEAFE] transition-colors"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Painel TV
                </Link>
              )}

              {(perfil === 'PROFISSIONAL_SAUDE' || perfil === 'ADMINISTRADOR') && (
                <Link
                  to="/medico"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F4F7FC] transition-colors"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-[#1E6BFF]" />
                  Portal Médico
                </Link>
              )}

              {perfil === 'ADMINISTRADOR' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F4F7FC] transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-[#1E6BFF]" />
                  Painel administrativo
                </Link>
              )}
            </div>
          </div>

          {/* Abas */}
          <div className="grid grid-cols-1 sm:inline-flex w-full sm:w-fit items-center gap-1.5 rounded-2xl sm:rounded-full bg-[#EFF4FB] p-1.5 border border-[#DBEAFE]">
            {tabs.map((item) => {
              const Icon = item.icon;
              const ativo = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl sm:rounded-full px-4 py-2.5 sm:py-2 text-xs font-semibold transition-all ${
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
        </section>

        {/* Conteúdo da aba */}
        {loadingUnidades ? (
          <Skeleton className="h-72 rounded-[28px]" />
        ) : !unidadeId ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="Nenhuma unidade de saúde disponível para sua conta"
            description="Solicite ao administrador a vinculação do seu cadastro a uma unidade ativa."
          />
        ) : (
          <>
            {tab === 'fila' && <FilaTab unidadeId={unidadeId} />}
            {tab === 'recepcao' && (
              <RecepcaoTab unidadeId={unidadeId} perfil={perfil} />
            )}
            {tab === 'agendas' && (
              <AgendasTab unidadeId={unidadeId} perfil={perfil} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
