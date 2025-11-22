export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return cpf;
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return cnpj;
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatCPFCNPJ(value: string | null | undefined): string {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return formatCPF(numbers);
  } else if (numbers.length === 14) {
    return formatCNPJ(numbers);
  }
  
  return value;
}

export function unformatCPFCNPJ(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

export function isValidCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(numbers.charAt(10))) return false;
  
  return true;
}

export function isValidCNPJ(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false;
  const numbers = cnpj.replace(/\D/g, '');
  
  if (numbers.length !== 14) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  let size = numbers.length - 2;
  let nums = numbers.substring(0, size);
  const digits = numbers.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(nums.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  nums = numbers.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(nums.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

export function handleCPFCNPJInput(e: React.ChangeEvent<HTMLInputElement>): string {
  const value = e.target.value;
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    if (numbers.length === 11) {
      return formatCPF(numbers);
    }
    return numbers;
  } else if (numbers.length <= 14) {
    if (numbers.length === 14) {
      return formatCNPJ(numbers);
    }
    return numbers;
  }
  
  return formatCNPJ(numbers.slice(0, 14));
}
