import { Router } from 'express';
import {
  adminLogin,
  createAdminEvent,
  createAdminGallery,
  deleteAdminContact,
  deleteAdminEvent,
  deleteAdminGallery,
  deleteAdminRegistration,
  deleteAdminSubscriber,
  getAdminContacts,
  getAdminEvents,
  getAdminGallery,
  getAdminBlogSubmissions,
  getAdminRegistrations,
  getAdminSubscribers,
  getAdminSummary,
  uploadAdminGallery,
  updateAdminBlogSubmission,
  deleteAdminBlogSubmission,
  getAdminBlogSubmissionById,
  uploadAdminBlogImage,
  updateAdminEvent,
  updateAdminContact,
  updateAdminRegistration,
  updateAdminSubscriber,
  updateAdminGallery,
  uploadAdminGalleryUpdate,
} from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { galleryUpload, blogUpload } from '../middleware/upload.js';

const router = Router();

router.post('/admin/login', adminLogin);

router.get('/admin/summary', requireAdminAuth, getAdminSummary);
router.get('/admin/contacts', requireAdminAuth, getAdminContacts);
router.delete('/admin/contacts/:id', requireAdminAuth, deleteAdminContact);
router.put('/admin/contacts/:id', requireAdminAuth, updateAdminContact);

router.get('/admin/registrations', requireAdminAuth, getAdminRegistrations);
router.get('/admin/volunteers', requireAdminAuth, getAdminRegistrations);
router.delete('/admin/registrations/:id', requireAdminAuth, deleteAdminRegistration);
router.delete('/admin/volunteers/:id', requireAdminAuth, deleteAdminRegistration);
router.put('/admin/registrations/:id', requireAdminAuth, updateAdminRegistration);
router.put('/admin/volunteers/:id', requireAdminAuth, updateAdminRegistration);

router.get('/admin/subscribers', requireAdminAuth, getAdminSubscribers);
router.get('/admin/newsletters', requireAdminAuth, getAdminSubscribers);
router.delete('/admin/subscribers/:id', requireAdminAuth, deleteAdminSubscriber);
router.delete('/admin/newsletters/:id', requireAdminAuth, deleteAdminSubscriber);
router.put('/admin/subscribers/:id', requireAdminAuth, updateAdminSubscriber);
router.put('/admin/newsletters/:id', requireAdminAuth, updateAdminSubscriber);

router.get('/admin/events', requireAdminAuth, getAdminEvents);
router.post('/admin/events', requireAdminAuth, createAdminEvent);
router.put('/admin/events/:id', requireAdminAuth, updateAdminEvent);
router.delete('/admin/events/:id', requireAdminAuth, deleteAdminEvent);

router.get('/admin/gallery', requireAdminAuth, getAdminGallery);
router.post(
  '/admin/gallery/upload',
  requireAdminAuth,
  galleryUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'relatedImages', maxCount: 50 },
  ]),
  uploadAdminGallery,
);
router.put(
  '/admin/gallery/:id/upload',
  requireAdminAuth,
  galleryUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'relatedImages', maxCount: 50 },
  ]),
  uploadAdminGalleryUpdate,
);
router.post('/admin/gallery', requireAdminAuth, createAdminGallery);
router.put('/admin/gallery/:id', requireAdminAuth, updateAdminGallery);
router.delete('/admin/gallery/:id', requireAdminAuth, deleteAdminGallery);

router.get('/admin/blog-submissions', requireAdminAuth, getAdminBlogSubmissions);
router.get('/admin/blog-submissions/:id', requireAdminAuth, getAdminBlogSubmissionById);
router.post('/admin/blog-submissions/upload-image', requireAdminAuth, blogUpload.single('image'), uploadAdminBlogImage);
router.put('/admin/blog-submissions/:id', requireAdminAuth, updateAdminBlogSubmission);
router.delete('/admin/blog-submissions/:id', requireAdminAuth, deleteAdminBlogSubmission);

export default router;
