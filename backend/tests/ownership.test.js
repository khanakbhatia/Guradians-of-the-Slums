/**
 * tests/ownership.test.js
 * Unit tests for the helper extracted during the duplicate-code audit
 * (previously reimplemented separately in citizenReport.service.js,
 * media.service.js, and user.service.js).
 */

const { isOwnerOrAdmin, assertOwnerOrAdmin } = require('../utils/ownership');

describe('isOwnerOrAdmin', () => {
  it('returns true when the actor owns the resource', () => {
    expect(isOwnerOrAdmin({ id: 'u1', role: 'citizen' }, 'u1')).toBe(true);
  });

  it('returns true when the actor is an admin, regardless of ownership', () => {
    expect(isOwnerOrAdmin({ id: 'u2', role: 'admin' }, 'u1')).toBe(true);
  });

  it('returns false when the actor neither owns the resource nor is an admin', () => {
    expect(isOwnerOrAdmin({ id: 'u2', role: 'citizen' }, 'u1')).toBe(false);
  });

  it('compares ids as strings, so an ObjectId-vs-string mismatch still matches', () => {
    const objectIdLike = { toString: () => 'u1' };
    expect(isOwnerOrAdmin({ id: 'u1', role: 'citizen' }, objectIdLike)).toBe(true);
  });
});

describe('assertOwnerOrAdmin', () => {
  it('does not throw for the owner', () => {
    expect(() => assertOwnerOrAdmin({ id: 'u1', role: 'citizen' }, 'u1', 'nope')).not.toThrow();
  });

  it('does not throw for an admin', () => {
    expect(() => assertOwnerOrAdmin({ id: 'u2', role: 'admin' }, 'u1', 'nope')).not.toThrow();
  });

  it('throws a 403 ApiError with the given message for anyone else', () => {
    try {
      assertOwnerOrAdmin({ id: 'u2', role: 'citizen' }, 'u1', 'Only the owner can do this');
      throw new Error('expected assertOwnerOrAdmin to throw');
    } catch (err) {
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Only the owner can do this');
    }
  });
});
