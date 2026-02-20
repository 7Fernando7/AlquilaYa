/**
 * Form validation utility functions
 */

export const passwordRequirements = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
};

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Mínimo ${passwordRequirements.minLength} caracteres`);
  }
  if (!passwordRequirements.uppercase.test(password)) {
    errors.push('Al menos una mayúscula');
  }
  if (!passwordRequirements.lowercase.test(password)) {
    errors.push('Al menos una minúscula');
  }
  if (!passwordRequirements.number.test(password)) {
    errors.push('Al menos un número');
  }
  if (!passwordRequirements.special.test(password)) {
    errors.push('Al menos un carácter especial (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2;
}
