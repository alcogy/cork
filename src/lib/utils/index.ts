export * from './csv';

export function formatDate(dateString: string | null | undefined, locale = 'en-US'): string {
	if (!dateString) return '—';
	return new Date(dateString).toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export function formatDateTime(dateString: string | null | undefined, locale = 'en-US'): string {
	if (!dateString) return '—';
	return new Date(dateString).toLocaleString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
	if (amount === null || amount === undefined) return '—';
	return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function validateEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function paginate<T>(items: T[], page: number, perPage: number) {
	const total = items.length;
	const totalPages = Math.ceil(total / perPage);
	const start = (page - 1) * perPage;
	return {
		items: items.slice(start, start + perPage),
		total,
		totalPages,
		page,
		perPage
	};
}
