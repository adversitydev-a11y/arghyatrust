import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { connectMongo } from './AT/server/db/connectMongo.js';
import { GalleryImage } from './AT/server/models/GalleryImage.js';

function cleanUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\/[^\/]+/, '');
}

async function runMigration() {
  console.log('Connecting to MongoDB...');
  await connectMongo();

  const galleryDirs = [
    path.resolve('AT/server/uploads/gallery'),
    path.resolve('server/uploads/gallery'),
  ];

  for (const d of galleryDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  // 1. Clean existing records
  const existingDocs = await GalleryImage.find();
  console.log(`Found ${existingDocs.length} existing documents in GalleryImage.`);

  for (const doc of existingDocs) {
    let modified = false;
    const cleanMain = cleanUrl(doc.mainImageUrl || doc.url);
    if (doc.mainImageUrl !== cleanMain || doc.url !== cleanMain) {
      doc.mainImageUrl = cleanMain;
      doc.url = cleanMain;
      modified = true;
    }

    if (Array.isArray(doc.relatedImages)) {
      const cleanRelated = doc.relatedImages.map(cleanUrl);
      if (JSON.stringify(cleanRelated) !== JSON.stringify(doc.relatedImages)) {
        doc.relatedImages = cleanRelated;
        modified = true;
      }
    }

    if (doc.caption === 'Aw') {
      doc.caption = 'Awareness & Social Initiatives';
      if (!doc.relatedImages.includes('/uploads/gallery/1788949999343-226915152.png') && fs.existsSync(path.join(galleryDirs[0], '1788949999343-226915152.png'))) {
        doc.relatedImages.push('/uploads/gallery/1788949999343-226915152.png');
      }
      modified = true;
    }

    if (modified) {
      await doc.save();
      console.log(`Updated existing album: "${doc.caption}" (${doc._id})`);
    }
  }

  // 2. Add foundational albums from existing upload pool if not already in DB
  const spiritualAlbumExists = await GalleryImage.findOne({
    $or: [
      { caption: /Spiritual Events/i },
      { mainImageUrl: /1771319220670/ }
    ]
  });

  if (!spiritualAlbumExists) {
    const spiritualDoc = await GalleryImage.create({
      caption: 'Spiritual Events & Yagnas',
      url: '/uploads/gallery/1771319220670-403403049.jpg',
      mainImageUrl: '/uploads/gallery/1771319220670-403403049.jpg',
      relatedImages: [
        '/uploads/gallery/1771319220717-59013514.jpg',
        '/uploads/gallery/1771319220756-65433558.jpg',
        '/uploads/gallery/1771319220774-527917695.jpg',
        '/uploads/gallery/1771319706119-946241520.jpg',
        '/uploads/gallery/1771319706103-200177782.jpg',
        '/uploads/gallery/1771319706150-625552103.jpg',
        '/uploads/gallery/1771319220787-261873940.jpg',
      ],
      sortOrder: 1,
    });
    console.log('Created foundational album: "Spiritual Events & Yagnas"', spiritualDoc._id);
  } else {
    console.log('Spiritual Events album already exists, preserving.');
  }

  const outreachAlbumExists = await GalleryImage.findOne({
    $or: [
      { caption: /Community Outreach/i },
      { mainImageUrl: /1771319220589/ }
    ]
  });

  if (!outreachAlbumExists) {
    const outreachDoc = await GalleryImage.create({
      caption: 'Community Outreach & Cultural Initiatives',
      url: '/uploads/gallery/1771319220589-45688046.jpg',
      mainImageUrl: '/uploads/gallery/1771319220589-45688046.jpg',
      relatedImages: [
        '/uploads/gallery/1771319220606-958334281.jpg',
        '/uploads/gallery/1771319220639-246617765.jpg',
        '/uploads/gallery/1771319220651-329241588.jpg',
      ],
      sortOrder: 2,
    });
    console.log('Created foundational album: "Community Outreach & Cultural Initiatives"', outreachDoc._id);
  } else {
    console.log('Community Outreach album already exists, preserving.');
  }

  // 3. Verify every file referenced across all documents exists on disk in both directories
  const finalDocs = await GalleryImage.find().lean();
  console.log(`\nVerifying all ${finalDocs.length} gallery documents and their media files:`);
  let missingCount = 0;

  for (const doc of finalDocs) {
    const allImgs = [doc.mainImageUrl, ...(doc.relatedImages || [])].filter(Boolean);
    console.log(`- Album: "${doc.caption}" (${allImgs.length} photos)`);
    for (const imgUrl of allImgs) {
      const filename = imgUrl.split('/').pop();
      const inAt = fs.existsSync(path.join(galleryDirs[0], filename));
      const inRoot = fs.existsSync(path.join(galleryDirs[1], filename));
      if (!inAt || !inRoot) {
        console.error(`  MISSING FILE: ${filename} (AT: ${inAt}, Root: ${inRoot})`);
        missingCount++;
      } else {
        const sz = fs.statSync(path.join(galleryDirs[0], filename)).size;
        console.log(`  ✓ ${filename} [${sz} bytes]`);
      }
    }
  }

  if (missingCount === 0) {
    console.log('\nSUCCESS: All gallery records and image files verified 100% on disk!');
  } else {
    console.warn(`\nWARNING: Found ${missingCount} missing files.`);
  }

  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
