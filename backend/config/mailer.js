/**
 * config/mailer.js
 * Nodemailer SMTP transporter, configured once and reused. Not in the
 * originally listed stack, but forgot-password/email-verification are
 * unimplementable without an outbound mail channel — nodemailer is the
 * standard choice for Node/Express.
 */

const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_SECURE, // true for port 465, false for 587/STARTTLS
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

module.exports = transporter;
