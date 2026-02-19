import { Request, Response, NextFunction } from 'express';
import { getConnection } from '../database/connection';
import { User, UserType, VerificationStatus } from '../database/entities/User';
import { hashPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import {
  validateRegistrationInput,
} from '../utils/validation';
import {
  ValidationError,
  EmailAlreadyExistsError,
  InternalError,
} from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthController');

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  user_type: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    full_name: string;
    user_type: string;
    verification_status: string;
    created_at: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Handle user registration
 * POST /auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, full_name, user_type } = req.body as RegisterRequest;

    logger.info(`Registration attempt for email: ${email}`);

    // Validate input
    const validation = validateRegistrationInput({
      email,
      password,
      full_name,
      user_type,
    });

    if (!validation.isValid) {
      logger.warn(`Validation failed for registration: ${email}`, validation.errors);
      throw new ValidationError('Registration validation failed', validation.errors);
    }

    // Get database connection
    const dataSource = getConnection();
    const userRepository = dataSource.getRepository(User);

    // Check if email already exists
    const existingUser = await userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      logger.warn(`Registration failed: Email already exists: ${email}`);
      throw new EmailAlreadyExistsError(email);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Normalize user type
    const normalizedUserType = user_type.toLowerCase() as UserType;

    // Create new user
    const newUser = userRepository.create({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name,
      user_type: normalizedUserType,
      verification_status: VerificationStatus.UNVERIFIED,
      notification_preferences: {
        email: true,
        push: false,
      },
    });

    // Save to database
    const savedUser = await userRepository.save(newUser);

    logger.info(`User registered successfully: ${savedUser.id} (${email})`);

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: savedUser.id,
      email: savedUser.email,
      userType: savedUser.user_type,
    });

    const refreshToken = generateRefreshToken({
      userId: savedUser.id,
      email: savedUser.email,
      userType: savedUser.user_type,
    });

    // Prepare response (never include password hash)
    const response: AuthResponse = {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        full_name: savedUser.full_name,
        user_type: savedUser.user_type,
        verification_status: savedUser.verification_status,
        created_at: savedUser.created_at.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle user login
 * POST /auth/login
 * (To be implemented in AUTH-3)
 */
export async function login(
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Implement in AUTH-3
    throw new InternalError('Login endpoint not yet implemented');
  } catch (error) {
    next(error);
  }
}

/**
 * Handle token refresh
 * POST /auth/refresh
 * (To be implemented in AUTH-4)
 */
export async function refreshToken(
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Implement in AUTH-4
    throw new InternalError('Token refresh endpoint not yet implemented');
  } catch (error) {
    next(error);
  }
}

/**
 * Handle logout
 * POST /auth/logout
 * (To be implemented in AUTH-4)
 */
export async function logout(
  _req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Implement in AUTH-4
    throw new InternalError('Logout endpoint not yet implemented');
  } catch (error) {
    next(error);
  }
}
