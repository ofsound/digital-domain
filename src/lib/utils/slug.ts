/**
 * Generate a URL-friendly slug from a string
 * Converts to lowercase, replaces non-alphanumeric chars with hyphens
 * Removes leading/trailing hyphens
 */
export function generateSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Generate a slug for a track from its name
 * Clean, readable URL slug - assumes track names are unique
 */
export function generateTrackSlug(name: string): string {
	return generateSlug(name);
}
