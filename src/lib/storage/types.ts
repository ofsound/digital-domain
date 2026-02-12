/**
 * Storage Provider Types
 */

export interface StorageProvider {
	/**
	 * Save a file to storage
	 * @param file - The file to save
	 * @param path - The path/key where the file should be stored
	 * @returns The public URL or path to the saved file
	 */
	save(file: File | Buffer | ArrayBuffer, path: string): Promise<string>;

	/**
	 * Get the public URL for a file
	 * @param path - The path/key of the file
	 * @returns The public URL
	 */
	getPublicUrl(path: string): string;

	/**
	 * Delete a file from storage
	 * @param path - The path/key of the file to delete
	 */
	delete(path: string): Promise<void>;

	/**
	 * Check if a file exists
	 * @param path - The path/key to check
	 * @returns true if the file exists
	 */
	exists(path: string): Promise<boolean>;

	/**
	 * List files in a directory/prefix
	 * @param prefix - The directory/prefix to list
	 * @returns Array of file paths
	 */
	list(prefix?: string): Promise<string[]>;
}

export interface StorageConfig {
	provider: 'local' | 'r2' | 'blob' | 's3';
	local?: {
		basePath: string;
		baseUrl: string;
	};
	r2?: {
		accountId: string;
		accessKeyId: string;
		secretAccessKey: string;
		bucketName: string;
		publicUrl: string;
	};
	blob?: {
		token: string;
	};
	s3?: {
		region: string;
		accessKeyId: string;
		secretAccessKey: string;
		bucketName: string;
	};
}
