import { storage } from '$lib/storage';
import { trackStore } from '$lib/server/db/track-store';
import { isTrackAnimationKey, type TrackAnimationKey } from '$lib/track-animations/catalog';
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
		const animationKeyEntry = formData.get('animationKey');
		const backgroundVideoEntry = formData.get('backgroundVideo');
		const backgroundVideo =
			backgroundVideoEntry instanceof File && backgroundVideoEntry.size > 0
				? backgroundVideoEntry
				: null;
		let animationKey: TrackAnimationKey | null = null;

		if (typeof animationKeyEntry === 'string' && animationKeyEntry.trim().length > 0) {
			const normalizedAnimationKey = animationKeyEntry.trim();
			if (!isTrackAnimationKey(normalizedAnimationKey)) {
				return {
					success: false,
					error: 'Invalid animation selection'
				};
			}

			animationKey = normalizedAnimationKey;
		}

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

		if (
			backgroundVideo &&
			!backgroundVideo.type.includes('video/mp4') &&
			!backgroundVideo.name.toLowerCase().endsWith('.mp4')
		) {
			return {
				success: false,
				error: 'Background video must be MP4'
			};
		}

		// Generate safe filename for main audio
		const timestamp = Date.now();
		const safeName = (name || 'untitled').replace(/[^a-zA-Z0-9\-_]/g, '_');
		const mainAudioFilename = `${timestamp}_${safeName}.mp3`;

		// Save main audio file
		const mainAudioUrl = await storage.save(mainAudio, mainAudioFilename);

		let videoUrl: string | null = null;
		if (backgroundVideo) {
			const videoFilename = `${timestamp}_${safeName}_video.mp4`;
			videoUrl = await storage.save(backgroundVideo, `videos/${videoFilename}`);
		}

		// Generate unique slug
		const slug = generateTrackSlug(name || 'untitled');

		// Create track in database
		const track = await trackStore.create({
			name: name || 'Untitled Track',
			slug,
			url: mainAudioUrl,
			videoUrl,
			animationKey,
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
				videoUrl: track.videoUrl,
				animationKey: track.animationKey,
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
