export function objectsToCsv(data: Record<string, unknown>[], headers?: string[]): string {
	if (data.length === 0) return '';

	const keys = headers ?? Object.keys(data[0]);
	const rows = [keys.join(',')];

	for (const row of data) {
		const values = keys.map((key) => {
			const val = row[key];
			if (val === null || val === undefined) return '';
			const str = String(val);
			return str.includes(',') || str.includes('"') || str.includes('\n')
				? `"${str.replace(/"/g, '""')}"`
				: str;
		});
		rows.push(values.join(','));
	}

	return rows.join('\n');
}

export function csvToObjects(csv: string): Record<string, string>[] {
	const lines = csv.split('\n').filter((line) => line.trim());
	if (lines.length < 2) return [];

	const headers = parseCsvLine(lines[0]);
	return lines.slice(1).map((line) => {
		const values = parseCsvLine(line);
		return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
	});
}

function parseCsvLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current);
	return result;
}
