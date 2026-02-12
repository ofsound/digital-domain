# Storage Abstraction

This directory contains a storage abstraction layer that allows you to easily switch between different storage providers.

## Current Setup

**Provider:** Local Filesystem (Development)

Files are stored in: `static/audio/`

This makes them automatically available at: `/audio/filename.mp3`

## Usage

### Upload a file

```typescript
import { storage } from '$lib/storage';

// Save a file
const url = await storage.save(file, 'myfile.mp3');
// Returns: /audio/myfile.mp3
```

### Get public URL

```typescript
const url = storage.getPublicUrl('myfile.mp3');
// Returns: /audio/myfile.mp3
```

### Delete a file

```typescript
await storage.delete('myfile.mp3');
```

### List files

```typescript
const files = await storage.list();
// Returns: ['file1.mp3', 'file2.mp3']
```

## Switching to Cloud Storage

To switch to a cloud storage provider (e.g., Cloudflare R2), follow these steps:

### 1. Install required packages

```bash
npm install @aws-sdk/client-s3
```

### 2. Create the R2 provider

Create `src/lib/storage/providers/r2.ts`:

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import type { StorageProvider } from '../types';

export class R2StorageProvider implements StorageProvider {
	private client: S3Client;
	private bucket: string;
	private publicUrl: string;

	constructor() {
		this.client = new S3Client({
			region: 'auto',
			endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: process.env.R2_ACCESS_KEY_ID!,
				secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!
			}
		});
		this.bucket = process.env.R2_BUCKET_NAME!;
		this.publicUrl = process.env.R2_PUBLIC_URL!;
	}

	async save(file: File | Buffer | ArrayBuffer, path: string): Promise<string> {
		// Implementation
	}

	getPublicUrl(path: string): string {
		return `${this.publicUrl}/${path}`;
	}

	async delete(path: string): Promise<void> {
		// Implementation
	}

	async exists(path: string): Promise<boolean> {
		// Implementation
	}

	async list(prefix?: string): Promise<string[]> {
		// Implementation
	}
}
```

### 3. Update the storage configuration

Edit `src/lib/storage/index.ts`:

```typescript
// Change this line
const STORAGE_PROVIDER: 'local' | 'r2' | 'blob' = 'r2';

// And uncomment the R2 import
import { R2StorageProvider } from './providers/r2';
```

### 4. Add environment variables

Create `.env`:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-domain.com
```

## Supported Providers

- **Local** - Files stored in `static/audio/` (development only)
- **R2** - Cloudflare R2 object storage (production recommended)
- **Blob** - Vercel Blob storage (coming soon)
- **S3** - AWS S3 (coming soon)

## Track Store

Track metadata is stored separately from audio files. Currently using an in-memory store for development. To use a database:

1. Set up Neon Postgres
2. Replace `src/lib/server/db/track-store.ts` with database queries
3. The storage abstraction remains the same
