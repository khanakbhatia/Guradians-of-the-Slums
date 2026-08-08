/**
 * utils/queryBuilder.js
 * Shared helpers implementing the pagination/filtering/sorting
 * conventions from docs/API_ARCHITECTURE.md. Every list endpoint
 * (searchUsers today, future resources later) parses req.query through
 * these three functions instead of reinventing the convention per route.
 */

const ApiError = require('./ApiError');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** ?page=1&limit=20 -> { page, limit, skip } (limit is clamped, never errors) */
const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPaginationMeta = ({ page, limit, totalItems }) => {
  const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * ?sort=-createdAt,name -> { createdAt: -1, name: 1 }
 * Throws 400 on any field not in `allowedFields`.
 */
const parseSort = (query, allowedFields, defaultSort) => {
  if (!query.sort) return defaultSort;

  const sortObj = {};
  for (const rawField of query.sort.split(',')) {
    const desc = rawField.startsWith('-');
    const field = desc ? rawField.slice(1) : rawField;
    if (!allowedFields.includes(field)) {
      throw new ApiError(400, `Cannot sort by "${field}". Allowed: ${allowedFields.join(', ')}`);
    }
    sortObj[field] = desc ? -1 : 1;
  }
  return sortObj;
};

const OPERATOR_MAP = { gte: '$gte', lte: '$lte', gt: '$gt', lt: '$lt', ne: '$ne' };

/**
 * Builds a Mongo filter object from whitelisted query params.
 * Supports exact match, comma-separated IN, and bracket operators:
 *   ?status=open                -> { status: 'open' }
 *   ?skills=medical,rescue       -> { skills: { $in: ['medical','rescue'] } }
 *   ?riskScore[gte]=60           -> { riskScore: { $gte: 60 } }
 * Any query param not in `allowedFields` is silently ignored.
 */
const parseFilters = (query, allowedFields) => {
  const filter = {};

  for (const field of allowedFields) {
    // Bracket operators: field[gte]=60
    const bracketMatch = Object.keys(query).filter((k) => k.startsWith(`${field}[`));
    for (const key of bracketMatch) {
      const opMatch = key.match(/\[(\w+)\]$/);
      const op = opMatch && OPERATOR_MAP[opMatch[1]];
      if (!op) continue;
      filter[field] = filter[field] || {};
      const numeric = Number(query[key]);
      filter[field][op] = Number.isNaN(numeric) ? query[key] : numeric;
    }

    // Plain / comma-separated exact match: field=a,b
    if (query[field] !== undefined) {
      const values = String(query[field]).split(',');
      filter[field] = values.length > 1 ? { $in: values } : values[0];
    }
  }

  return filter;
};

module.exports = { parsePagination, buildPaginationMeta, parseSort, parseFilters };
