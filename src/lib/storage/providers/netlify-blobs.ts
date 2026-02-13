/**
 * Netlify Blobs Storage Provider
 *
 * Stores files using Netlify Blobs (production environment).
 * Requires @netlify/blobs package.
 */

import { getStore, type GetStoreOptions } from '@netlify/blobs';
import { env } from '$env/dynamic/private';

import type { StorageProvider } from '../types';

// Store names for organizing different types of content
const STORES = {
	audio: 'audio-files',
	images: 'images',
	videos: 'videos'
} as const;

/**
 * Parse NETLIFY_BLOBS_CONTEXT if available
 */
function parseBlobsContext(): Partial<GetStoreOptions> | null {
	const context = env.NETLIFY_BLOBS_CONTEXT;
	if (!context) return null;

	try {
		const decoded = Buffer.from(context, 'base64').toString('utf-8');
		const config = JSON.parse(decoded);
		return {
			apiURL: config.apiURL,
			edgeURL: config.edgeURL,
			token: config.token,
			siteID: config.siteID
		};
	} catch {
		return null;
	}
}

/**
 * Get store configuration from environment
 */
function getStoreConfig(): Partial<GetStoreOptions> {
	// Try NETLIFY_BLOBS_CONTEXT first
	const contextConfig = parseBlobsContext();
	if (contextConfig) {
		console.log('[NetlifyBlobs] Using NETLIFY_BLOBS_CONTEXT configuration');
		return contextConfig;
	}

	// Fall back to individual env vars
	if (env.NETLIFY_SITE_ID && env.NETLIFY_API_TOKEN) {
		console.log('[NetlifyBlobs] Using individual env vars configuration');
		return {
			siteID: env.NETLIFY_SITE_ID,
			token: env.NETLIFY_API_TOKEN,
			apiURL: 'https://api.netlify.com'
		};
	}

	// Empty config - let @netlify/blobs try to auto-detect
	console.log('[NetlifyBlobs] Using auto-detection');
	return {};
}

export class NetlifyBlobsProvider implements StorageProvider {
	private storeConfig: Partial<GetStoreOptions>;

	constructor() {
		this.storeConfig = getStoreConfig();
		console.log(
			'[NetlifyBlobs] Store config keys:',
			Object.keys(this.storeConfig).join(', ') || 'none (auto-detect)'
		);
	}

	private getAudioStore() {
		return getStore({
			name: STORES.audio,
			...this.storeConfig
		});
	}

	private getImagesStore() {
		return getStore({
			name: STORES.images,
			...this.storeConfig
		});
	}

	private getVideosStore() {
		return getStore({
			name: STORES.videos,
			...this.storeConfig
		});
	}

	private getStoreForPath(path: string) {
		// Route files to appropriate stores based on path
		if (path.startsWith('images/') || path.includes('/images/')) {
			return this.getImagesStore();
		}
		if (path.startsWith('videos/') || path.includes('/videos/')) {
			return this.getVideosStore();
		}
		return this.getAudioStore();
	}

	/**
	 * Get the public URL for a file
	 */
	getPublicUrl(path: string): string {
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
