import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, hashPassword, verifyPassword } from './index';

describe('validatePasswordStrength', () => {
	it('accepts passwords of 8 characters or more', () => {
		expect(validatePasswordStrength('password')).toBeNull();
		expect(validatePasswordStrength('averylongpassword')).toBeNull();
		expect(validatePasswordStrength('12345678')).toBeNull();
	});

	it('rejects passwords shorter than 8 characters', () => {
		expect(validatePasswordStrength('short')).not.toBeNull();
		expect(validatePasswordStrength('1234567')).not.toBeNull();
		expect(validatePasswordStrength('')).not.toBeNull();
	});

	it('returns a string error message on failure', () => {
		const result = validatePasswordStrength('abc');
		expect(typeof result).toBe('string');
		expect(result!.length).toBeGreaterThan(0);
	});
});

describe('hashPassword / verifyPassword', () => {
	it('hashes a password and verifies it correctly', async () => {
		const password = 'MySecurePass123';
		const hash = await hashPassword(password);

		expect(typeof hash).toBe('string');
		expect(hash).toContain(':');

		const isValid = await verifyPassword(password, hash);
		expect(isValid).toBe(true);
	});

	it('rejects an incorrect password', async () => {
		const hash = await hashPassword('correct-password');
		const isValid = await verifyPassword('wrong-password', hash);
		expect(isValid).toBe(false);
	});

	it('produces different hashes for the same password (salt randomness)', async () => {
		const password = 'same-password';
		const hash1 = await hashPassword(password);
		const hash2 = await hashPassword(password);
		expect(hash1).not.toBe(hash2);
	});

	it('stores hash in salt:hash format', async () => {
		const hash = await hashPassword('test-password');
		const parts = hash.split(':');
		expect(parts).toHaveLength(2);
		expect(parts[0].length).toBeGreaterThan(0); // salt hex
		expect(parts[1].length).toBeGreaterThan(0); // hash hex
	});
});
