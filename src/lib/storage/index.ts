/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for file storage that works with:
 * - Local filesystem (development)
 * - Netlify Blobs (production on Netlify)
 *
 * Usage:
 *   import { storage } from '$lib/storage';
 *
 *   // Save a file
 *   const path = await storage.save(file, 'audio/myfile.mp3');
 *
 *   // Get public URL
 *   const url = storage.getPublicUrl('audio/myfile.mp3');
 *
 *   // Delete a file
 *   await storage.delete('audio/myfile.mp3');
 *
 *   // List files in a directory
 *   const files = await storage.list('audio/');
 */

import { env } from '$env/dynamic/private';
import { LocalStorageProvider } from './providers/local';
import { NetlifyBlobsProvider } from './providers/netlify-blobs';

import type { StorageProvider } from './types';

// Cache the provider instance
let storageInstance: StorageProvider | null = null;

/**
 * Detect if we're running in production on Netlify
 */
function isNetlifyProduction(): boolean {
	// Check environment variables
	const hasNetlifyEnv = !!(env.NETLIFY || env.NETLIFY_BLOBS_CONTEXT || env.NETLIFY_SITE_ID);

	// Check if we're in a serverless environment
	const isServerless =
		typeof process !== 'undefined' && process.cwd && process.cwd().includes('/var/task');

	return hasNetlifyEnv || isServerless;
}

/**
 * Get or create the storage provider
 * Uses lazy initialization to ensure env vars are available
 */
function getStorage(): StorageProvider {
	if (!storageInstance) {
		if (isNetlifyProduction()) {
			console.log('[Storage] Initializing NetlifyBlobsProvider');
			storageInstance = new NetlifyBlobsProvider();
		} else {
			console.log('[Storage] Initializing LocalStorageProvider');
			storageInstance = new LocalStorageProvider();
		}
	}
	return storageInstance;
}

/**
 * Storage proxy that lazily initializes the provider
 * This ensures environment variables are available when checked
 */
export const storage: StorageProvider = {
	save: (file, path) => getStorage().save(file, path),
	getPublicUrl: (path) => getStorage().getPublicUrl(path),
	delete: (path) => getStorage().delete(path),
	exists: (path) => getStorage().exists(path),
	list: (prefix) => getStorage().list(prefix)
};
