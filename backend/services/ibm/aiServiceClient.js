/**
 * services/ibm/aiServiceClient.js
 * Single HTTP boundary between the Express backend and the Python
 * ai_service (FastAPI + BeeAI + IBM Granite). Every services/ibm/*
 * wrapper goes through this client instead of calling fetch() directly,
 * so retry/timeout/logging/error-mapping behavior lives in exactly one
 * place.
 *
 * ai_service exposes two route groups (see ai_service/app/main.py):
 *   - "M2 facade" routes, mounted at the service root (no prefix) —
 *     /detect, /analyze, /risk-score, /explain, /assign, /evacuate,
 *     /report, /chat. These are simple, JSON-in/JSON-out convenience
 *     endpoints, and are what this client (and every services/ibm/*
 *     wrapper) targets.
 *   - Versioned /api/v1/* routes with richer request/response schemas,
 *     used internally by ai_service and by its own BeeAI MCP tools
 *     (see ai_service/app/integrations/bob_fastapi_client.py, which this
 *     client's method names intentionally mirror).
 *
 * Errors are always normalized to ApiError so callers (and ultimately
 * middlewares/errorHandler.js) can treat an ai_service failure exactly
 * like any other backend error, with no ai_service-specific handling
 * required upstream.
 */

const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { logger } = require('../../utils/logger');

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AIServiceClient {
  constructor({ baseURL, timeoutMs, maxRetries, retryDelayMs } = {}) {
    this.baseURL = (baseURL || env.AI_SERVICE_URL || 'http://127.0.0.1:8001').replace(/\/+$/, '');
    this.timeoutMs = timeoutMs ?? env.AI_SERVICE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = maxRetries ?? env.AI_SERVICE_MAX_RETRIES ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = retryDelayMs ?? env.AI_SERVICE_RETRY_DELAY_MS ?? DEFAULT_RETRY_DELAY_MS;
  }

  /**
   * Reports whether this client has an ai_service base URL configured.
   * A cheap, no-network readiness check, mirroring the shape of
   * IBMServiceBase#isConfigured() so a future health-check endpoint can
   * report on both uniformly.
   */
  isConfigured() {
    return Boolean(this.baseURL);
  }

  /**
   * POST a JSON body to an ai_service route and return the parsed JSON
   * response. Retries on network failures, timeouts, and 5xx responses
   * with exponential backoff; 4xx responses (bad input) are surfaced
   * immediately without retrying, since retrying a malformed request
   * would just fail the same way again.
   *
   * @param {string} path - e.g. '/risk-score' (M2 facade) or '/api/v1/rag/retrieve'
   * @param {object} body
   * @param {{ retries?: number, timeoutMs?: number }} [options]
   */
  async postJSON(path, body, options = {}) {
    const url = `${this.baseURL}${path}`;
    const retries = options.retries ?? this.maxRetries;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const startedAt = Date.now();

      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body ?? {}),
          signal: controller.signal,
        });
        const durationMs = Date.now() - startedAt;
        // eslint-disable-next-line no-await-in-loop
        const parsed = await this._parseResponseBody(response, path);

        if (!response.ok) {
          const message = this._extractErrorMessage(parsed, response.status, path);
          logger.warn('ai_service request returned an error status', {
            path,
            status: response.status,
            attempt,
            durationMs,
            message,
          });

          if (response.status >= 400 && response.status < 500) {
            // Client error (validation, not found, grounding refused, etc.)
            // — not retryable. Surface the ai_service's own status where it
            // maps cleanly onto our API; otherwise fall back to 422.
            throw new ApiError(response.status, message);
          }

          // 5xx from ai_service — retryable.
          throw new ApiError(502, message);
        }

        logger.info('ai_service request succeeded', { path, status: response.status, attempt, durationMs });
        return parsed;
      } catch (err) {
        const durationMs = Date.now() - startedAt;
        const normalized = this._normalizeError(err, path, timeoutMs);
        const retryable = normalized.statusCode >= 500;

        if (!retryable || attempt >= retries) {
          logger.error('ai_service request failed', {
            path,
            attempt,
            durationMs,
            statusCode: normalized.statusCode,
            message: normalized.message,
            final: true,
          });
          throw normalized;
        }

        const delay = this.retryDelayMs * 2 ** attempt;
        logger.warn('ai_service request failed, retrying', {
          path,
          attempt,
          delayMs: delay,
          statusCode: normalized.statusCode,
          message: normalized.message,
        });
        // eslint-disable-next-line no-await-in-loop
        await sleep(delay);
        attempt += 1;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  async _parseResponseBody(response, path) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      logger.error('ai_service returned a non-JSON response body', { path, status: response.status });
      throw new ApiError(502, `AI service returned a non-JSON response for ${path}`);
    }
  }

  /** ai_service's error envelope is { error: { type, message, path } } (see app/core/error_handlers.py); FastAPI validation errors use { detail: [...] }. */
  _extractErrorMessage(parsed, status, path) {
    if (parsed?.error?.message) return parsed.error.message;
    if (typeof parsed?.detail === 'string') return parsed.detail;
    if (Array.isArray(parsed?.detail)) {
      return parsed.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
    }
    return `AI service returned HTTP ${status} for ${path}`;
  }

  _normalizeError(err, path, timeoutMs) {
    if (err instanceof ApiError) return err;
    if (err.name === 'AbortError') {
      return new ApiError(504, `AI service request to ${path} timed out after ${timeoutMs}ms`);
    }
    // Native fetch network failure (connection refused, DNS, etc.)
    return new ApiError(503, `AI service is unavailable (${path}): ${err.message}`);
  }
}

module.exports = {
  AIServiceClient,
  aiServiceClient: new AIServiceClient(),
};
