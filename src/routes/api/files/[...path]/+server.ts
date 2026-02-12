import { getStore } from '@netlify/blobs';
import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

/**
 * Serve files from Netlify Blobs
 * This endpoint proxies requests to Netlify Blobs and serves the content
 *
 * Note: This route only works in production on Netlify.
 * In development, files are served directly from the static directory.
 */
export const GET: RequestHandler = async ({ params }) => {
	// Get the file path from the URL
	const filePath = params.path;

	if (!filePath) {
		error(400, 'No file path provided');
	}

	try {
		// Determine which store to use based on path
		const storeName = filePath.startsWith('images/') ? 'images' : 'audio-files';
		const store = getStore({ name: storeName });

		// Fetch the blob
		const blob = await store.get(filePath, { type: 'arrayBuffer' });

		if (!blob) {
			error(404, 'File not found');
		}

		// Determine content type based on file extension
		const contentType = getContentType(filePath);

		// Return the file with appropriate headers
		return new Response(blob, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
			}
		});
	} catch (err) {
		console.error('Error serving file from blobs:', err);
		error(500, 'Failed to serve file');
	}
};

/**
 * Get content type based on file extension
 */
function getContentType(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase();

	const mimeTypes: Record<string, string> = {
		mp3: 'audio/mpeg',
		wav: 'audio/wav',
		ogg: 'audio/ogg',
		m4a: 'audio/mp4',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		svg: 'image/svg+xml'
	};

	return mimeTypes[ext || ''] || 'application/octet-stream';
}
