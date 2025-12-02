import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter - applies to all API routes
 * Prevents abuse by limiting requests per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Maximum 100 requests per IP per window
    message: 'Muitas requisições de este IP. Tente novamente em 15 minutos.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 login attempts per IP
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins against limit
});

/**
 * Rate limiter for password changes
 * Prevents password brute forcing
 */
export const passwordChangeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Maximum 3 password change attempts per hour
    message: 'Muitas tentativas de alteração de senha. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for resource creation endpoints
 * Prevents spam and abuse
 */
export const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Maximum 50 creations per hour
    message: 'Limite de criações atingido. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for user registration
 * Strict limit to prevent spam accounts
 */
export const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Maximum 10 user registrations per hour
    message: 'Limite de cadastros atingido. Tente novamente em 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});
