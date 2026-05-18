import { describe, it, expect } from 'vitest';
import { csvToObjects, objectsToCsv } from './csv';

describe('csvToObjects', () => {
	it('parses a simple CSV', () => {
		const csv = 'name,email\nAlice,alice@example.com\nBob,bob@example.com';
		const result = csvToObjects(csv);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ name: 'Alice', email: 'alice@example.com' });
		expect(result[1]).toEqual({ name: 'Bob', email: 'bob@example.com' });
	});

	it('handles quoted fields with commas', () => {
		const csv = 'name,address\nAlice,"Tokyo, Japan"';
		const result = csvToObjects(csv);
		expect(result[0].address).toBe('Tokyo, Japan');
	});

	it('handles escaped quotes inside quoted fields', () => {
		const csv = 'name,note\nAlice,"She said ""hello"""';
		const result = csvToObjects(csv);
		expect(result[0].note).toBe('She said "hello"');
	});

	it('returns empty array for header-only CSV', () => {
		const csv = 'name,email';
		expect(csvToObjects(csv)).toEqual([]);
	});

	it('returns empty array for empty string', () => {
		expect(csvToObjects('')).toEqual([]);
	});

	it('handles missing values as empty strings', () => {
		const csv = 'name,email,tel\nAlice,,080-0000-0000';
		const result = csvToObjects(csv);
		expect(result[0].email).toBe('');
		expect(result[0].tel).toBe('080-0000-0000');
	});
});

describe('objectsToCsv', () => {
	it('generates a simple CSV', () => {
		const data = [
			{ name: 'Alice', email: 'alice@example.com' },
			{ name: 'Bob', email: 'bob@example.com' }
		];
		const result = objectsToCsv(data);
		expect(result).toContain('name,email');
		expect(result).toContain('Alice,alice@example.com');
		expect(result).toContain('Bob,bob@example.com');
	});

	it('quotes values containing commas', () => {
		const data = [{ name: 'Alice', address: 'Tokyo, Japan' }];
		const result = objectsToCsv(data);
		expect(result).toContain('"Tokyo, Japan"');
	});

	it('escapes double quotes in values', () => {
		const data = [{ name: 'Alice', note: 'She said "hello"' }];
		const result = objectsToCsv(data);
		expect(result).toContain('"She said ""hello"""');
	});

	it('uses custom headers when provided', () => {
		const data = [{ name: 'Alice', email: 'a@b.com', extra: 'ignored' }];
		const result = objectsToCsv(data, ['name', 'email']);
		expect(result).not.toContain('extra');
		expect(result.split('\n')[0]).toBe('name,email');
	});

	it('returns empty string for empty array', () => {
		expect(objectsToCsv([])).toBe('');
	});

	it('handles null and undefined values as empty strings', () => {
		const data = [{ name: 'Alice', email: null as unknown as string }];
		const result = objectsToCsv(data);
		const rows = result.split('\n');
		expect(rows[1]).toBe('Alice,');
	});

	it('round-trips through csvToObjects', () => {
		const original = [
			{ name: 'Alice', email: 'alice@example.com', note: 'Hello, world' },
			{ name: 'Bob', email: 'bob@example.com', note: '' }
		];
		const csv = objectsToCsv(original);
		const parsed = csvToObjects(csv);
		expect(parsed).toHaveLength(2);
		expect(parsed[0].name).toBe('Alice');
		expect(parsed[0].note).toBe('Hello, world');
		expect(parsed[1].name).toBe('Bob');
	});
});
