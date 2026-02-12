import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

let dbInstance: NeonHttpDatabase<typeof schema> | null = null;
let sqlInstance: NeonQueryFunction<false, false> | null = null;

function getSql() {
	if (!sqlInstance) {
		if (!DATABASE_URL) {
			throw new Error('DATABASE_URL environment variable is not set');
		}
		sqlInstance = neon(DATABASE_URL);
	}
	return sqlInstance;
}

export function getDb(): NeonHttpDatabase<typeof schema> {
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
