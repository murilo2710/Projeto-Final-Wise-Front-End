import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const NOME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ .'’-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
const TELEFONE_PATTERN = /^[0-9\s()+-]+$/;
const CRO_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .\-/]+$/;
const ESPECIALIDADE_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ -][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
const MATERIAL_NOME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .,\-()/+]+$/;
const UNIDADE_MEDIDA_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ /]+$/;
const TEXTO_LIVRE_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,;:!?ºª°%()/+\-_'"’#@&]+$/;

export function nomePessoaValidator(): ValidatorFn {
  return patternWhenFilled(NOME_PATTERN, 'nomePessoa');
}

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cpf = onlyDigits(control.value);

    if (!cpf) {
      return null;
    }

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return { cpfInvalido: true };
    }

    const digito1 = calcularDigitoCpf(cpf.slice(0, 9), 10);
    const digito2 = calcularDigitoCpf(`${cpf.slice(0, 9)}${digito1}`, 11);

    return cpf.endsWith(`${digito1}${digito2}`) ? null : { cpfInvalido: true };
  };
}

export function telefoneValidator(): ValidatorFn {
  return patternWhenFilled(TELEFONE_PATTERN, 'telefoneInvalido');
}

export function croValidator(): ValidatorFn {
  return patternWhenFilled(CRO_PATTERN, 'croInvalido');
}

export function especialidadeValidator(): ValidatorFn {
  return patternWhenFilled(ESPECIALIDADE_PATTERN, 'especialidadeInvalida');
}

export function materialNomeValidator(): ValidatorFn {
  return patternWhenFilled(MATERIAL_NOME_PATTERN, 'materialNomeInvalido');
}

export function unidadeMedidaValidator(): ValidatorFn {
  return patternWhenFilled(UNIDADE_MEDIDA_PATTERN, 'unidadeMedidaInvalida');
}

export function textoLivreValidator(errorKey = 'textoInvalido'): ValidatorFn {
  return patternWhenFilled(TEXTO_LIVRE_PATTERN, errorKey);
}

export function dataFimDepoisInicioValidator(inicioControlName: string, fimControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const inicio = control.get(inicioControlName)?.value;
    const fim = control.get(fimControlName)?.value;

    if (!inicio || !fim) {
      return null;
    }

    const inicioData = new Date(inicio).getTime();
    const fimData = new Date(fim).getTime();

    if (Number.isNaN(inicioData) || Number.isNaN(fimData)) {
      return null;
    }

    return fimData > inicioData ? null : { dataFimAntesInicio: true };
  };
}

function patternWhenFilled(pattern: RegExp, errorKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return pattern.test(value) ? null : { [errorKey]: true };
  };
}

function onlyDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function calcularDigitoCpf(base: string, pesoInicial: number): number {
  const soma = base
    .split('')
    .reduce((total, digito, index) => total + Number(digito) * (pesoInicial - index), 0);
  const resto = soma % 11;

  return resto < 2 ? 0 : 11 - resto;
}
