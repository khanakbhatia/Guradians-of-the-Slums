/**
 * config/db.js
 * MongoDB connection setup via Mongoose. Connection lifecycle events go
 * to the dedicated database/ log channel. Verbose per-query debug
 * logging is opt-in (env.MONGO_DEBUG_LOGGING) — see config/env.js for
 * why it's off by default.
 */

const mongoose = require('mongoose');
const env = require('./env');
const { databaseLogger } = require('../utils/logger');

const connectDB = async () => {
  mongoose.connection.on('connected', () => {
    databaseLogger.info('MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    databaseLogger.error('MongoDB connection error', { message: err.message });
  });
  mongoose.connection.on('disconnected', () => {
    databaseLogger.warn('MongoDB disconnected');
  });

  if (env.MONGO_DEBUG_LOGGING) {
    mongoose.set('debug', (collectionName, method, query) => {
      databaseLogger.debug('query', { collection: collectionName, method, query });
    });
  }

  await mongoose.connect(env.MONGO_URI);
};

module.exports = connectDB;
