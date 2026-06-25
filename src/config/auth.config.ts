import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? (() => { throw new Error('JWT_ACCESS_SECRET is required') })(),
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? (() => { throw new Error('JWT_REFRESH_SECRET is required') })(),
  accessExpiration: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
  refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? '5', 10),
  lockoutDurationMinutes: parseInt(process.env.AUTH_LOCKOUT_DURATION_MINUTES ?? '15', 10),
  dummyHash: process.env.AUTH_DUMMY_HASH ?? '$2b$10$3yF.6RkG5CqM7lX/E9e0mOz5g2R3v4w5x6y7z8a9b0c1d2e3f4g5h',
}));
