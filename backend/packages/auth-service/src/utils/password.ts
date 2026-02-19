import bcrypt from 'bcryptjs';
import { createLogger } from './logger';

const logger = createLogger('Password-Utils');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

/**
 * Hash a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    logger.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Compare a plain text password with a hash using bcrypt
 * Uses timing-safe comparison to prevent timing attacks
 * @param password - Plain text password to compare
 * @param hash - Hash to compare against
 * @returns Promise<boolean> - True if password matches hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Password comparison failed:', error);
    return false;
  }
}

/**
 * Validate password strength
 * Requirements: minimum 8 characters, at least one uppercase, one lowercase, one number
 * @param password - Password to validate
 * @returns boolean - True if password meets requirements
 */
export function validatePasswordStrength(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;
}
