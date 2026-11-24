import { somenteDigitos } from './formatters';

function calcularDvCpf(base: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i += 1) {
    soma += Number(base[i]) * (pesoInicial - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function validarCpf(valor: string): boolean {
  const limpo = somenteDigitos(valor);
  if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) {
    return false;
  }
  const dv1 = calcularDvCpf(limpo.slice(0, 9), 10);
  const dv2 = calcularDvCpf(limpo.slice(0, 10), 11);
  return dv1 === Number(limpo[9]) && dv2 === Number(limpo[10]);
}

export function validarCns(valor: string): boolean {
  const limpo = somenteDigitos(valor);
  if (limpo.length !== 15 || /^(\d)\1{14}$/.test(limpo)) {
    return false;
  }

  const primeiro = limpo[0];
  if (primeiro === '1' || primeiro === '2') {
    const pis = limpo.slice(0, 11);
    let soma = 0;
    for (let i = 0; i < 11; i += 1) {
      soma += Number(pis[i]) * (15 - i);
    }
    const resto = soma % 11;
    let dv = 11 - resto;
    if (dv === 11) dv = 0;

    let resultado: string;
    if (dv === 10) {
      const somaAjustada = soma + 2;
      const restoAjustado = somaAjustada % 11;
      let dvAjustado = 11 - restoAjustado;
      if (dvAjustado === 11) dvAjustado = 0;
      resultado = `${pis}001${dvAjustado}`;
    } else {
      resultado = `${pis}000${dv}`;
    }
    return limpo === resultado;
  }

  if (primeiro === '7' || primeiro === '8' || primeiro === '9') {
    let soma = 0;
    for (let i = 0; i < 15; i += 1) {
      soma += Number(limpo[i]) * (15 - i);
    }
    return soma % 11 === 0;
  }

  return false;
}

export function validarEmail(valor: string): boolean {
  const limpo = valor.trim();
  if (!limpo) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo);
}

function extrairCandidatosDataNascimento(dataIso: string): {
  formatosTexto: Set<string>;
  formatosNumericos: Set<string>;
} {
  const formatosTexto = new Set<string>();
  const formatosNumericos = new Set<string>();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataIso.trim());
  if (!match) return { formatosTexto, formatosNumericos };

  const [, aaaa, mm, dd] = match;
  const ddmmaaaa = `${dd}${mm}${aaaa}`;
  const aaaammdd = `${aaaa}${mm}${dd}`;

  formatosNumericos.add(ddmmaaaa);
  formatosNumericos.add(aaaammdd);
  formatosTexto.add(ddmmaaaa);
  formatosTexto.add(aaaammdd);
  formatosTexto.add(`${dd}/${mm}/${aaaa}`);
  formatosTexto.add(`${aaaa}-${mm}-${dd}`);
  formatosTexto.add(`${dd}-${mm}-${aaaa}`);

  return { formatosTexto, formatosNumericos };
}

export function validarSenhaForte(
  senhaPlana: string,
  cpf?: string,
  dataNascimento?: string
): string | null {
  if (senhaPlana.length < 8 || senhaPlana.length > 64) {
    return 'A senha deve ter entre 8 e 64 caracteres';
  }

  const senhaTrimmed = senhaPlana.trim();
  const senhaDigitos = somenteDigitos(senhaPlana);

  if (cpf) {
    const cpfLimpo = somenteDigitos(cpf);
    if (
      senhaTrimmed === cpf.trim() ||
      (cpfLimpo.length === 11 &&
        (senhaTrimmed === cpfLimpo || senhaDigitos === cpfLimpo))
    ) {
      return 'A senha não pode ser igual ao CPF';
    }
  }

  if (dataNascimento) {
    const { formatosTexto, formatosNumericos } =
      extrairCandidatosDataNascimento(dataNascimento);
    if (
      formatosTexto.has(senhaTrimmed) ||
      (senhaDigitos.length === 8 && formatosNumericos.has(senhaDigitos))
    ) {
      return 'A senha não pode coincidir com a data de nascimento';
    }
  }

  if (!/[a-zA-Z]/.test(senhaPlana) || !/[0-9]/.test(senhaPlana)) {
    return 'A senha deve conter ao menos uma letra e um número';
  }

  return null;
}
