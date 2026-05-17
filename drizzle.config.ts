import { defineConfig } from 'drizzle-kit';

const hasRemoteCredentials =
	process.env.CLOUDFLARE_ACCOUNT_ID &&
	process.env.CLOUDFLARE_DATABASE_ID &&
	process.env.CLOUDFLARE_D1_TOKEN;

export default defineConfig(
	hasRemoteCredentials
		? {
				schema: './src/lib/server/db/schema.ts',
				dialect: 'sqlite',
				driver: 'd1-http',
				dbCredentials: {
					accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
					databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
					token: process.env.CLOUDFLARE_D1_TOKEN!
				},
				out: './drizzle',
				verbose: true,
				strict: true
			}
		: {
				schema: './src/lib/server/db/schema.ts',
				dialect: 'sqlite',
				out: './drizzle',
				verbose: true,
				strict: true
			}
);
