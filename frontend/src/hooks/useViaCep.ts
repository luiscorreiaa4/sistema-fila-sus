import { useCallback, useEffect, useRef, useState } from 'react';
import { consultarViaCep, type ViaCepAddress } from '../services/viacep';
import { somenteDigitos } from '../utils/formatters';

interface UseViaCepOptions {
  onSuccess: (dados: ViaCepAddress) => void;
  onError?: (mensagem: string) => void;
}

export function useViaCep({ onSuccess, onError }: UseViaCepOptions) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const ultimoCepResolvidoRef = useRef<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const marcarCepComoResolvido = useCallback((cep: string) => {
    const digitos = somenteDigitos(cep);
    ultimoCepResolvidoRef.current = digitos.length === 8 ? digitos : null;
  }, []);

  const limparEstadoCep = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    ultimoCepResolvidoRef.current = null;
    setBuscandoCep(false);
    setErroCep(null);
  }, []);

  const buscarCep = useCallback(
    async (cepBruto: string, options?: { forcar?: boolean }) => {
      const digitos = somenteDigitos(cepBruto);

      if (digitos.length !== 8) {
        abortRef.current?.abort();
        abortRef.current = null;
        ultimoCepResolvidoRef.current = null;
        setBuscandoCep(false);
        setErroCep(null);
        return;
      }

      if (!options?.forcar && ultimoCepResolvidoRef.current === digitos) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setBuscandoCep(true);
      setErroCep(null);

      try {
        const dados = await consultarViaCep(digitos, controller.signal);
        if (controller.signal.aborted) return;

        ultimoCepResolvidoRef.current = digitos;
        setErroCep(null);
        onSuccessRef.current(dados);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        ultimoCepResolvidoRef.current = null;
        const mensagem =
          err instanceof Error
            ? err.message
            : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.';
        setErroCep(mensagem);
        onErrorRef.current?.(mensagem);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setBuscandoCep(false);
        }
      }
    },
    []
  );

  return {
    buscandoCep,
    erroCep,
    buscarCep,
    marcarCepComoResolvido,
    limparEstadoCep,
  };
}
