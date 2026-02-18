import { createLogger } from './logger';

const logger = createLogger('Validation');

/**
 * Validate email format using RFC 5322 simplified pattern
 * @param email - Email to validate
 * @returns boolean - True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate email is not empty or whitespace
 * @param email - Email to validate
 * @returns boolean - True if email has content
 */
export function isEmailNotEmpty(email: string): boolean {
  return email && email.trim().length > 0;
}

/**
 * Validate full name is not empty and has reasonable length
 * @param name - Name to validate
 * @returns boolean - True if valid name
 */
export function isValidFullName(name: string): boolean {
  if (!name || name.trim().length === 0) return false;
  if (name.length < 2) return false;
  if (name.length > 255) return false;
  return true;
}

/**
 * Validate password meets strength requirements
 * Requirements: 8+ chars, uppercase, lowercase, numbers
 * @param password - Password to validate
 * @returns object - { isValid, errors: string[] }
 */
export function validatePasswordStrength(
  password: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user type is one of allowed values
 * @param userType - User type to validate
 * @returns boolean - True if valid user type
 */
export function isValidUserType(userType: string): boolean {
  const validTypes = ['seeker', 'owner', 'agency', 'admin'];
  return validTypes.includes(userType.toLowerCase());
}

/**
 * Validate registration input
 * @param data - Registration data to validate
 * @returns object - { isValid, errors: Record<string, string> }
 */
export function validateRegistrationInput(data: {
  email?: string;
  password?: string;
  full_name?: string;
  user_type?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate email
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isEmailNotEmpty(data.email)) {
    errors.email = 'Email cannot be empty or whitespace';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Email format is invalid';
  }

  // Validate password
  const passwordValidation = validatePasswordStrength(data.password || '');
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors.join('; ');
  }

  // Validate full name
  if (!data.full_name) {
    errors.full_name = 'Full name is required';
  } else if (!isValidFullName(data.full_name)) {
    errors.full_name = 'Full name must be between 2 and 255 characters';
  }

  // Validate user type
  if (!data.user_type) {
    errors.user_type = 'User type is required';
  } else if (!isValidUserType(data.user_type)) {
    errors.user_type = 'User type must be: seeker, owner, agency, or admin';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
