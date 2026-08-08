/**
 * config/validateEnv.js
 * Startup validation — fails fast, before the process does anything else,
 * if a variable the app cannot function without is missing. A misconfigured
 * deploy should refuse to boot with one clear message, not start
 * successfully and fail confusingly on whichever request first touches
 * the missing value.
 *
 * Two tiers, deliberately: REQUIRED vars abort startup entirely.
 * RECOMMENDED vars only log a warning — those back specific features
 * (file uploads, outbound email) that can be legitimately absent in a
 * given environment (e.g. a preview deploy with no Cloudinary account)
 * without the whole API being unusable.
 */

const env = require('./env');
const { logger } = require('../utils/logger');

const REQUIRED_VARS = ['MONGO_URI', 'JWT_SECRET'];

const RECOMMENDED_VARS = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASS',
];

const validateEnv = () => {
  const missingRequired = REQUIRED_VARS.filter((key) => !env[key]);
  if (missingRequired.length > 0) {
    // Logger may itself depend on env in ways that aren't broken by a
    // missing Mongo URI/JWT secret, but stderr is the one channel
    // guaranteed to work even if something upstream of logging is wrong.
    // eslint-disable-next-line no-console
    console.error(
      `FATAL: missing required environment variable(s): ${missingRequired.join(', ')}. ` +
        'See .env.example for the full list. Refusing to start.'
    );
    process.exit(1);
  }

  const missingRecommended = RECOMMENDED_VARS.filter((key) => !env[key]);
  if (missingRecommended.length > 0) {
    logger.warn('Starting without some recommended configuration — related features will be degraded', {
      missing: missingRecommended,
    });
  }
};

module.exports = { validateEnv, REQUIRED_VARS, RECOMMENDED_VARS };
