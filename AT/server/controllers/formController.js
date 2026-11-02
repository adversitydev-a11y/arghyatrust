import { ContactMessage } from '../models/ContactMessage.js';
import { VolunteerApplication } from '../models/VolunteerApplication.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { CtaEvent } from '../models/CtaEvent.js';
import { Event } from '../models/Event.js';
import { GalleryImage } from '../models/GalleryImage.js';
import { BlogSubmission } from '../models/BlogSubmission.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
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

async function generateUniqueSlug(baseTitle) {
  const base = slugify(baseTitle) || `story-${Date.now()}`;
  let slug = base;
  let counter = 2;
  while (await BlogSubmission.exists({ slug })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export async function submitContact(req, res, next) {
  try {
    const payload = req.body || {};
    const name = String(payload.name || payload.fullName || '').trim();
    const email = normalizeEmail(payload.email);
    const phone = String(payload.phone || '').trim();
    const message = String(payload.message || '').trim();
    const sourcePage = String(payload.sourcePage || 'contact').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email and message are required' });
    }

    const doc = await ContactMessage.create({ name, email, phone, message, sourcePage });
    return res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (error) {
    return next(error);
  }
}

export async function submitRegistration(req, res, next) {
  try {
    const payload = req.body || {};
    const name = String(payload.name || payload.fullName || '').trim();
    const email = normalizeEmail(payload.email);

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const doc = await VolunteerApplication.create({
      name,
      age: payload.age ? Number(payload.age) : undefined,
      gender: payload.gender,
      qualification: payload.qualification || payload.education || '',
      cityState: payload.cityState || payload.contactAddress || '',
      language: payload.language || '',
      email,
      whatsapp: payload.whatsapp || payload.phone || '',
      interest: payload.interest || '',
      duration: payload.duration || '',
      pledge: Boolean(payload.pledge),
      sourcePage: payload.sourcePage || 'contact',
    });

    return res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (error) {
    return next(error);
  }
}

export async function submitNewsletter(req, res, next) {
  try {
    const payload = req.body || {};
    const email = normalizeEmail(payload.email);
    const sourcePage = String(payload.sourcePage || 'global').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const doc = await NewsletterSubscriber.findOneAndUpdate(
      { email },
      {
        $setOnInsert: { email, sourcePage },
      },
      { upsert: true, new: true, rawResult: true },
    );

    const alreadyExists = !doc.lastErrorObject?.upserted;
    return res.status(alreadyExists ? 200 : 201).json({
      ok: true,
      data: {
        email,
        message: alreadyExists ? 'Email already subscribed' : 'Subscribed successfully',
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function trackCta(req, res, next) {
  try {
    const payload = req.body || {};
    const { page, section, action, label, targetPath, targetUrl, meta } = payload;

    if (!page || !section || !action) {
      return res.status(400).json({ error: 'page, section and action are required' });
    }

    const doc = await CtaEvent.create({
      page,
      section,
      action,
      label,
      targetPath,
      targetUrl,
      meta,
    });

    return res.status(201).json({ ok: true, data: { id: doc._id } });
  } catch (error) {
    return next(error);
  }
}

export async function getPublicEvents(req, res, next) {
  try {
    const filter = req.query?.includeHidden === 'true' ? {} : { isVisible: { $ne: false } };
    const events = await Event.find(filter)
      .sort({ featured: -1, status: 1, sortOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ ok: true, data: events });
  } catch (error) {
    return next(error);
  }
}

export async function getPublicGallery(_req, res, next) {
  try {
    const images = await GalleryImage.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    const normalized = images.map((item) => ({
      ...item,
      mainImageUrl: item.mainImageUrl || item.url || '',
      relatedImages: Array.isArray(item.relatedImages) ? item.relatedImages : [],
    }));
    return res.json({ ok: true, data: normalized });
  } catch (error) {
    return next(error);
  }
}

export async function submitBlog(req, res, next) {
  try {
    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    const authorName = String(payload.authorName || '').trim();
    const authorEmail = normalizeEmail(payload.authorEmail);
    const category = String(payload.category || 'Stories').trim() || 'Stories';
    const content = String(payload.content || '').trim();
    const excerpt = makeExcerpt(content, payload.excerpt);
    const tags = parseTags(payload.tags);
    const imageFile = req.file;

    if (!title || !authorName || !authorEmail || !content) {
      return res.status(400).json({ error: 'title, authorName, authorEmail and content are required' });
    }
    if (!imageFile) {
      return res.status(400).json({ error: 'Blog image is required' });
    }

    const slug = await generateUniqueSlug(title);
    const featuredImageUrl = `/uploads/blogs/${imageFile.filename}`;
    const doc = await BlogSubmission.create({
      title,
      slug,
      category,
      authorName,
      authorEmail,
      excerpt,
      content,
      contentHtml: formatContentHtml(content),
      readTime: calculateReadTime(content),
      featuredImageUrl,
      tags,
      status: 'pending',
    });

    return res.status(201).json({
      ok: true,
      data: { id: doc._id, message: 'Blog submitted for admin review' },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getApprovedBlogs(_req, res, next) {
  try {
    const blogs = await BlogSubmission.find({ status: 'approved' })
      .sort({ approvedAt: -1, updatedAt: -1 })
      .lean();

    const normalized = blogs.map((blog) => ({
      _id: blog._id,
      slug: blog.slug,
      title: blog.title,
      category: blog.category,
      author: blog.authorName,
      excerpt: blog.excerpt,
      content: blog.contentHtml,
      readTime: blog.readTime,
      featuredImage: blog.featuredImageUrl,
      tags: Array.isArray(blog.tags) ? blog.tags : [],
      publishedAt: blog.approvedAt || blog.updatedAt || blog.createdAt,
      date: new Date(blog.approvedAt || blog.updatedAt || blog.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }));

    return res.json({ ok: true, data: normalized });
  } catch (error) {
    return next(error);
  }
}
