import { browser } from '$app/environment';
import { en } from './en';
import { ja } from './ja';

export type Locale = 'en' | 'ja';

export const LOCALES: { value: Locale; label: string; nativeLabel: string }[] = [
	{ value: 'en', label: 'English', nativeLabel: 'English' },
	{ value: 'ja', label: 'Japanese', nativeLabel: '日本語' }
];

const STORAGE_KEY = 'cork_lang';

let locale: Locale = $state('en');

if (browser) {
	const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
	if (saved === 'en' || saved === 'ja') {
		locale = saved;
		document.documentElement.lang = saved;
	}
}

export function getLocale(): Locale {
	return locale;
}

export function setLocale(l: Locale) {
	locale = l;
	if (browser) {
		localStorage.setItem(STORAGE_KEY, l);
		document.documentElement.lang = l;
		document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000; SameSite=Lax`;
	}
}

export function t() {
	return locale === 'ja' ? ja : en;
}
