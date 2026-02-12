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

import { LocalStorageProvider } from './providers/local';
import { NetlifyBlobsProvider } from './providers/netlify-blobs';

import type { StorageProvider } from './types';

/**
 * Detect if we're running in production on Netlify
 */
function isNetlifyProduction(): boolean {
	// Check for Netlify environment variables
	return !!(
		process.env.NETLIFY ||
		process.env.NETLIFY_BLOBS_CONTEXT ||
		process.env.NETLIFY_SITE_ID
	);
}

/**
 * Create the appropriate storage provider based on environment
 */
function createStorage(): StorageProvider {
	// Use Netlify Blobs in production on Netlify
	if (isNetlifyProduction()) {
		return new NetlifyBlobsProvider();
	}

	// Default to local filesystem for development and other environments
	return new LocalStorageProvider();
}

// Singleton instance
export const storage = createStorage();
