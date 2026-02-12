import { env } from '$env/dynamic/private';

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Use Netlify DB in production, fall back to DATABASE_URL for local development
const connectionString = env.NETLIFY_DATABASE_URL || env.DATABASE_URL;

let dbInstance: NeonHttpDatabase<typeof schema> | null = null;
let sqlInstance: NeonQueryFunction<false, false> | null = null;

function getSql() {
	if (!sqlInstance) {
		if (!connectionString) {
			throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL environment variable is not set');
		}
		sqlInstance = neon(connectionString);
	}
	return sqlInstance;
}

function getDb(): NeonHttpDatabase<typeof schema> {
	if (!dbInstance) {
		dbInstance = drizzle(getSql(), { schema });
	}
	return dbInstance;
}

// For backward compatibility with existing code
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
	get(target, prop) {
		return getDb()[prop as keyof typeof target];
	}
});
