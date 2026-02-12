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

/**
 * Detect if we're running in production on Netlify
 * Uses multiple detection methods for reliability
 */
function isNetlifyProduction(): boolean {
	// Check for Netlify environment variables at runtime
	const hasNetlifyEnv = !!(env.NETLIFY || env.NETLIFY_BLOBS_CONTEXT || env.NETLIFY_SITE_ID);

	// Check if we're in a serverless environment (Netlify Functions use /var/task)
	const isServerlessEnvironment =
		typeof process !== 'undefined' && process.cwd && process.cwd().includes('/var/task');

	return hasNetlifyEnv || isServerlessEnvironment;
}

/**
 * Create the appropriate storage provider based on environment
 */
function createStorage(): StorageProvider {
	// Use Netlify Blobs in production on Netlify
	if (isNetlifyProduction()) {
		console.log('[Storage] Using NetlifyBlobsProvider for production');
		return new NetlifyBlobsProvider();
	}

	// Default to local filesystem for development and other environments
	console.log('[Storage] Using LocalStorageProvider for development');
	return new LocalStorageProvider();
}

// Singleton instance
export const storage = createStorage();
