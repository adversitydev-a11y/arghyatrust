import { Router } from 'express';
import {
  getApprovedBlogs,
  getPublicEvents,
  getPublicEventBySlugOrId,
  getPublicGallery,
  submitBlog,
  submitContact,
  submitNewsletter,
  submitRegistration,
  trackCta,
} from '../controllers/formController.js';
import { blogUpload } from '../middleware/upload.js';

const router = Router();

router.post('/contact', submitContact);
router.post('/register', submitRegistration);
router.post('/volunteer', submitRegistration);
router.post('/subscribe', submitNewsletter);
router.post('/newsletter', submitNewsletter);
router.post('/blogs/submit', blogUpload.single('image'), submitBlog);
router.post('/cta', trackCta);
router.get('/events', getPublicEvents);
router.get('/events/:slugOrId', getPublicEventBySlugOrId);
router.get('/gallery', getPublicGallery);
router.get('/blogs', getApprovedBlogs);

export default router;
