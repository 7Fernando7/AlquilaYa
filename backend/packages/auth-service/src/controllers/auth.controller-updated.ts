import { Request, Response, NextFunction } from 'express';
import { getConnection } from '../database/connection';
import { User, UserType } from '../database/entities/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import {
  validateRegistrationInput,
  isValidUserType,
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

export interface LoginRequest {
  email: string;
  password: string;
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
      verification_status: 'unverified',
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
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body as LoginRequest;

    logger.info(`Login attempt for email: ${email}`);

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required', {
        email: email ? undefined : 'Email is required',
        password: password ? undefined : 'Password is required',
      });
    }

    // Get database connection
    const dataSource = getConnection();
    const userRepository = dataSource.getRepository(User);

    // Find user by email (case-insensitive)
    const user = await userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Generic error message to prevent user enumeration
    const invalidCredentialsError = new ValidationError(
      'Invalid email or password'
    );

    if (!user) {
      logger.warn(`Login failed: User not found: ${email}`);
      // Don't reveal if user exists
      throw invalidCredentialsError;
    }

    // Check if account is active (not soft deleted)
    if (user.deleted_at) {
      logger.warn(`Login failed: Account deleted: ${email}`);
      throw invalidCredentialsError;
    }

    // Compare passwords (timing-safe comparison)
    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      logger.warn(`Login failed: Invalid password for: ${email}`);
      // Don't reveal specific issue
      throw invalidCredentialsError;
    }

    logger.info(`Login successful: ${user.id} (${email})`);

    // Update last login timestamp
    user.updated_at = new Date();
    await userRepository.save(user);

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
    });

    // Prepare response
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
        verification_status: user.verification_status,
        created_at: user.created_at.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };

    res.status(200).json(response);
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
  req: Request,
  res: Response,
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // TODO: Implement in AUTH-4
    throw new InternalError('Logout endpoint not yet implemented');
  } catch (error) {
    next(error);
  }
}
