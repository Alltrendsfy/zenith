import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  // Mínimo 8 caracteres
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Senha deve ter no mínimo 8 caracteres'
    };
  }

  // Máximo 128 caracteres
  if (password.length > 128) {
    return {
      valid: false,
      message: 'Senha deve ter no máximo 128 caracteres'
    };
  }

  // Verificar complexidade
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/]/.test(password);

  const complexityChecks = [
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecial
  ];

  const passedChecks = complexityChecks.filter(Boolean).length;

  if (passedChecks < 3) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos 3 dos seguintes: letra maiúscula, letra minúscula, número e caractere especial'
    };
  }

  // Verificar senhas comuns (lista básica - expandir em produção)
  const commonPasswords = [
    '12345678', 'password', 'senha123', 'admin123', 'qwerty12',
    'abc12345', 'password1', '123456789', 'iloveyou', 'welcome1'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      valid: false,
      message: 'Senha muito comum. Escolha uma senha mais segura'
    };
  }

  return { valid: true };
}
