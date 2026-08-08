/**
 * utils/ApiResponse.js
 * Standardized success response shape for controllers, matching the
 * envelope in docs/API_ARCHITECTURE.md: { success, message, data, meta? }.
 * `meta` is only serialized when provided (list endpoints with pagination).
 */

class ApiResponse {
  constructor(statusCode, data, message = 'Success', meta = null) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    if (meta) this.meta = meta;
  }
}

module.exports = ApiResponse;
