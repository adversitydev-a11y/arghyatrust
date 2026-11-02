import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { VolunteerApplication } from '../models/VolunteerApplication.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { Event } from '../models/Event.js';
import { GalleryImage } from '../models/GalleryImage.js';
import { BlogSubmission } from '../models/BlogSubmission.js';
import { signAdminToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function syncUploadFile(subfolder, filename) {
  if (!filename) return;
  try {
    const atPath = path.resolve(__dirname, '../uploads', subfolder, filename);
    const rootPath = path.resolve(__dirname, '../../server/uploads', subfolder, filename);
    if (fs.existsSync(atPath) && !fs.existsSync(rootPath)) {
      const dir = path.dirname(rootPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(atPath, rootPath);
    } else if (fs.existsSync(rootPath) && !fs.existsSync(atPath)) {
      const dir = path.dirname(atPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(rootPath, atPath);
    }
  } catch {
    // safe silent fallback
  }
}

const FALLBACK_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function getTokenExpiryMs() {
  const raw = String(process.env.JWT_EXPIRES_IN || '12h').trim();
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric * 1000;

  const match = raw.match(/^(\d+)([smhd])$/i);
  if (!match) return FALLBACK_TOKEN_TTL_MS;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;
  return FALLBACK_TOKEN_TTL_MS;
}

function parseDateRangeQuery(startDate, endDate) {
  const createdAt = {};

  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) createdAt.$gte = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
  }

  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
}

function parseObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

function normalizeGalleryDoc(doc) {
  const mainImageUrl = doc.mainImageUrl || doc.url || '';
  const relatedImages = Array.isArray(doc.relatedImages) ? doc.relatedImages : [];
  return {
    ...doc,
    mainImageUrl,
    relatedImages,
    url: mainImageUrl,
  };
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatContentHtml(content) {
  const paragraphs = String(content || '')
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, '<br />')}</p>`);
  return paragraphs.join('');
}

function makeExcerpt(content, explicitExcerpt) {
  const source = String(explicitExcerpt || '').trim() || String(content || '').trim();
  const maxLen = 180;
  if (source.length <= maxLen) return source;
  return `${source.slice(0, maxLen).trimEnd()}...`;
}

function calculateReadTime(content) {
  const wordCount = String(content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 220));
  return `${minutes} min read`;
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8);
  }
  return String(raw)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function generateUniqueSlug(baseTitle, excludeId = null) {
  const base = slugify(baseTitle) || `story-${Date.now()}`;
  let slug = base;
  let counter = 2;
  const filter = excludeId ? { _id: { $ne: excludeId } } : {};

  while (await BlogSubmission.exists({ ...filter, slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function normalizeBlogDoc(doc) {
  const publishedAt = doc.publishedAt || doc.approvedAt || doc.updatedAt || doc.createdAt;
  return {
    _id: doc._id,
    title: doc.title,
    slug: doc.slug,
    category: doc.category,
    authorName: doc.authorName,
    authorEmail: doc.authorEmail,
    excerpt: doc.excerpt,
    content: doc.content,
    contentHtml: doc.contentHtml,
    readTime: doc.readTime,
    featuredImageUrl: doc.featuredImageUrl,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    status: doc.status,
    reviewNotes: doc.reviewNotes || '',
    seoTitle: doc.seoTitle || '',
    seoDescription: doc.seoDescription || '',
    approvedAt: doc.approvedAt || null,
    rejectedAt: doc.rejectedAt || null,
    publishedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function adminLogin(req, res, next) {
  try {
    const { email, username, password } = req.body || {};
    const loginId = String(email || username || '').trim().toLowerCase();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'email/username and password are required' });
    }

    const admin = await Admin.findOne({
      $or: [{ email: loginId }, { username: loginId }],
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await admin.comparePassword(String(password));
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAdminToken(admin);
    const expiresAt = Date.now() + getTokenExpiryMs();
    return res.json({
      ok: true,
      token,
      expiresAt,
      admin: {
        email: admin.email,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminSummary(_req, res, next) {
  try {
    const [contacts, volunteers, newsletters, events, galleryImages] = await Promise.all([
      ContactMessage.estimatedDocumentCount(),
      VolunteerApplication.estimatedDocumentCount(),
      NewsletterSubscriber.estimatedDocumentCount(),
      Event.estimatedDocumentCount(),
      GalleryImage.estimatedDocumentCount(),
    ]);

    return res.json({
      ok: true,
      data: { contacts, volunteers, newsletters, events, galleryImages },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminContacts(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const filter = parseDateRangeQuery(startDate, endDate);
    const contacts = await ContactMessage.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: contacts });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAdminContact(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid contact id' });

    const deleted = await ContactMessage.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Contact not found' });

    return res.json({ ok: true, data: true });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminContact(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid contact id' });

    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const message = String(payload.message || '').trim();
    const phone = payload.phone ? String(payload.phone).trim() : '';

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email and message are required' });
    }

    const doc = await ContactMessage.findByIdAndUpdate(
      id,
      { name, email, phone, message },
      { new: true, runValidators: true },
    ).lean();

    if (!doc) return res.status(404).json({ error: 'Contact not found' });
    return res.json({ ok: true, data: doc });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminRegistrations(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const filter = parseDateRangeQuery(startDate, endDate);
    const registrations = await VolunteerApplication.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: registrations });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAdminRegistration(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid volunteer id' });

    const deleted = await VolunteerApplication.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Volunteer not found' });

    return res.json({ ok: true, data: true });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminRegistration(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid volunteer id' });

    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const update = {
      name,
      age: payload.age === '' || payload.age === null || payload.age === undefined ? undefined : Number(payload.age),
      gender: payload.gender || undefined,
      qualification: payload.qualification || '',
      cityState: payload.cityState || '',
      language: payload.language || '',
      email,
      whatsapp: payload.whatsapp || '',
      interest: payload.interest || '',
      duration: payload.duration || '',
      pledge: Boolean(payload.pledge),
    };

    const doc = await VolunteerApplication.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ error: 'Volunteer not found' });
    return res.json({ ok: true, data: doc });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminSubscribers(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const filter = parseDateRangeQuery(startDate, endDate);
    const subscribers = await NewsletterSubscriber.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: subscribers });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAdminSubscriber(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid subscriber id' });

    const deleted = await NewsletterSubscriber.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Subscriber not found' });

    return res.json({ ok: true, data: true });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminSubscriber(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid subscriber id' });

    const payload = req.body || {};
    const email = String(payload.email || '').trim().toLowerCase();
    const sourcePage = String(payload.sourcePage || 'global').trim() || 'global';
    if (!email) return res.status(400).json({ error: 'email is required' });

    const doc = await NewsletterSubscriber.findByIdAndUpdate(
      id,
      { email, sourcePage },
      { new: true, runValidators: true },
    ).lean();

    if (!doc) return res.status(404).json({ error: 'Subscriber not found' });
    return res.json({ ok: true, data: doc });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminEvents(_req, res, next) {
  try {
    const events = await Event.find({})
      .sort({ featured: -1, status: 1, sortOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ ok: true, data: events });
  } catch (error) {
    return next(error);
  }
}

export async function uploadAdminEventImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please choose an image file to upload.' });
    }
    syncUploadFile('events', req.file.filename);
    const imageUrl = `/uploads/events/${req.file.filename}`;
    return res.status(200).json({
      ok: true,
      imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createAdminEvent(req, res, next) {
  try {
    const payload = req.body || {};
    const { title, description, date, category } = payload;
    if (!title || !description || !date || !category) {
      return res.status(400).json({ error: 'title, description, date and category are required' });
    }

    const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : payload.imageUrl;

    const doc = await Event.create({
      title,
      description,
      date,
      category,
      status: payload.status === 'Completed' ? 'Completed' : 'Upcoming',
      imageUrl,
      location: payload.location,
      participants: Number.isFinite(Number(payload.participants))
        ? Number(payload.participants)
        : undefined,
      registrationLink: payload.registrationLink,
      brochureUrl: payload.brochureUrl,
      featured: Boolean(payload.featured),
      isVisible: payload.isVisible !== undefined ? Boolean(payload.isVisible) : true,
      sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
    });
    return res.status(201).json({ ok: true, data: doc });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminEvent(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid event id' });

    const payload = req.body || {};
    const { title, description, date, category } = payload;
    if (!title || !description || !date || !category) {
      return res.status(400).json({ error: 'title, description, date and category are required' });
    }

    const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : payload.imageUrl;

    const updateFields = {
      title,
      description,
      date,
      category,
      status: payload.status === 'Completed' ? 'Completed' : 'Upcoming',
      location: payload.location,
      participants: Number.isFinite(Number(payload.participants))
        ? Number(payload.participants)
        : undefined,
      registrationLink: payload.registrationLink,
      brochureUrl: payload.brochureUrl,
      featured: Boolean(payload.featured),
      sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
    };

    if (imageUrl !== undefined) {
      updateFields.imageUrl = imageUrl;
    }

    if (payload.isVisible !== undefined) {
      updateFields.isVisible = Boolean(payload.isVisible);
    }

    const doc = await Event.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true },
    ).lean();

    if (!doc) return res.status(404).json({ error: 'Event not found' });
    return res.json({ ok: true, data: doc });
  } catch (error) {
    return next(error);
  }
}

export async function toggleAdminEventVisibility(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid event id' });

    const existing = await Event.findById(id);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const newVisibility = typeof req.body?.isVisible === 'boolean'
      ? req.body.isVisible
      : !existing.isVisible;

    existing.isVisible = newVisibility;
    await existing.save();
    return res.json({ ok: true, data: existing });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAdminEvent(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid event id' });

    const deleted = await Event.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });

    return res.json({ ok: true, data: true });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminGallery(_req, res, next) {
  try {
    const images = await GalleryImage.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ ok: true, data: images.map(normalizeGalleryDoc) });
  } catch (error) {
    return next(error);
  }
}

export async function createAdminGallery(req, res, next) {
  try {
    const payload = req.body || {};
    const mainImageUrl = payload.mainImageUrl || payload.url;
    if (!mainImageUrl || !payload.caption) {
      return res.status(400).json({ error: 'mainImageUrl/url and caption are required' });
    }

    const doc = await GalleryImage.create({
      url: mainImageUrl,
      mainImageUrl,
      relatedImages: Array.isArray(payload.relatedImages) ? payload.relatedImages : [],
      caption: payload.caption,
      sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
    });

    return res.status(201).json({ ok: true, data: normalizeGalleryDoc(doc.toObject()) });
  } catch (error) {
    return next(error);
  }
}

export async function uploadAdminGallery(req, res, next) {
  try {
    const caption = String(req.body?.caption || '').trim();
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0;
    const files = req.files || {};
    const mainImage = files.mainImage?.[0];
    const relatedImages = Array.isArray(files.relatedImages) ? files.relatedImages : [];

    if (!caption) {
      return res.status(400).json({ error: 'caption is required' });
    }
    if (!mainImage) {
      return res.status(400).json({ error: 'mainImage file is required' });
    }

    syncUploadFile('gallery', mainImage.filename);
    relatedImages.forEach((f) => syncUploadFile('gallery', f.filename));

    const mainImageUrl = `/uploads/gallery/${mainImage.filename}`;
    const relatedImageUrls = relatedImages.map((file) => `/uploads/gallery/${file.filename}`);

    const doc = await GalleryImage.create({
      url: mainImageUrl,
      mainImageUrl,
      relatedImages: relatedImageUrls,
      caption,
      sortOrder,
    });

    return res.status(201).json({ ok: true, data: normalizeGalleryDoc(doc.toObject()) });
  } catch (error) {
    return next(error);
  }
}

export async function uploadAdminGalleryUpdate(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid album id' });

    const existingDoc = await GalleryImage.findById(id);
    if (!existingDoc) return res.status(404).json({ error: 'Album not found' });

    const caption = req.body?.caption !== undefined ? String(req.body.caption).trim() : existingDoc.caption;
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : existingDoc.sortOrder;
    const files = req.files || {};
    const mainImageFile = files.mainImage?.[0];
    const relatedImageFiles = Array.isArray(files.relatedImages) ? files.relatedImages : [];

    let mainImageUrl = existingDoc.mainImageUrl || existingDoc.url;
    if (mainImageFile) {
      syncUploadFile('gallery', mainImageFile.filename);
      mainImageUrl = `/uploads/gallery/${mainImageFile.filename}`;
    }

    relatedImageFiles.forEach((f) => syncUploadFile('gallery', f.filename));

    let currentRelated = Array.isArray(existingDoc.relatedImages) ? [...existingDoc.relatedImages] : [];
    if (req.body?.existingRelatedImages !== undefined) {
      try {
        currentRelated = typeof req.body.existingRelatedImages === 'string'
          ? JSON.parse(req.body.existingRelatedImages)
          : req.body.existingRelatedImages;
      } catch (_e) {
        if (Array.isArray(req.body.existingRelatedImages)) {
          currentRelated = req.body.existingRelatedImages;
        }
      }
    }

    const newRelatedUrls = relatedImageFiles.map((f) => `/uploads/gallery/${f.filename}`);
    const finalRelatedImages = [...(Array.isArray(currentRelated) ? currentRelated : []), ...newRelatedUrls];

    existingDoc.caption = caption || existingDoc.caption;
    existingDoc.mainImageUrl = mainImageUrl;
    existingDoc.url = mainImageUrl;
    existingDoc.relatedImages = finalRelatedImages;
    existingDoc.sortOrder = sortOrder;

    await existingDoc.save();

    return res.json({ ok: true, data: normalizeGalleryDoc(existingDoc.toObject()) });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminGallery(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid image id' });

    const payload = req.body || {};
    const mainImageUrl = payload.mainImageUrl || payload.url;
    if (!mainImageUrl || !payload.caption) {
      return res.status(400).json({ error: 'mainImageUrl/url and caption are required' });
    }

    const updatePayload = {
      url: mainImageUrl,
      mainImageUrl,
      caption: payload.caption,
      sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
    };
    if (Array.isArray(payload.relatedImages)) {
      updatePayload.relatedImages = payload.relatedImages;
    }

    const doc = await GalleryImage.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!doc) return res.status(404).json({ error: 'Image not found' });

    return res.json({ ok: true, data: normalizeGalleryDoc(doc) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAdminGallery(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid image id' });

    const deleted = await GalleryImage.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Image not found' });

    return res.json({ ok: true, data: true });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminBlogSubmissions(req, res, next) {
  try {
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const filter =
      status === 'pending' || status === 'approved' || status === 'rejected' ? { status } : {};

    const blogs = await BlogSubmission.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: blogs.map(normalizeBlogDoc) });
  } catch (error) {
    return next(error);
  }
}

export async function updateAdminBlogSubmission(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid blog id' });

    const existing = await BlogSubmission.findById(id);
    if (!existing) return res.status(404).json({ error: 'Blog submission not found' });

    const payload = req.body || {};
    const update = {};

    if (payload.title !== undefined) {
      const nextTitle = String(payload.title || '').trim();
      if (!nextTitle) return res.status(400).json({ error: 'title cannot be empty' });
      update.title = nextTitle;
      if (nextTitle !== existing.title) {
        update.slug = await generateUniqueSlug(nextTitle, id);
      }
    }
    if (payload.category !== undefined) {
      update.category = String(payload.category || '').trim() || 'Stories';
    }
    if (payload.authorName !== undefined) {
      const nextAuthorName = String(payload.authorName || '').trim();
      if (!nextAuthorName) return res.status(400).json({ error: 'authorName cannot be empty' });
      update.authorName = nextAuthorName;
    }
    if (payload.authorEmail !== undefined) {
      const nextAuthorEmail = String(payload.authorEmail || '').trim().toLowerCase();
      if (!nextAuthorEmail) return res.status(400).json({ error: 'authorEmail cannot be empty' });
      update.authorEmail = nextAuthorEmail;
    }
    if (payload.content !== undefined) {
      const nextContent = String(payload.content || '').trim();
      if (!nextContent) return res.status(400).json({ error: 'content cannot be empty' });
      update.content = nextContent;
      update.contentHtml = formatContentHtml(nextContent);
      update.readTime = calculateReadTime(nextContent);
      const explicitExcerpt = payload.excerpt !== undefined ? payload.excerpt : existing.excerpt;
      update.excerpt = makeExcerpt(nextContent, explicitExcerpt);
    }
    if (payload.excerpt !== undefined && payload.content === undefined) {
      update.excerpt = makeExcerpt(existing.content, payload.excerpt);
    }
    if (payload.tags !== undefined) {
      update.tags = parseTags(payload.tags);
    }
    if (payload.reviewNotes !== undefined) {
      update.reviewNotes = String(payload.reviewNotes || '').trim();
    }

    if (payload.featuredImageUrl !== undefined) {
      const nextFeaturedImageUrl = String(payload.featuredImageUrl || '').trim();
      if (nextFeaturedImageUrl) {
        update.featuredImageUrl = nextFeaturedImageUrl;
      }
    }
    if (payload.seoTitle !== undefined) {
      update.seoTitle = String(payload.seoTitle || '').trim();
    }
    if (payload.seoDescription !== undefined) {
      update.seoDescription = String(payload.seoDescription || '').trim();
    }
    if (payload.publishedAt !== undefined && payload.publishedAt) {
      const parsedPubDate = new Date(payload.publishedAt);
      if (!Number.isNaN(parsedPubDate.getTime())) {
        update.publishedAt = parsedPubDate;
      }
    }

    if (payload.status !== undefined) {
      const nextStatus = String(payload.status || '').trim().toLowerCase();
      if (!['pending', 'approved', 'rejected'].includes(nextStatus)) {
        return res.status(400).json({ error: 'status must be pending, approved, or rejected' });
      }

      update.status = nextStatus;
      if (nextStatus === 'approved') {
        update.approvedAt = new Date();
        update.rejectedAt = undefined;
      } else if (nextStatus === 'rejected') {
        update.rejectedAt = new Date();
        update.approvedAt = undefined;
      } else {
        update.rejectedAt = undefined;
      }
    }

    const updated = await BlogSubmission.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) return res.status(404).json({ error: 'Blog submission not found' });

    return res.json({ ok: true, data: normalizeBlogDoc(updated) });
  } catch (error) {
    return next(error);
  }
}

export async function uploadAdminBlogImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please choose an image file to upload.' });
    }
    syncUploadFile('blogs', req.file.filename);
    const imageUrl = `/uploads/blogs/${req.file.filename}`;
    return res.status(200).json({
      ok: true,
      imageUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminBlogSubmissionById(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid blog id' });

    const blog = await BlogSubmission.findById(id).lean();
    if (!blog) return res.status(404).json({ error: 'Blog submission not found' });

    return res.json({ ok: true, data: normalizeBlogDoc(blog) });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAdminBlogSubmission(req, res, next) {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid blog id' });

    const deleted = await BlogSubmission.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Blog submission not found' });

    return res.json({ ok: true, data: true });
  } catch (error) {
    return next(error);
  }
}
