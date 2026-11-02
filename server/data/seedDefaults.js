import { Event } from '../models/Event.js';
import { GalleryImage } from '../models/GalleryImage.js';
import { defaultEvents, defaultGalleryAlbums } from './defaultContent.js';

export async function seedDefaults() {
  const eventCount = await Event.estimatedDocumentCount();

  if (eventCount === 0 && defaultEvents.length > 0) {
    await Event.insertMany(defaultEvents);
  }

  const galleryCount = await GalleryImage.estimatedDocumentCount();
  if (galleryCount === 0 && defaultGalleryAlbums.length > 0) {
    await GalleryImage.insertMany(defaultGalleryAlbums);
  }
}
