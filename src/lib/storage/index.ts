/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for file storage that works with:
 * - Local filesystem (development)
 * - Cloudflare R2, AWS S3, Vercel Blob, etc. (production)
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

import { LocalStorageProvider } from './providers/local';

import type { StorageProvider } from './types';

// import { R2StorageProvider } from './providers/r2'; // Future: Cloudflare R2
// import { BlobStorageProvider } from './providers/blob'; // Future: Vercel Blob

// Storage configuration
// Change this to switch providers
const STORAGE_PROVIDER: 'local' | 'r2' | 'blob' = 'local';

function createStorage(): StorageProvider {
	switch (STORAGE_PROVIDER) {
		case 'local':
			return new LocalStorageProvider();
		// case 'r2':
		// 	return new R2StorageProvider();
		// case 'blob':
		// 	return new BlobStorageProvider();
		default:
			throw new Error(`Unknown storage provider: ${STORAGE_PROVIDER}`);
	}
}

// Singleton instance
export const storage = createStorage();
