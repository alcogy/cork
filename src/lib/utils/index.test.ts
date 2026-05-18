import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatCurrency, validateEmail, clamp, paginate } from './index';

describe('formatDate', () => {
	it('formats a valid ISO date string', () => {
		const result = formatDate('2024-03-15');
		expect(result).toContain('2024');
		expect(result).toContain('15');
	});

	it('returns em-dash for null', () => {
		expect(formatDate(null)).toBe('—');
	});

	it('returns em-dash for undefined', () => {
		expect(formatDate(undefined)).toBe('—');
	});

	it('returns em-dash for empty string', () => {
		expect(formatDate('')).toBe('—');
	});
});

describe('formatDateTime', () => {
	it('formats a valid ISO datetime string', () => {
		const result = formatDateTime('2024-03-15T10:30:00.000Z');
		expect(result).toContain('2024');
	});

	it('returns em-dash for null', () => {
		expect(formatDateTime(null)).toBe('—');
	});

	it('returns em-dash for undefined', () => {
		expect(formatDateTime(undefined)).toBe('—');
	});
});

describe('formatCurrency', () => {
	it('formats a positive number as USD', () => {
		const result = formatCurrency(1234.56);
		expect(result).toContain('1,234');
		expect(result).toContain('56');
	});

	it('formats zero', () => {
		const result = formatCurrency(0);
		expect(result).toContain('0');
	});

	it('returns em-dash for null', () => {
		expect(formatCurrency(null)).toBe('—');
	});

	it('returns em-dash for undefined', () => {
		expect(formatCurrency(undefined)).toBe('—');
	});
});

describe('validateEmail', () => {
	it('accepts valid email addresses', () => {
		expect(validateEmail('user@example.com')).toBe(true);
		expect(validateEmail('admin@corp.co.jp')).toBe(true);
		expect(validateEmail('user+tag@example.org')).toBe(true);
	});

	it('rejects invalid email addresses', () => {
		expect(validateEmail('not-an-email')).toBe(false);
		expect(validateEmail('@example.com')).toBe(false);
		expect(validateEmail('user@')).toBe(false);
		expect(validateEmail('')).toBe(false);
	});
});

describe('clamp', () => {
	it('returns the value when within range', () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});

	it('clamps to min when below range', () => {
		expect(clamp(-5, 0, 10)).toBe(0);
	});

	it('clamps to max when above range', () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});
});

describe('paginate', () => {
	const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

	it('returns correct first page', () => {
		const result = paginate(items, 1, 3);
		expect(result.items).toEqual([1, 2, 3]);
		expect(result.page).toBe(1);
		expect(result.total).toBe(10);
		expect(result.totalPages).toBe(4);
	});

	it('returns correct second page', () => {
		const result = paginate(items, 2, 3);
		expect(result.items).toEqual([4, 5, 6]);
	});

	it('returns partial last page', () => {
		const result = paginate(items, 4, 3);
		expect(result.items).toEqual([10]);
	});

	it('handles empty array', () => {
		const result = paginate([], 1, 10);
		expect(result.items).toEqual([]);
		expect(result.total).toBe(0);
		expect(result.totalPages).toBe(0);
	});

	it('handles single page', () => {
		const result = paginate([1, 2], 1, 10);
		expect(result.items).toEqual([1, 2]);
		expect(result.totalPages).toBe(1);
	});
});
