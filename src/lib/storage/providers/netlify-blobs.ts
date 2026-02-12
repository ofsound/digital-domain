/**
 * Netlify Blobs Storage Provider
 *
 * Stores files using Netlify Blobs (production environment).
 * Requires @netlify/blobs package.
 *
 * Blobs are accessed via Netlify Functions/Edge Functions with automatic
 * environment configuration. No manual token setup needed when running on Netlify.
 */

import { getStore } from '@netlify/blobs';

import type { StorageProvider } from '../types';

// Store names for organizing different types of content
const STORES = {
	audio: 'audio-files',
	images: 'images'
} as const;

export class NetlifyBlobsProvider implements StorageProvider {
	private getAudioStore() {
		return getStore({
			name: STORES.audio
			// Configuration is automatically read from environment when on Netlify
			// No explicit token/siteID needed in production
		});
	}

	private getImagesStore() {
		return getStore({
			name: STORES.images
		});
	}

	private getStoreForPath(path: string) {
		// Route files to appropriate stores based on path
		if (path.startsWith('images/') || path.includes('/images/')) {
			return this.getImagesStore();
		}
		return this.getAudioStore();
	}

	/**
	 * Get the public URL for a file
	 * Note: Netlify Blobs URLs are signed and temporary by default.
	 * For permanent public access, we use a different approach.
	 */
	getPublicUrl(path: string): string {
		// Netlify Blobs doesn't have a permanent public URL by default
		// We'll serve files through a Netlify Function that proxies to Blobs
		// This allows us to use permanent URLs like /api/files/{path}
		const cleanPath = path.replace(/^\//, '');
		return `/api/files/${cleanPath}`;
	}

	/**
	 * Save a file to Netlify Blobs
	 */
	async save(file: File | Buffer | ArrayBuffer, path: string): Promise<string> {
		const store = this.getStoreForPath(path);

		// Convert to ArrayBuffer for Netlify Blobs
		let data: ArrayBuffer;
		if (file instanceof File) {
			data = await file.arrayBuffer();
		} else if (file instanceof ArrayBuffer) {
			data = file;
		} else {
			// Buffer - convert to Uint8Array then get ArrayBuffer
			data = new Uint8Array(file).buffer;
		}

		// Clean path (remove leading slashes)
		const key = path.replace(/^\//, '');

		// Upload to Netlify Blobs
		await store.set(key, data);

		// Return the public URL
		return this.getPublicUrl(path);
	}

	/**
	 * Delete a file from Netlify Blobs
	 */
	async delete(path: string): Promise<void> {
		const store = this.getStoreForPath(path);
		const key = path.replace(/^\//, '');

		try {
			await store.delete(key);
		} catch (error) {
			// Blob doesn't exist, ignore
			if ((error as Error).message?.includes('not found')) {
				return;
			}
			throw error;
		}
	}

	/**
	 * Check if a file exists
	 */
	async exists(path: string): Promise<boolean> {
		const store = this.getStoreForPath(path);
		const key = path.replace(/^\//, '');

		try {
			const blob = await store.get(key, { type: 'arrayBuffer' });
			return blob !== null;
		} catch {
			return false;
		}
	}

	/**
	 * List files in a directory/prefix
	 * Note: Netlify Blobs doesn't support true directory listing,
	 * so we use the list() method with a prefix filter
	 */
	async list(prefix: string = ''): Promise<string[]> {
		const store = this.getStoreForPath(prefix || 'audio/');
		const cleanPrefix = prefix.replace(/^\//, '');

		try {
			const blobs = await store.list({
				prefix: cleanPrefix || undefined
			});

			return blobs.blobs.map((blob) => blob.key);
		} catch {
			return [];
		}
	}
}
