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
import { FormField, SelectInput, TextAreaInput, TextInput } from '../ui/FormControls';
import { PillButton } from '../ui/PillButton';

interface PacienteCadastroFormProps {
  mode: 'autocadastro' | 'assistido';
  onSuccess: (paciente: PacienteDTO) => void;
  onCancel?: () => void;
}

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

  const validarLocal = (): boolean => {
    const novosErros: Record<string, string> = {};

    if (nomeCompleto.trim().length < 3) {
      novosErros.nomeCompleto = 'Informe o nome completo (mín. 3 caracteres)';
    }
    if (somenteDigitos(cpf).length !== 11) {
      novosErros.cpf = 'CPF deve conter 11 dígitos';
    }
    if (somenteDigitos(cns).length !== 15) {
      novosErros.cns = 'Cartão SUS (CNS) deve conter 15 dígitos';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      novosErros.dataNascimento = 'Informe uma data de nascimento válida';
    }
    if (!email.trim() && !celular.trim()) {
      novosErros.email = 'Informe ao menos um contato: e-mail ou celular';
      novosErros.celular = 'Informe ao menos um contato: e-mail ou celular';
    }
    if (somenteDigitos(cep).length !== 8) {
      novosErros.cep = 'CEP deve conter 8 dígitos';
    }
    if (!logradouro.trim()) {
      novosErros.logradouro = 'Informe o logradouro';
    }
    if (!numero.trim()) {
      novosErros.numero = 'Informe o número';
    }
    if (!bairro.trim()) {
      novosErros.bairro = 'Informe o bairro';
    }
    if (!municipio.trim()) {
      novosErros.municipio = 'Informe o município';
    }
    if (estado.trim().length !== 2) {
      novosErros.estado = 'UF inválida';
    }
    if (senha.length < 8 || senha.length > 64) {
      novosErros.senha = 'A senha deve ter entre 8 e 64 caracteres';
    } else if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
      novosErros.senha = 'A senha deve conter letras e números';
    }
    if (senha !== confirmarSenha) {
      novosErros.confirmarSenha = 'As senhas não coincidem';
    }
    if (!cienciaPrivacidade) {
      novosErros.cienciaPrivacidade =
        'O aceite do termo de ciência de privacidade (LGPD) é obrigatório';
    }

    setErrosCampos(novosErros);
    if (Object.keys(novosErros).length > 0) {
      setErroGeral('Revise os campos destacados antes de concluir o cadastro.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErroGeral(null);
    setErrosCampos({});

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
      onSuccess(res.paciente);
    } catch (erro) {
      if (erro instanceof ApiError && erro.detalhes?.length) {
        const mapa: Record<string, string> = {};
        for (const item of erro.detalhes) {
          if (item.campo) {
            mapa[item.campo] = item.mensagem;
          }
        }
        setErrosCampos(mapa);
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
            Identificação Civil e Cartão SUS
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
              onChange={(e) => setNomeCompleto(e.target.value)}
              placeholder="Ex.: Maria da Silva"
              hasError={Boolean(errosCampos.nomeCompleto)}
            />
          </FormField>

          <FormField
            label="Nome social (opcional)"
            htmlFor="pac-nome-social"
            hint="Utilizado nas telas autenticadas e chamadas internas quando informado."
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
              onChange={(e) => setDataNascimento(e.target.value)}
              hasError={Boolean(errosCampos.dataNascimento)}
            />
          </FormField>

          <FormField label="CPF" htmlFor="pac-cpf" required error={errosCampos.cpf}>
            <TextInput
              id="pac-cpf"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
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
              onChange={(e) => setCns(maskCns(e.target.value))}
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
            Contato (E-mail ou Celular obrigatório)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="E-mail" htmlFor="pac-email" error={errosCampos.email}>
            <TextInput
              id="pac-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cidadao@email.com"
              hasError={Boolean(errosCampos.email)}
            />
          </FormField>

          <FormField label="Celular" htmlFor="pac-celular" error={errosCampos.celular}>
            <TextInput
              id="pac-celular"
              inputMode="tel"
              value={celular}
              onChange={(e) => setCelular(maskTelefone(e.target.value))}
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
            Acessibilidade &amp; Prioridade Legal
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
            Endereço Residencial
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
              onChange={(e) => setCep(maskCep(e.target.value))}
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
              onChange={(e) => setLogradouro(e.target.value)}
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
              onChange={(e) => setNumero(e.target.value)}
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
              onChange={(e) => setBairro(e.target.value)}
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
              onChange={(e) => setMunicipio(e.target.value)}
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
              onChange={(e) => setEstado(e.target.value)}
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

      {/* Credenciais & LGPD */}
      <section className="space-y-4 pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EFF4FB] text-xs font-semibold text-[#1E6BFF]">
            5
          </span>
          <h3 className="font-display text-sm font-semibold text-[#0F172A]">
            Senha de Acesso e Privacidade (LGPD)
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
                onChange={(e) => setSenha(e.target.value)}
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
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a senha"
              hasError={Boolean(errosCampos.confirmarSenha)}
            />
          </FormField>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            errosCampos.cienciaPrivacidade
              ? 'border-red-300 bg-red-50/70'
              : 'border-[#DBEAFE] bg-[#EFF4FB]/60'
          }`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cienciaPrivacidade}
              onChange={(e) => setCienciaPrivacidade(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#1E6BFF] focus:ring-[#1E6BFF]"
            />
            <span className="text-xs text-[#0F172A] leading-relaxed">
              <span className="inline-flex items-center gap-1 font-semibold text-[#1E6BFF] mr-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Termo de Privacidade (LGPD):
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
          {mode === 'autocadastro' ? 'Concluir Autocadastro' : 'Salvar Cadastro Assistido'}
        </PillButton>
      </div>
    </form>
  );
}
