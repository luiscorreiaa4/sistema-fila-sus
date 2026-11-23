import type {
  CategoriaServico,
  CriterioPrioridade,
  EstadoChamada,
  GrupoAtendimento,
  ModoAcessoServico,
  NivelAcesso,
  OrigemMarcacao,
  PossuiDeficiencia,
  SituacaoAgenda,
  SituacaoCns,
  SituacaoFila,
  StatusAgendamento,
  TipoDeficiencia,
} from '../types/api';

// ============================================================================
// Máscaras e normalização
// ============================================================================

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function maskCpf(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCnpj(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 14);
  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCep(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 8);
  return digitos.replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCns(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 15);
  return digitos
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2');
}

export function maskTelefone(valor: string): string {
  const digitos = somenteDigitos(valor).slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digitos
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function nullableTrim(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : null;
}

// ============================================================================
// Formatação de exibição
// ============================================================================

export function formatarCpf(cpf: string): string {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarCnpj(cnpj: string): string {
  const d = somenteDigitos(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatarCep(cep: string): string {
  const d = somenteDigitos(cep);
  if (d.length !== 8) return cep;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatarCns(cns: string): string {
  const d = somenteDigitos(cns);
  if (d.length !== 15) return cns;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}`;
}

/**
 * Formata datas YYYY-MM-DD ou ISO sem deslocamento de fuso horário para datas de nascimento/período.
 */
export function formatarData(valor: string | Date): string {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return '—';
    const d = String(valor.getUTCDate()).padStart(2, '0');
    const m = String(valor.getUTCMonth() + 1).padStart(2, '0');
    const y = valor.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }

  const matchIsoCurta = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim());
  if (matchIsoCurta) {
    return `${matchIsoCurta[3]}/${matchIsoCurta[2]}/${matchIsoCurta[1]}`;
  }

  const parsed = new Date(valor);
  if (Number.isNaN(parsed.getTime())) return valor;
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'America/Maceio' });
}

export function formatarDataHora(valor: string | Date): string {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Maceio',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatarDataCurta(valor: string | Date): string {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Maceio',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function formatarHora(valor: string | Date): string {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Maceio',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function extrairDataIsoMaceio(valor: string | Date): string {
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Maceio',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = partes.find((p) => p.type === 'year')?.value ?? '2026';
  const month = partes.find((p) => p.type === 'month')?.value ?? '01';
  const day = partes.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function hojeIsoMaceio(): string {
  return extrairDataIsoMaceio(new Date());
}

export function somarDiasIso(iso: string, dias: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const dt = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

// ============================================================================
// Rótulos de Enums e Constantes de Domínio
// ============================================================================

export const LABELS_NIVEL_ACESSO: Record<NivelAcesso, string> = {
  ATENDENTE: 'Atendente',
  PROFISSIONAL_SAUDE: 'Profissional de Saúde',
  ADMINISTRADOR: 'Administrador',
};

export const LABELS_CATEGORIA_SERVICO: Record<CategoriaServico, string> = {
  CONSULTA: 'Consulta',
  PROCEDIMENTO: 'Procedimento',
  CIRURGIA: 'Cirurgia',
};

export const LABELS_MODO_ACESSO: Record<ModoAcessoServico, string> = {
  DIRETO: 'Acesso Direto',
  REGULADO: 'Acesso Regulado',
};

export const LABELS_SITUACAO_AGENDA: Record<SituacaoAgenda, string> = {
  RASCUNHO: 'Rascunho',
  PUBLICADA: 'Publicada',
  BLOQUEADA: 'Bloqueada',
  ENCERRADA: 'Encerrada',
};

export const LABELS_STATUS_AGENDAMENTO: Record<StatusAgendamento, string> = {
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
  NAO_REALIZADO: 'Não Realizado',
};

export const LABELS_ORIGEM_MARCACAO: Record<OrigemMarcacao, string> = {
  APLICATIVO: 'Portal do Cidadão',
  ASSISTIDA: 'Marcação Assistida',
};

export const LABELS_GRUPO_ATENDIMENTO: Record<GrupoAtendimento, string> = {
  PRIORITARIO: 'Prioritário',
  COMUM: 'Comum',
};

export const LABELS_CRITERIO_PRIORIDADE: Record<CriterioPrioridade, string> = {
  IDOSO_60_MAIS: 'Idoso (60+ anos)',
  PCD: 'Pessoa com Deficiência (PcD)',
  AMBOS: 'Idoso 60+ e PcD',
  PADRAO: 'Atendimento Padrão',
};

export const LABELS_SITUACAO_FILA: Record<SituacaoFila, string> = {
  AGUARDANDO: 'Aguardando',
  CHAMADO: 'Chamado',
  EM_ATENDIMENTO: 'Em Atendimento',
  CONCLUIDO: 'Concluído',
  NAO_ATENDIDO: 'Não Atendido',
  CANCELADO: 'Cancelado',
};

export const LABELS_ESTADO_CHAMADA: Record<EstadoChamada, string> = {
  CHAMADO: 'Chamando agora',
  EM_ATENDIMENTO: 'Em atendimento',
  CONCLUIDO: 'Concluído',
  NAO_ATENDIDO: 'Ausente',
};

export const LABELS_POSSUI_DEFICIENCIA: Record<PossuiDeficiencia, string> = {
  NAO: 'Não',
  SIM: 'Sim',
  PREFIRO_NAO_INFORMAR: 'Prefiro não informar',
};

export const LABELS_TIPO_DEFICIENCIA: Record<TipoDeficiencia, string> = {
  FISICA: 'Física',
  AUDITIVA: 'Auditiva',
  VISUAL: 'Visual',
  INTELECTUAL: 'Intelectual',
  PSICOSSOCIAL: 'Psicossocial',
  TEA: 'TEA (Transtorno do Espectro Autista)',
};

export const LABELS_SITUACAO_CNS: Record<SituacaoCns, string> = {
  PENDENTE_CONFIRMACAO: 'Pendente de confirmação',
  CONFIRMADO: 'Confirmado',
  DIVERGENTE: 'Divergente',
};

export const DIAS_SEMANA: Array<{ valor: number; curto: string; completo: string }> = [
  { valor: 0, curto: 'Dom', completo: 'Domingo' },
  { valor: 1, curto: 'Seg', completo: 'Segunda-feira' },
  { valor: 2, curto: 'Ter', completo: 'Terça-feira' },
  { valor: 3, curto: 'Qua', completo: 'Quarta-feira' },
  { valor: 4, curto: 'Qui', completo: 'Quinta-feira' },
  { valor: 5, curto: 'Sex', completo: 'Sexta-feira' },
  { valor: 6, curto: 'Sáb', completo: 'Sábado' },
];

export const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
] as const;

// ============================================================================
// Alerta sonoro suave (Web Audio API) para o Painel Público
// ============================================================================

export function tocarAlertaSonoroChamada(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const agora = ctx.currentTime;

    const tocarNota = (freq: number, inicio: number, duracao: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, inicio);

      gain.gain.setValueAtTime(0.0001, inicio);
      gain.gain.exponentialRampToValueAtTime(0.16, inicio + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + duracao);
    };

    tocarNota(587.33, agora, 0.22); // D5
    tocarNota(880.0, agora + 0.18, 0.36); // A5

    window.setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch {
    // Navegador pode bloquear áudio antes de interação do usuário
  }
}
