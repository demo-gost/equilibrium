import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { ActivityLog } from '../models/ActivityLog';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { createError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  timezone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

const SALT_ROUNDS = 12;

export class AuthService {
  async register(dto: RegisterDto) {
    const existingUser = await User.findOne({ email: dto.email.toLowerCase() });
    if (existingUser) {
      throw createError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = new User({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      timezone: dto.timezone || 'UTC',
    });

    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'user_registered',
      entityType: 'user',
      entityId: user._id,
    });

    const payload = { userId: user._id.toString(), email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`User registered: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await User.findOne({ email: dto.email.toLowerCase() }).select('+passwordHash +refreshToken');
    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw createError('Invalid email or password', 401);
    }

    const payload = { userId: user._id.toString(), email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      action: 'user_login',
      entityType: 'user',
      entityId: user._id,
      ip,
    });

    logger.info(`User logged in: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refreshTokens(token: string) {
    try {
      const decoded = verifyRefreshToken(token);
      const user = await User.findById(decoded.userId).select('+refreshToken');

      if (!user || user.refreshToken !== token) {
        throw createError('Invalid refresh token', 401);
      }

      const payload = { userId: user._id.toString(), email: user.email, role: user.role };
      const accessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      user.refreshToken = newRefreshToken;
      await user.save();

      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw createError('Invalid or expired refresh token', 401);
    }
  }

  async logout(userId: string) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    await ActivityLog.create({
      userId,
      action: 'user_logout',
      entityType: 'user',
    });
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw createError('User not found', 404);
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, updates: Partial<IUser>) {
    // Prevent sensitive field updates through this method
    const { passwordHash, refreshToken, role, ...safeUpdates } = updates as Record<string, unknown>;
    void passwordHash; void refreshToken; void role;

    const user = await User.findByIdAndUpdate(userId, safeUpdates, { new: true, runValidators: true });
    if (!user) throw createError('User not found', 404);

    await ActivityLog.create({
      userId,
      action: 'preferences_updated',
      entityType: 'user',
    });

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: IUser) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      role: user.role,
      studyPreferences: user.studyPreferences,
      dailyStudyLimitHours: user.dailyStudyLimitHours,
      sleepSchedule: user.sleepSchedule,
      breakPreferences: user.breakPreferences,
      notificationPreferences: user.notificationPreferences,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
