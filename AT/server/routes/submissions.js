import { Router } from 'express';
import mongoose from 'mongoose';
import { ContactMessage } from '../models/ContactMessage.js';
import { VolunteerApplication } from '../models/VolunteerApplication.js';
import { CtaEvent } from '../models/CtaEvent.js';
import { Event } from '../models/Event.js';
import { GalleryImage } from '../models/GalleryImage.js';
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { createAdminSession, requireAdminAuth } from '../auth/adminAuth.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, phone, message, sourcePage } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'name, email and message are required' });
    }

    const doc = await ContactMessage.create({ name, email, phone, message, sourcePage });
    return res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    return next(err);
  }
});

router.post('/volunteer', async (req, res, next) => {
  try {
    const {
      name,
      age,
      gender,
      qualification,
      cityState,
      language,
      email,
      whatsapp,
      interest,
      duration,
      pledge,
      sourcePage,
    } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const doc = await VolunteerApplication.create({
      name,
      age: age ? Number(age) : undefined,
      gender,
      qualification,
      cityState,
      language,
      email,
      whatsapp,
      interest,
      duration,
      pledge: Boolean(pledge),
      sourcePage,
    });
    return res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    return next(err);
  }
});

router.post('/cta', async (req, res, next) => {
  try {
    const { page, section, action, label, targetPath, targetUrl, meta } = req.body || {};

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

    return res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    return next(err);
  }
});

router.post('/newsletter', async (req, res, next) => {
  try {
    const { email, sourcePage } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const doc = await NewsletterSubscriber.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $setOnInsert: {
          email: normalizedEmail,
          sourcePage: sourcePage || 'global',
        },
      },
      {
        new: true,
        upsert: true,
        rawResult: true,
      },
    );

    const alreadySubscribed = !doc.lastErrorObject?.upserted;
    return res.status(alreadySubscribed ? 200 : 201).json({
      ok: true,
      message: alreadySubscribed ? 'Email already subscribed' : 'Subscribed successfully',
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/events', async (_req, res, next) => {
  try {
    const events = await Event.find({})
      .sort({ featured: -1, status: 1, sortOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ ok: true, data: events });
  } catch (err) {
    return next(err);
  }
});

router.get('/gallery', async (_req, res, next) => {
  try {
    const images = await GalleryImage.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ ok: true, data: images });
  } catch (err) {
    return next(err);
  }
});

router.post('/admin/login', (req, res) => {
  const { email, username, password } = req.body || {};
  const loginId = String(email || username || '').trim().toLowerCase();

  const adminEmail = String(process.env.ADMIN_EMAIL || 'contact@arghyatrust.org').trim().toLowerCase();
  const adminUsername = String(process.env.ADMIN_USERNAME || 'arghya_admin').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || 'ArghyaTrust@2026#Admin');
  const adminName = process.env.ADMIN_NAME || 'Arghya Trust Administrator';

  const matchesIdentifier = loginId === adminEmail || loginId === adminUsername;
  if (!matchesIdentifier || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { token, expiresAt } = createAdminSession({ email: adminEmail, name: adminName });
  return res.json({
    ok: true,
    token,
    expiresAt,
    admin: { email: adminEmail, username: adminUsername, name: adminName },
  });
});

function parseDateRangeQuery(startDate, endDate) {
  const createdAt = {};
  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) {
      createdAt.$gte = start;
    }
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return id;
}

router.get('/admin/summary', requireAdminAuth, async (_req, res, next) => {
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
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/contacts', requireAdminAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = parseDateRangeQuery(startDate, endDate);
    const contacts = await ContactMessage.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: contacts });
  } catch (err) {
    return next(err);
  }
});

router.delete('/admin/contacts/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid contact id' });
    }

    const deleted = await ContactMessage.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/volunteers', requireAdminAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = parseDateRangeQuery(startDate, endDate);
    const volunteers = await VolunteerApplication.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: volunteers });
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/newsletters', requireAdminAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = parseDateRangeQuery(startDate, endDate);
    const newsletters = await NewsletterSubscriber.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: newsletters });
  } catch (err) {
    return next(err);
  }
});

router.delete('/admin/newsletters/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid newsletter id' });
    }

    const deleted = await NewsletterSubscriber.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/events', requireAdminAuth, async (_req, res, next) => {
  try {
    const events = await Event.find({})
      .sort({ featured: -1, status: 1, sortOrder: 1, createdAt: -1 })
      .lean();
    return res.json({ ok: true, data: events });
  } catch (err) {
    return next(err);
  }
});

router.post('/admin/events', requireAdminAuth, async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      category,
      status,
      imageUrl,
      location,
      participants,
      registrationLink,
      brochureUrl,
      featured,
      sortOrder,
    } = req.body || {};

    if (!title || !description || !date || !category) {
      return res.status(400).json({ error: 'title, description, date and category are required' });
    }

    const doc = await Event.create({
      title,
      description,
      date,
      category,
      status: status === 'Completed' ? 'Completed' : 'Upcoming',
      imageUrl,
      location,
      participants: Number.isFinite(Number(participants)) ? Number(participants) : undefined,
      registrationLink,
      brochureUrl,
      featured: Boolean(featured),
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });

    return res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    return next(err);
  }
});

router.put('/admin/events/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    const {
      title,
      description,
      date,
      category,
      status,
      imageUrl,
      location,
      participants,
      registrationLink,
      brochureUrl,
      featured,
      sortOrder,
    } = req.body || {};

    if (!title || !description || !date || !category) {
      return res.status(400).json({ error: 'title, description, date and category are required' });
    }

    const updated = await Event.findByIdAndUpdate(
      id,
      {
        title,
        description,
        date,
        category,
        status: status === 'Completed' ? 'Completed' : 'Upcoming',
        imageUrl,
        location,
        participants: Number.isFinite(Number(participants)) ? Number(participants) : undefined,
        registrationLink,
        brochureUrl,
        featured: Boolean(featured),
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ ok: true, data: updated });
  } catch (err) {
    return next(err);
  }
});

router.delete('/admin/events/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    const deleted = await Event.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/gallery', requireAdminAuth, async (_req, res, next) => {
  try {
    const images = await GalleryImage.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ ok: true, data: images });
  } catch (err) {
    return next(err);
  }
});

router.post('/admin/gallery', requireAdminAuth, async (req, res, next) => {
  try {
    const { url, caption, sortOrder } = req.body || {};
    if (!url || !caption) {
      return res.status(400).json({ error: 'url and caption are required' });
    }

    const doc = await GalleryImage.create({
      url,
      caption,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });

    return res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    return next(err);
  }
});

router.put('/admin/gallery/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid image id' });
    }

    const { url, caption, sortOrder } = req.body || {};
    if (!url || !caption) {
      return res.status(400).json({ error: 'url and caption are required' });
    }

    const updated = await GalleryImage.findByIdAndUpdate(
      id,
      {
        url,
        caption,
        sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Image not found' });
    }

    return res.json({ ok: true, data: updated });
  } catch (err) {
    return next(err);
  }
});

router.delete('/admin/gallery/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const id = parseObjectId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid image id' });
    }

    const deleted = await GalleryImage.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Image not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
