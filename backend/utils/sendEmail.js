/**
 * utils/sendEmail.js
 * Thin wrapper around the mailer transport plus the two auth email
 * templates. Kept deliberately plain-text/minimal-HTML — swap in a
 * templating engine later without touching callers.
 */

const transporter = require('../config/mailer');
const env = require('../config/env');

const sendEmail = async ({ to, subject, html, text }) => {
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
};

const sendVerificationEmail = async (user, rawToken) => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your email address',
    text: `Hi ${user.name}, verify your email: ${verifyUrl} (expires in ${env.EMAIL_VERIFICATION_TTL_HOURS}h)`,
    html: `<p>Hi ${user.name},</p><p>Please verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hour(s).</p>`,
  });
};

const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    text: `Hi ${user.name}, reset your password: ${resetUrl} (expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes). If you didn't request this, ignore this email.`,
    html: `<p>Hi ${user.name},</p><p>Reset your password using the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.</p>`,
  });
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
