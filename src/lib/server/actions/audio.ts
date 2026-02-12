import { storage } from '$lib/storage';
import { trackStore } from '$lib/server/db/track-store';
import { generateTrackSlug } from '$lib/utils/slug';

/**
 * Upload a track with all its associated files
 */
export async function uploadTrack({ request }: { request: Request }) {
	try {
		const formData = await request.formData();
		const mainAudio = formData.get('audio') as File;
		const name = formData.get('name') as string;
		const description = formData.get('description') as string;

		// Handle multiple images
		const images: File[] = [];
		const imageEntries = formData.getAll('images');
		for (const entry of imageEntries) {
			if (entry instanceof File && entry.size > 0) {
				images.push(entry);
			}
		}

		// Handle multiple additional audio files
		const additionalAudio: File[] = [];
		const audioEntries = formData.getAll('additionalAudio');
		for (const entry of audioEntries) {
			if (entry instanceof File && entry.size > 0) {
				additionalAudio.push(entry);
			}
		}

		if (!mainAudio || mainAudio.size === 0) {
			return {
				success: false,
				error: 'No main audio file provided'
			};
		}

		// Validate main audio file type
		if (!mainAudio.type.includes('audio/mpeg') && !mainAudio.name.endsWith('.mp3')) {
			return {
				success: false,
				error: 'Main audio file must be MP3'
			};
		}

		// Generate safe filename for main audio
		const timestamp = Date.now();
		const safeName = name.replace(/[^a-zA-Z0-9\-_]/g, '_');
		const mainAudioFilename = `${timestamp}_${safeName}.mp3`;

		// Save main audio file
		const mainAudioUrl = await storage.save(mainAudio, mainAudioFilename);

		// Generate unique slug
		const slug = generateTrackSlug(name || 'untitled');

		// Create track in database
		const track = await trackStore.create({
			name: name || 'Untitled Track',
			slug,
			url: mainAudioUrl,
			description: description || ''
		});

		// Upload and save images
		const uploadedImages = [];
		for (let i = 0; i < images.length; i++) {
			const image = images[i];
			const imageExt = image.name.split('.').pop() || 'jpg';
			const imageFilename = `${timestamp}_${safeName}_image_${i}.${imageExt}`;
			const imageUrl = await storage.save(image, `images/${imageFilename}`);

			const savedImage = await trackStore.addImage(track.id, {
				url: imageUrl,
				caption: ''
			});
			uploadedImages.push(savedImage);
		}

		// Upload and save additional audio files
		const uploadedAudioFiles = [];
		for (let i = 0; i < additionalAudio.length; i++) {
			const audio = additionalAudio[i];
			const audioFilename = `${timestamp}_${safeName}_audio_${i}.mp3`;
			const audioUrl = await storage.save(audio, audioFilename);

			const savedAudio = await trackStore.addAudioFile(track.id, {
				url: audioUrl,
				name: audio.name.replace('.mp3', ''),
				description: ''
			});
			uploadedAudioFiles.push(savedAudio);
		}

		return {
			success: true,
			track: {
				id: track.id,
				name: track.name,
				url: track.url,
				description: track.description,
				images: uploadedImages,
				audioFiles: uploadedAudioFiles
			}
		};
	} catch (error) {
		console.error('Upload error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Upload failed'
		};
	}
}
