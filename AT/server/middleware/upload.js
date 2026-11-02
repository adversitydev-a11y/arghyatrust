import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../uploads');
const galleryRoot = path.join(uploadsRoot, 'gallery');
const blogRoot = path.join(uploadsRoot, 'blogs');
const eventsRoot = path.join(uploadsRoot, 'events');

for (const dir of [uploadsRoot, galleryRoot, blogRoot, eventsRoot]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createStorage(destinationRoot) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destinationRoot);
    },
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)
        ? extension
        : '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  });
}

const galleryStorage = createStorage(galleryRoot);
const blogStorage = createStorage(blogRoot);
const eventStorage = createStorage(eventsRoot);

const storageFileFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
};

const eventFileFilter = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
    return cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed'));
  }
  return cb(null, true);
};

export const eventUpload = multer({
  storage: eventStorage,
  fileFilter: eventFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export const galleryUpload = multer({
  storage: galleryStorage,
  fileFilter: storageFileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024,
    files: 50,
  },
});

export const blogUpload = multer({
  storage: blogStorage,
  fileFilter: storageFileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024,
    files: 5,
  },
});
