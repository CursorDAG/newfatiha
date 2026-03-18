/**
 * Environment variable validation
 *
 * This module validates required environment variables at startup.
 * If any required variable is missing, the application will fail fast
 * with a clear error message instead of failing at runtime.
 */

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (!value && required) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env file and ensure ${key} is set.\n` +
      `See .env.example for reference.`
    );
  }

  return value || '';
}

function validateEnvVars() {
  // Required variables
  const required = {
    DATABASE_URL: getEnvVar('DATABASE_URL'),
    NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET'),
    NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL'),
  };

  // Validate NEXTAUTH_SECRET is not a placeholder
  if (required.NEXTAUTH_SECRET.includes('your-secret-here') ||
      required.NEXTAUTH_SECRET.includes('fallback') ||
      required.NEXTAUTH_SECRET.length < 32) {
    throw new Error(
      'NEXTAUTH_SECRET must be a secure random string (at least 32 characters).\n' +
      'Generate one with: openssl rand -base64 32'
    );
  }

  // Validate DATABASE_URL format
  if (!required.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL must be a valid PostgreSQL connection string.\n' +
      'Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
    );
  }

  // Optional variables (with defaults or warnings)
  const optional = {
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  return { ...required, ...optional };
}

// Validate on module load (server-side only)
let env: ReturnType<typeof validateEnvVars>;

if (typeof window === 'undefined') {
  try {
    env = validateEnvVars();
    console.log('✓ Environment variables validated successfully');
  } catch (error) {
    console.error('✗ Environment validation failed:');
    console.error((error as Error).message);
    process.exit(1);
  }
}

export { env };
