export function somenteDigitosCpf(cpf: string | null | undefined): string {
  return String(cpf ?? '').replace(/\D/g, '');
}

export function formatarCpf(cpf: string | null | undefined): string {
  const digitos = somenteDigitosCpf(cpf);

  if (digitos.length !== 11) {
    return cpf?.trim() || '-';
  }

  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
