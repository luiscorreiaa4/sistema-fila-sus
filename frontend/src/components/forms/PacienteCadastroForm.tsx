import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ApiError, extrairMensagemErro, pacientesApi } from '../../services/api';
import type {
  CadastrarPacienteInput,
  PacienteDTO,
  PossuiDeficiencia,
  TipoDeficiencia,
} from '../../types/api';
import {
  LABELS_TIPO_DEFICIENCIA,
  UFS_BRASIL,
  maskCep,
  maskCns,
  maskCpf,
  maskTelefone,
  nullableTrim,
  somenteDigitos,
} from '../../utils/formatters';
import {
  validarCns,
  validarCpf,
  validarEmail,
  validarSenhaForte,
} from '../../utils/validators';
import { FormField, SelectInput, TextAreaInput, TextInput } from '../ui/FormControls';
import { PillButton } from '../ui/PillButton';

interface PacienteCadastroFormProps {
  mode: 'autocadastro' | 'assistido';
  onSuccess: (
    paciente: PacienteDTO,
    credenciais?: { cpf: string; senha: string }
  ) => void | Promise<void>;
  onCancel?: () => void;
}

type CampoCadastro =
  | 'nomeCompleto'
  | 'dataNascimento'
  | 'cpf'
  | 'cns'
  | 'email'
  | 'celular'
  | 'cep'
  | 'logradouro'
  | 'numero'
  | 'bairro'
  | 'municipio'
  | 'estado'
  | 'senha'
  | 'confirmarSenha'
  | 'cienciaPrivacidade';

const CAMPO_TO_ELEMENT_ID: Record<string, string> = {
  nomeCompleto: 'pac-nome',
  nomeSocial: 'pac-nome-social',
  dataNascimento: 'pac-nascimento',
  cpf: 'pac-cpf',
  cns: 'pac-cns',
  email: 'pac-email',
  celular: 'pac-celular',
  cep: 'pac-cep',
  logradouro: 'pac-logradouro',
  numero: 'pac-numero',
  bairro: 'pac-bairro',
  municipio: 'pac-municipio',
  estado: 'pac-uf',
  senha: 'pac-senha',
  confirmarSenha: 'pac-confirma-senha',
  cienciaPrivacidade: 'pac-ciencia',
};

const ORDEM_CAMPOS: CampoCadastro[] = [
  'nomeCompleto',
  'dataNascimento',
  'cpf',
  'cns',
  'email',
  'celular',
  'cep',
  'logradouro',
  'numero',
  'bairro',
  'municipio',
  'estado',
  'senha',
  'confirmarSenha',
  'cienciaPrivacidade',
];

const TIPOS_DEFICIENCIA: TipoDeficiencia[] = [
  'FISICA',
  'AUDITIVA',
  'VISUAL',
  'INTELECTUAL',
  'PSICOSSOCIAL',
  'TEA',
];

export function PacienteCadastroForm({
  mode,
  onSuccess,
  onCancel,
}: PacienteCadastroFormProps) {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomeSocial, setNomeSocial] = useState('');
  const [cpf, setCpf] = useState('');
  const [cns, setCns] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [celularWhatsapp, setCelularWhatsapp] = useState(true);

  const [possuiDeficiencia, setPossuiDeficiencia] =
    useState<PossuiDeficiencia>('NAO');
  const [tiposDeficiencia, setTiposDeficiencia] = useState<TipoDeficiencia[]>([]);
  const [preferenciasAcessibilidade, setPreferenciasAcessibilidade] =
    useState('');

  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('Maceió');
  const [estado, setEstado] = useState('AL');

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cienciaPrivacidade, setCienciaPrivacidade] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});

  const toggleTipoDeficiencia = (tipo: TipoDeficiencia) => {
    setTiposDeficiencia((prev) =>
      prev.includes(tipo) ? prev.filter((item) => item !== tipo) : [...prev, tipo]
    );
  };

  const obterErroCampo = (
    campo: CampoCadastro,
    valores?: Partial<{
      nomeCompleto: string;
      dataNascimento: string;
      cpf: string;
      cns: string;
      email: string;
      celular: string;
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      estado: string;
      senha: string;
      confirmarSenha: string;
      cienciaPrivacidade: boolean;
    }>
  ): string | undefined => {
    const vNome = valores?.nomeCompleto ?? nomeCompleto;
    const vData = valores?.dataNascimento ?? dataNascimento;
    const vCpf = valores?.cpf ?? cpf;
    const vCns = valores?.cns ?? cns;
    const vEmail = valores?.email ?? email;
    const vCelular = valores?.celular ?? celular;
    const vCep = valores?.cep ?? cep;
    const vLogradouro = valores?.logradouro ?? logradouro;
    const vNumero = valores?.numero ?? numero;
    const vBairro = valores?.bairro ?? bairro;
    const vMunicipio = valores?.municipio ?? municipio;
    const vEstado = valores?.estado ?? estado;
    const vSenha = valores?.senha ?? senha;
    const vConfirmar = valores?.confirmarSenha ?? confirmarSenha;
    const vCiencia = valores?.cienciaPrivacidade ?? cienciaPrivacidade;

    switch (campo) {
      case 'nomeCompleto':
        if (vNome.trim().length < 3) {
          return 'Informe o nome completo (mín. 3 caracteres)';
        }
        return undefined;
      case 'dataNascimento': {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(vData)) {
          return 'Informe uma data de nascimento válida';
        }
        const dt = new Date(`${vData}T00:00:00`);
        if (Number.isNaN(dt.getTime()) || dt > new Date()) {
          return 'Data de nascimento inválida ou futura';
        }
        return undefined;
      }
      case 'cpf': {
        const dig = somenteDigitos(vCpf);
        if (dig.length !== 11) {
          return 'CPF deve conter 11 dígitos';
        }
        if (!validarCpf(dig)) {
          return 'CPF inválido. Confira os dígitos informados';
        }
        return undefined;
      }
      case 'cns': {
        const dig = somenteDigitos(vCns);
        if (dig.length !== 15) {
          return 'Cartão SUS (CNS) deve conter 15 dígitos';
        }
        if (!validarCns(dig)) {
          return 'Número do Cartão SUS (CNS) inválido';
        }
        return undefined;
      }
      case 'email': {
        const emailTrim = vEmail.trim();
        const celDig = somenteDigitos(vCelular);
        if (!emailTrim && !celDig) {
          return 'Informe ao menos um contato: e-mail ou celular';
        }
        if (emailTrim && !validarEmail(emailTrim)) {
          return 'Informe um endereço de e-mail válido';
        }
        return undefined;
      }
      case 'celular': {
        const emailTrim = vEmail.trim();
        const celDig = somenteDigitos(vCelular);
        if (!emailTrim && !celDig) {
          return 'Informe ao menos um contato: e-mail ou celular';
        }
        if (celDig && (celDig.length < 10 || celDig.length > 11)) {
          return 'Celular deve conter DDD + número (10 ou 11 dígitos)';
        }
        return undefined;
      }
      case 'cep':
        if (somenteDigitos(vCep).length !== 8) {
          return 'CEP deve conter 8 dígitos';
        }
        return undefined;
      case 'logradouro':
        if (!vLogradouro.trim()) {
          return 'Informe o logradouro';
        }
        return undefined;
      case 'numero':
        if (!vNumero.trim()) {
          return 'Informe o número';
        }
        return undefined;
      case 'bairro':
        if (!vBairro.trim()) {
          return 'Informe o bairro';
        }
        return undefined;
      case 'municipio':
        if (!vMunicipio.trim()) {
          return 'Informe o município';
        }
        return undefined;
      case 'estado':
        if (vEstado.trim().length !== 2) {
          return 'UF inválida';
        }
        return undefined;
      case 'senha':
        return validarSenhaForte(vSenha, vCpf, vData) ?? undefined;
      case 'confirmarSenha':
        if (!vConfirmar) {
          return 'Confirme sua senha';
        }
        if (vSenha !== vConfirmar) {
          return 'As senhas não coincidem';
        }
        return undefined;
      case 'cienciaPrivacidade':
        if (!vCiencia) {
          return 'O aceite do termo de privacidade é obrigatório';
        }
        return undefined;
    }
  };

  const focarPrimeiroErro = (mapaErros: Record<string, string>) => {
    const primeiroCampo =
      ORDEM_CAMPOS.find((c) => Boolean(mapaErros[c])) ??
      Object.keys(mapaErros)[0];
    if (!primeiroCampo) return;
    const elementId = CAMPO_TO_ELEMENT_ID[primeiroCampo];
    if (!elementId) return;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
      }
    });
  };

  const validarCampo = (
    campo: CampoCadastro,
    valores?: Partial<{
      nomeCompleto: string;
      dataNascimento: string;
      cpf: string;
      cns: string;
      email: string;
      celular: string;
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      estado: string;
      senha: string;
      confirmarSenha: string;
      cienciaPrivacidade: boolean;
    }>
  ) => {
    const msg = obterErroCampo(campo, valores);
    setErrosCampos((prev) => {
      const next = { ...prev };
      if (msg) {
        next[campo] = msg;
      } else {
        delete next[campo];
      }

      if (campo === 'email' || campo === 'celular') {
        const outro: CampoCadastro = campo === 'email' ? 'celular' : 'email';
        const msgOutro = obterErroCampo(outro, valores);
        if (!msgOutro) {
          delete next[outro];
        }
      }

      if (campo === 'senha' && (valores?.confirmarSenha ?? confirmarSenha)) {
        const msgConf = obterErroCampo('confirmarSenha', valores);
        if (msgConf) {
          next.confirmarSenha = msgConf;
        } else {
          delete next.confirmarSenha;
        }
      }

      return next;
    });
  };

  const validarLocal = (): boolean => {
    const novosErros: Record<string, string> = {};

    for (const campo of ORDEM_CAMPOS) {
      const msg = obterErroCampo(campo);
      if (msg) {
        novosErros[campo] = msg;
      }
    }

    setErrosCampos(novosErros);
    if (Object.keys(novosErros).length > 0) {
      setErroGeral('Revise os campos destacados antes de concluir o cadastro.');
      focarPrimeiroErro(novosErros);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErroGeral(null);

    if (!validarLocal()) return;

    const payload: CadastrarPacienteInput = {
      cpf: somenteDigitos(cpf),
      cns: somenteDigitos(cns),
      nomeCompleto: nomeCompleto.trim(),
      nomeSocial: nullableTrim(nomeSocial),
      dataNascimento,
      email: nullableTrim(email),
      celular: nullableTrim(celular ? somenteDigitos(celular) : ''),
      celularWhatsapp,
      possuiDeficiencia,
      tiposDeficiencia: possuiDeficiencia === 'SIM' ? tiposDeficiencia : [],
      preferenciasAcessibilidade: nullableTrim(preferenciasAcessibilidade),
      cep: somenteDigitos(cep),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: nullableTrim(complemento),
      bairro: bairro.trim(),
      municipio: municipio.trim(),
      estado: estado.trim().toUpperCase(),
      senha,
      cienciaPrivacidade,
    };

    setIsSubmitting(true);
    try {
      const res =
        mode === 'autocadastro'
          ? await pacientesApi.autocadastro(payload)
          : await pacientesApi.cadastroAssistido(payload);
      await onSuccess(
        res.paciente,
        mode === 'autocadastro'
          ? { cpf: payload.cpf, senha: payload.senha }
          : undefined
      );
    } catch (erro) {
      if (erro instanceof ApiError && erro.detalhes?.length) {
        const mapa: Record<string, string> = {};
        for (const item of erro.detalhes) {
          if (item.campo) {
            mapa[item.campo] = item.mensagem;
          }
        }
        setErrosCampos(mapa);
        focarPrimeiroErro(mapa);
      }
      setErroGeral(extrairMensagemErro(erro));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {erroGeral && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {erroGeral}
        </div>
      )}

      {/* Dados Pessoais */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF4FB] text-xs font-semibold text-[#1E6BFF]">
            1
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0F172A]">
            Identificação e Cartão SUS
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Nome completo"
            htmlFor="pac-nome"
            required
            error={errosCampos.nomeCompleto}
            className="sm:col-span-2"
          >
            <TextInput
              id="pac-nome"
              value={nomeCompleto}
              onChange={(e) => {
                const v = e.target.value;
                setNomeCompleto(v);
                if (errosCampos.nomeCompleto) validarCampo('nomeCompleto', { nomeCompleto: v });
              }}
              onBlur={() => validarCampo('nomeCompleto')}
              placeholder="Ex.: Maria da Silva"
              hasError={Boolean(errosCampos.nomeCompleto)}
            />
          </FormField>

          <FormField
            label="Nome social (opcional)"
            htmlFor="pac-nome-social"
            hint="Usado nas telas do sistema e nas chamadas, se informado."
            error={errosCampos.nomeSocial}
          >
            <TextInput
              id="pac-nome-social"
              value={nomeSocial}
              onChange={(e) => setNomeSocial(e.target.value)}
              placeholder="Como prefere ser chamado(a)"
              hasError={Boolean(errosCampos.nomeSocial)}
            />
          </FormField>

          <FormField
            label="Data de nascimento"
            htmlFor="pac-nascimento"
            required
            error={errosCampos.dataNascimento}
          >
            <TextInput
              id="pac-nascimento"
              type="date"
              value={dataNascimento}
              onChange={(e) => {
                const v = e.target.value;
                setDataNascimento(v);
                if (errosCampos.dataNascimento) validarCampo('dataNascimento', { dataNascimento: v });
              }}
              onBlur={() => validarCampo('dataNascimento')}
              hasError={Boolean(errosCampos.dataNascimento)}
            />
          </FormField>

          <FormField label="CPF" htmlFor="pac-cpf" required error={errosCampos.cpf}>
            <TextInput
              id="pac-cpf"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => {
                const v = maskCpf(e.target.value);
                setCpf(v);
                if (errosCampos.cpf) validarCampo('cpf', { cpf: v });
              }}
              onBlur={() => validarCampo('cpf')}
              placeholder="000.000.000-00"
              hasError={Boolean(errosCampos.cpf)}
            />
          </FormField>

          <FormField
            label="Cartão Nacional de Saúde (CNS)"
            htmlFor="pac-cns"
            required
            hint="15 dígitos válidos do Cartão SUS."
            error={errosCampos.cns}
          >
            <TextInput
              id="pac-cns"
              inputMode="numeric"
              value={cns}
              onChange={(e) => {
                const v = maskCns(e.target.value);
                setCns(v);
                if (errosCampos.cns) validarCampo('cns', { cns: v });
              }}
              onBlur={() => validarCampo('cns')}
              placeholder="000 0000 0000 0000"
              hasError={Boolean(errosCampos.cns)}
            />
          </FormField>
        </div>
      </section>

      {/* Contato */}
      <section className="space-y-4 pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF4FB] text-xs font-semibold text-[#1E6BFF]">
            2
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0F172A]">
            Contato (e-mail ou celular obrigatório)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="E-mail" htmlFor="pac-email" error={errosCampos.email}>
            <TextInput
              id="pac-email"
              type="email"
              value={email}
              onChange={(e) => {
                const v = e.target.value;
                setEmail(v);
                if (errosCampos.email || errosCampos.celular) {
                  validarCampo('email', { email: v });
                }
              }}
              onBlur={() => validarCampo('email')}
              placeholder="cidadao@email.com"
              hasError={Boolean(errosCampos.email)}
            />
          </FormField>

          <FormField label="Celular" htmlFor="pac-celular" error={errosCampos.celular}>
            <TextInput
              id="pac-celular"
              inputMode="tel"
              value={celular}
              onChange={(e) => {
                const v = maskTelefone(e.target.value);
                setCelular(v);
                if (errosCampos.celular || errosCampos.email) {
                  validarCampo('celular', { celular: v });
                }
              }}
              onBlur={() => validarCampo('celular')}
              placeholder="(82) 99999-9999"
              hasError={Boolean(errosCampos.celular)}
            />
          </FormField>
        </div>

        <label className="inline-flex items-center gap-2.5 text-xs text-[#64748B] cursor-pointer">
          <input
            type="checkbox"
            checked={celularWhatsapp}
            onChange={(e) => setCelularWhatsapp(e.target.checked)}
            className="h-4 w-4 rounded border-[#E2E8F0] text-[#1E6BFF] focus:ring-[#1E6BFF]"
          />
          Este número possui WhatsApp para comunicações sobre agendamentos
        </label>
      </section>

      {/* Acessibilidade e Prioridade */}
      <section className="space-y-4 pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF4FB] text-xs font-semibold text-[#1E6BFF]">
            3
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0F172A]">
            Acessibilidade e prioridade legal
          </h3>
        </div>

        <FormField label="Possui deficiência?" htmlFor="pac-pcd">
          <SelectInput
            id="pac-pcd"
            value={possuiDeficiencia}
            onChange={(e) => setPossuiDeficiencia(e.target.value as PossuiDeficiencia)}
          >
            <option value="NAO">Não</option>
            <option value="SIM">Sim (assegura fila prioritária legal)</option>
            <option value="PREFIRO_NAO_INFORMAR">Prefiro não informar</option>
          </SelectInput>
        </FormField>

        {possuiDeficiencia === 'SIM' && (
          <div className="rounded-2xl bg-[#F4F7FC] border border-[#E2E8F0] p-4 space-y-3">
            <p className="text-xs font-medium text-[#0F172A]">
              Tipos de deficiência (selecione um ou mais)
            </p>
            <div className="flex flex-wrap gap-2">
              {TIPOS_DEFICIENCIA.map((tipo) => {
                const selecionado = tiposDeficiencia.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleTipoDeficiencia(tipo)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border ${
                      selecionado
                        ? 'bg-[#1E6BFF] text-white border-[#1E6BFF]'
                        : 'bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#1E6BFF]/40'
                    }`}
                  >
                    {LABELS_TIPO_DEFICIENCIA[tipo]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <FormField
          label="Preferências de acessibilidade (opcional)"
          htmlFor="pac-pref-acess"
        >
          <TextAreaInput
            id="pac-pref-acess"
            value={preferenciasAcessibilidade}
            onChange={(e) => setPreferenciasAcessibilidade(e.target.value)}
            placeholder="Ex.: Intérprete de Libras, sala térrea, cadeira de rodas..."
          />
        </FormField>
      </section>

      {/* Endereço */}
      <section className="space-y-4 pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF4FB] text-xs font-semibold text-[#1E6BFF]">
            4
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0F172A]">
            Endereço residencial
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <FormField
            label="CEP"
            htmlFor="pac-cep"
            required
            error={errosCampos.cep}
            className="sm:col-span-2"
          >
            <TextInput
              id="pac-cep"
              inputMode="numeric"
              value={cep}
              onChange={(e) => {
                const v = maskCep(e.target.value);
                setCep(v);
                if (errosCampos.cep) validarCampo('cep', { cep: v });
              }}
              onBlur={() => validarCampo('cep')}
              placeholder="57020-050"
              hasError={Boolean(errosCampos.cep)}
            />
          </FormField>

          <FormField
            label="Logradouro"
            htmlFor="pac-logradouro"
            required
            error={errosCampos.logradouro}
            className="sm:col-span-4"
          >
            <TextInput
              id="pac-logradouro"
              value={logradouro}
              onChange={(e) => {
                const v = e.target.value;
                setLogradouro(v);
                if (errosCampos.logradouro) validarCampo('logradouro', { logradouro: v });
              }}
              onBlur={() => validarCampo('logradouro')}
              placeholder="Rua, Avenida ou Travessa"
              hasError={Boolean(errosCampos.logradouro)}
            />
          </FormField>

          <FormField
            label="Número"
            htmlFor="pac-numero"
            required
            error={errosCampos.numero}
            className="sm:col-span-2"
          >
            <TextInput
              id="pac-numero"
              value={numero}
              onChange={(e) => {
                const v = e.target.value;
                setNumero(v);
                if (errosCampos.numero) validarCampo('numero', { numero: v });
              }}
              onBlur={() => validarCampo('numero')}
              placeholder="120"
              hasError={Boolean(errosCampos.numero)}
            />
          </FormField>

          <FormField
            label="Complemento"
            htmlFor="pac-complemento"
            className="sm:col-span-4"
          >
            <TextInput
              id="pac-complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Apto, bloco, referência (opcional)"
            />
          </FormField>

          <FormField
            label="Bairro"
            htmlFor="pac-bairro"
            required
            error={errosCampos.bairro}
            className="sm:col-span-2"
          >
            <TextInput
              id="pac-bairro"
              value={bairro}
              onChange={(e) => {
                const v = e.target.value;
                setBairro(v);
                if (errosCampos.bairro) validarCampo('bairro', { bairro: v });
              }}
              onBlur={() => validarCampo('bairro')}
              placeholder="Centro"
              hasError={Boolean(errosCampos.bairro)}
            />
          </FormField>

          <FormField
            label="Município"
            htmlFor="pac-municipio"
            required
            error={errosCampos.municipio}
            className="sm:col-span-3"
          >
            <TextInput
              id="pac-municipio"
              value={municipio}
              onChange={(e) => {
                const v = e.target.value;
                setMunicipio(v);
                if (errosCampos.municipio) validarCampo('municipio', { municipio: v });
              }}
              onBlur={() => validarCampo('municipio')}
              placeholder="Maceió"
              hasError={Boolean(errosCampos.municipio)}
            />
          </FormField>

          <FormField
            label="UF"
            htmlFor="pac-uf"
            required
            error={errosCampos.estado}
            className="sm:col-span-1"
          >
            <SelectInput
              id="pac-uf"
              value={estado}
              onChange={(e) => {
                const v = e.target.value;
                setEstado(v);
                if (errosCampos.estado) validarCampo('estado', { estado: v });
              }}
              onBlur={() => validarCampo('estado')}
              hasError={Boolean(errosCampos.estado)}
            >
              {UFS_BRASIL.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </SelectInput>
          </FormField>
        </div>
      </section>

      {/* Senha e termo de privacidade */}
      <section className="space-y-4 pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF4FB] text-xs font-semibold text-[#1E6BFF]">
            5
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0F172A]">
            Senha e termo de privacidade
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Senha"
            htmlFor="pac-senha"
            required
            hint="8 a 64 caracteres, com letras e números, diferente do CPF e nascimento."
            error={errosCampos.senha}
          >
            <div className="relative">
              <TextInput
                id="pac-senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => {
                  const v = e.target.value;
                  setSenha(v);
                  if (errosCampos.senha || errosCampos.confirmarSenha) {
                    validarCampo('senha', { senha: v });
                  }
                }}
                onBlur={() => validarCampo('senha')}
                placeholder="Crie uma senha forte"
                hasError={Boolean(errosCampos.senha)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label="Alternar visibilidade da senha"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                {mostrarSenha ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FormField>

          <FormField
            label="Confirmar senha"
            htmlFor="pac-confirma-senha"
            required
            error={errosCampos.confirmarSenha}
          >
            <TextInput
              id="pac-confirma-senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => {
                const v = e.target.value;
                setConfirmarSenha(v);
                if (errosCampos.confirmarSenha) {
                  validarCampo('confirmarSenha', { confirmarSenha: v });
                }
              }}
              onBlur={() => validarCampo('confirmarSenha')}
              placeholder="Repita a senha"
              hasError={Boolean(errosCampos.confirmarSenha)}
            />
          </FormField>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            errosCampos.cienciaPrivacidade
              ? 'border-red-400 bg-red-50/70'
              : 'border-[#DBEAFE] bg-[#EFF4FB]/60'
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="pac-ciencia"
              type="checkbox"
              checked={cienciaPrivacidade}
              onChange={(e) => {
                const v = e.target.checked;
                setCienciaPrivacidade(v);
                validarCampo('cienciaPrivacidade', { cienciaPrivacidade: v });
              }}
              onBlur={() => validarCampo('cienciaPrivacidade')}
              className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#1E6BFF] focus:ring-[#1E6BFF]"
            />
            <span className="text-xs text-[#0F172A] leading-relaxed">
              <span className="inline-flex items-center gap-1 font-semibold text-[#1E6BFF] mr-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Termo de privacidade:
              </span>
              Estou ciente do tratamento dos meus dados pessoais e do Cartão SUS
              exclusivamente para agendamentos, triagem de prioridade legal e
              atendimento na rede pública de saúde, sem exposição de identidade no
              painel público de chamadas.
            </span>
          </label>
          {errosCampos.cienciaPrivacidade && (
            <p className="mt-2 text-xs text-red-600">
              {errosCampos.cienciaPrivacidade}
            </p>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {onCancel && (
          <PillButton variant="ghost" hideIconCircle onClick={onCancel}>
            Cancelar
          </PillButton>
        )}
        <PillButton type="submit" loading={isSubmitting} size="lg">
          {mode === 'autocadastro' ? 'Concluir autocadastro' : 'Salvar cadastro assistido'}
        </PillButton>
      </div>
    </form>
  );
}
