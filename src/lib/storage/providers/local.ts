/**
 * Local Filesystem Storage Provider
 *
 * Stores files in the local filesystem (development only).
 * Files are stored in the static directory so they can be served directly.
 */

import { writeFile, mkdir, access, unlink, readdir } from 'fs/promises';
import { join, dirname } from 'path';

import type { StorageProvider } from '../types';

const STATIC_DIR = 'static';

export class LocalStorageProvider implements StorageProvider {
	private basePath: string;

	constructor() {
		// In development, store in static/ so files are served automatically
		this.basePath = join(process.cwd(), STATIC_DIR);
	}

	/**
	 * Get the full path for a file
	 */
	private getFullPath(path: string): string {
		return join(this.basePath, path);
	}

	/**
	 * Get the public URL for a file
	 */
	getPublicUrl(path: string): string {
		// Remove any leading slash and ensure path starts with /
		const cleanPath = path.replace(/^\//, '');
		return `/${cleanPath}`;
	}

	/**
	 * Save a file to local storage
	 */
	async save(file: File | Buffer | ArrayBuffer, path: string): Promise<string> {
		const fullPath = this.getFullPath(path);

		// Ensure directory exists
		await mkdir(dirname(fullPath), { recursive: true });

		// Convert file to buffer
		let buffer: Buffer;
		if (file instanceof File) {
			const arrayBuffer = await file.arrayBuffer();
			buffer = Buffer.from(arrayBuffer);
		} else if (file instanceof ArrayBuffer) {
			buffer = Buffer.from(file);
		} else {
			buffer = file;
		}

		// Write file
		await writeFile(fullPath, buffer);

		// Return public URL
		return this.getPublicUrl(path);
	}

	/**
	 * Delete a file from local storage
	 */
	async delete(path: string): Promise<void> {
		const fullPath = this.getFullPath(path);
		try {
			await unlink(fullPath);
		} catch (error) {
			// File doesn't exist, ignore
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw error;
			}
		}
	}

	/**
	 * Check if a file exists
	 */
	async exists(path: string): Promise<boolean> {
		const fullPath = this.getFullPath(path);
		try {
			await access(fullPath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * List files in a directory
	 */
	async list(prefix: string = ''): Promise<string[]> {
		const fullPath = this.getFullPath(prefix);
		try {
			const entries = await readdir(fullPath, { recursive: true });
			// Filter to only return files (not directories)
			const files: string[] = [];
			for (const entry of entries) {
				const entryPath = join(fullPath, entry);
				try {
					const stats = await import('fs').then((fs) => fs.statSync(entryPath));
					if (stats.isFile()) {
						files.push(join(prefix, entry).replace(/\\/g, '/'));
					}
				} catch {
					// Ignore errors for individual entries
				}
			}
			return files;
		} catch {
			return [];
		}
	}
}
