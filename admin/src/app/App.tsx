import React, { useEffect, useMemo, useState } from 'react';
import { LoginPage } from './components/admin/LoginPage';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { AdminHeader } from './components/admin/AdminHeader';
import { DashboardHome } from './components/admin/DashboardHome';
import { ContactSubmissionsPage } from './components/admin/ContactSubmissionsPage';
import { VolunteerSubmissionsPage } from './components/admin/VolunteerSubmissionsPage';
import { NewsletterSubmissionsPage } from './components/admin/NewsletterSubmissionsPage';
import { EventsManagementPage } from './components/admin/EventsManagementPage';
import { GalleryManagementPage } from './components/admin/GalleryManagementPage';
import { BlogSubmissionsPage } from './components/admin/BlogSubmissionsPage';
import { ExportDataPage } from './components/admin/ExportDataPage';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import {
  createEvent,
  deleteContact,
  deleteEvent,
  deleteGalleryImage,
  deleteNewsletter,
  deleteVolunteer,
  deleteBlogSubmission,
  getBlogSubmissions,
  getContacts,
  getEvents,
  getGallery,
  getNewsletters,
  getSummary,
  getVolunteers,
  loginAdmin,
  uploadBlogImage,
  uploadEventImage,
  uploadGalleryImageProgram,
  uploadGalleryImageUpdate,
  updateBlogSubmission,
  updateContact,
  updateEvent,
  updateGalleryImage,
  updateNewsletter,
  updateVolunteer,
} from './lib/api';
import type {
  AdminSummary,
  BlogSubmission,
  ContactSubmission,
  EventItem,
  GalleryImage,
  NewsletterSubscriber,
  VolunteerSubmission,
} from './lib/types';
import { downloadCsv } from './lib/export';

const SESSION_STORAGE_KEY = 'AT_ADMIN_SESSION';

type SessionState = {
  token: string;
  expiresAt: number;
  adminName: string;
};

function saveSession(session: SessionState) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function getSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed?.token || !parsed?.expiresAt || parsed.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export default function App() {
  const existingSession = useMemo(() => getSession(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(existingSession));
  const [session, setSession] = useState<SessionState | null>(existingSession);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerSubmission[]>([]);
  const [newsletters, setNewsletters] = useState<NewsletterSubscriber[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [blogSubmissions, setBlogSubmissions] = useState<BlogSubmission[]>([]);
  const [summary, setSummary] = useState<AdminSummary>({
    contacts: 0,
    volunteers: 0,
    newsletters: 0,
    events: 0,
    galleryImages: 0,
  });

  const fetchAllData = async (token: string) => {
    setIsLoading(true);
    try {
      const results = await Promise.allSettled([
        getSummary(token),
        getContacts(token),
        getVolunteers(token),
        getNewsletters(token),
        getEvents(token),
        getGallery(token),
        getBlogSubmissions(token),
      ]);

      const [summaryRes, contactsRes, volunteersRes, newsletterRes, eventsRes, galleryRes, blogRes] = results;

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value);
      if (volunteersRes.status === 'fulfilled') setVolunteers(volunteersRes.value);
      if (newsletterRes.status === 'fulfilled') setNewsletters(newsletterRes.value);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value);
      if (galleryRes.status === 'fulfilled') setGalleryImages(galleryRes.value);
      if (blogRes.status === 'fulfilled') setBlogSubmissions(blogRes.value);

      // Check if any error indicates invalid/expired token
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
      if (rejected) {
        const error = rejected.reason;
        const message = error instanceof Error ? error.message : String(error || 'Data loading warning');
        if (
          message.toLowerCase().includes('unauthorized') ||
          message.toLowerCase().includes('invalid or expired token')
        ) {
          toast.error('Session expired. Please log in again.');
          handleLogout();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load admin data';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.token) {
      fetchAllData(session.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const data = await loginAdmin(email, password);
      const nextSession: SessionState = {
        token: data.token,
        expiresAt: data.expiresAt,
        adminName: data.adminName,
      };

      saveSession(nextSession);
      setSession(nextSession);
      setIsLoggedIn(true);
      toast.success('Login successful! Welcome to Arghya Trust Admin Panel');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    setContacts([]);
    setVolunteers([]);
    setNewsletters([]);
    setEvents([]);
    setGalleryImages([]);
    setBlogSubmissions([]);
    setSummary({ contacts: 0, volunteers: 0, newsletters: 0, events: 0, galleryImages: 0 });
    toast.info('Logged out successfully');
  };

  const requireToken = () => {
    if (!session?.token) {
      throw new Error('Unauthorized');
    }
    return session.token;
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const token = requireToken();
      await deleteContact(token, id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSummary((prev) => ({ ...prev, contacts: Math.max(0, prev.contacts - 1) }));
      toast.success('Contact deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete contact';
      toast.error(message);
    }
  };

  const handleUpdateContact = async (
    id: string,
    payload: Pick<ContactSubmission, 'name' | 'email' | 'phone' | 'message'>,
  ) => {
    try {
      const token = requireToken();
      const updated = await updateContact(token, id, payload);
      setContacts((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Contact updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update contact';
      toast.error(message);
    }
  };

  const handleExportToExcel = () => {
    const headers = ['Name', 'Email', 'Phone', 'Message', 'Date'];
    const rows = contacts.map((contact) => [
      contact.name,
      contact.email,
      contact.phone,
      contact.message,
      contact.date,
    ]);
    downloadCsv(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast.success('Contacts exported to Excel successfully');
  };

  const handleDeleteNewsletter = async (id: string) => {
    try {
      const token = requireToken();
      await deleteNewsletter(token, id);
      setNewsletters((prev) => prev.filter((item) => item.id !== id));
      setSummary((prev) => ({ ...prev, newsletters: Math.max(0, prev.newsletters - 1) }));
      toast.success('Subscriber deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete subscriber';
      toast.error(message);
    }
  };

  const handleUpdateNewsletter = async (
    id: string,
    payload: Pick<NewsletterSubscriber, 'email' | 'sourcePage'>,
  ) => {
    try {
      const token = requireToken();
      const updated = await updateNewsletter(token, id, payload);
      setNewsletters((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Subscriber updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update subscriber';
      toast.error(message);
    }
  };

  const handleDeleteVolunteer = async (id: string) => {
    try {
      const token = requireToken();
      await deleteVolunteer(token, id);
      setVolunteers((prev) => prev.filter((item) => item.id !== id));
      setSummary((prev) => ({ ...prev, volunteers: Math.max(0, prev.volunteers - 1) }));
      toast.success('Volunteer deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete volunteer';
      toast.error(message);
    }
  };

  const handleUpdateVolunteer = async (
    id: string,
    payload: Omit<VolunteerSubmission, 'id' | 'date'>,
  ) => {
    try {
      const token = requireToken();
      const updated = await updateVolunteer(token, id, payload);
      setVolunteers((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Volunteer updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update volunteer';
      toast.error(message);
    }
  };

  const handleAddEvent = async (event: Omit<EventItem, 'id'>, imageFile?: File | null) => {
    try {
      const token = requireToken();
      let imageUrl = event.imageUrl;
      if (imageFile) {
        const uploadRes = await uploadEventImage(token, imageFile);
        imageUrl = uploadRes.imageUrl;
      }
      const created = await createEvent(token, { ...event, imageUrl });
      setEvents((prev) => [created, ...prev]);
      setSummary((prev) => ({ ...prev, events: prev.events + 1 }));
      toast.success('Event added successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add event';
      toast.error(message);
      return false;
    }
  };

  const handleEditEvent = async (
    id: string,
    updatedEvent: Omit<EventItem, 'id'>,
    imageFile?: File | null,
  ) => {
    try {
      const token = requireToken();
      let imageUrl = updatedEvent.imageUrl;
      if (imageFile) {
        const uploadRes = await uploadEventImage(token, imageFile);
        imageUrl = uploadRes.imageUrl;
      }
      const updated = await updateEvent(token, id, { ...updatedEvent, imageUrl });
      setEvents((prev) => prev.map((event) => (event.id === id ? updated : event)));
      toast.success('Event updated successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update event';
      toast.error(message);
      return false;
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const token = requireToken();
      await deleteEvent(token, id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
      setSummary((prev) => ({ ...prev, events: Math.max(0, prev.events - 1) }));
      toast.success('Event deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete event';
      toast.error(message);
    }
  };


  const handleAddImage = async (payload: {
    caption: string;
    mainImage: File;
    relatedImages: File[];
  }) => {
    try {
      const token = requireToken();
      const created = await uploadGalleryImageProgram(token, payload);
      setGalleryImages((prev) => [created, ...prev]);
      setSummary((prev) => ({ ...prev, galleryImages: prev.galleryImages + 1 }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(message);
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      const token = requireToken();
      await deleteGalleryImage(token, id);
      setGalleryImages((prev) => prev.filter((image) => image.id !== id));
      setSummary((prev) => ({ ...prev, galleryImages: Math.max(0, prev.galleryImages - 1) }));
      toast.success('Image deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete image';
      toast.error(message);
    }
  };

  const handleUpdateCaption = async (id: string, caption: string) => {
    try {
      const token = requireToken();
      const currentImage = galleryImages.find((image) => image.id === id);
      if (!currentImage) return;

      const updated = await updateGalleryImage(token, id, {
        url: currentImage.mainImageUrl || currentImage.url,
        mainImageUrl: currentImage.mainImageUrl || currentImage.url,
        relatedImages: currentImage.relatedImages || [],
        caption,
        sortOrder: currentImage.sortOrder,
      });
      setGalleryImages((prev) => prev.map((image) => (image.id === id ? updated : image)));
      toast.success('Caption updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update caption';
      toast.error(message);
    }
  };

  const handleUpdateAlbum = async (
    id: string,
    payload: {
      caption?: string;
      mainImage?: File;
      relatedImages?: File[];
      existingRelatedImages?: string[];
    },
  ) => {
    try {
      const token = requireToken();
      const updated = await uploadGalleryImageUpdate(token, id, payload);
      setGalleryImages((prev) => prev.map((img) => (img.id === id ? updated : img)));
      toast.success('Album updated successfully');
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update album';
      toast.error(message);
      throw error;
    }
  };

  const handleUpdateBlogSubmission = async (
    id: string,
    payload: {
      title?: string;
      category?: string;
      authorName?: string;
      authorEmail?: string;
      excerpt?: string;
      content?: string;
      featuredImageUrl?: string;
      tags?: string;
      seoTitle?: string;
      seoDescription?: string;
      publishedAt?: string;
      reviewNotes?: string;
      status?: 'pending' | 'approved' | 'rejected';
    },
    imageFile?: File | null,
  ) => {
    try {
      const token = requireToken();
      let featuredImageUrl = payload.featuredImageUrl;
      if (imageFile) {
        const uploadRes = await uploadBlogImage(token, imageFile);
        featuredImageUrl = uploadRes.imageUrl;
      }
      const updated = await updateBlogSubmission(token, id, {
        ...payload,
        ...(featuredImageUrl ? { featuredImageUrl } : {}),
      });
      setBlogSubmissions((prev) => prev.map((item) => (item.id === id ? updated : item)));
      const actionName =
        payload.status && payload.status !== 'pending'
          ? payload.status === 'approved'
            ? 'approved'
            : 'rejected'
          : 'updated';
      toast.success(`Blog ${actionName} successfully`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update blog';
      toast.error(message);
      return false;
    }
  };

  const handleDeleteBlogSubmission = async (id: string) => {
    try {
      const token = requireToken();
      await deleteBlogSubmission(token, id);
      setBlogSubmissions((prev) => prev.filter((item) => item.id !== id));
      toast.success('Blog deleted successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete blog';
      toast.error(message);
      return false;
    }
  };

  const handleExportContacts = async (startDate: string, endDate: string) => {
    try {
      const token = requireToken();
      const data = await getContacts(token, { startDate, endDate });
      const headers = ['Name', 'Email', 'Phone', 'Message', 'Date'];
      const rows = data.map((contact) => [
        contact.name,
        contact.email,
        contact.phone,
        contact.message,
        contact.date,
      ]);
      downloadCsv(`contacts-export-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export contacts';
      toast.error(message);
    }
  };

  const handleExportVolunteers = async (startDate: string, endDate: string) => {
    try {
      const token = requireToken();
      const data = await getVolunteers(token, { startDate, endDate });
      const headers = [
        'Name',
        'Age',
        'Gender',
        'Qualification',
        'City/State',
        'Language',
        'Email',
        'WhatsApp',
        'Interest',
        'Duration',
        'Pledge',
        'Date',
      ];
      const rows = data.map((volunteer) => [
        volunteer.name,
        volunteer.age || '',
        volunteer.gender || '',
        volunteer.qualification || '',
        volunteer.cityState || '',
        volunteer.language || '',
        volunteer.email,
        volunteer.whatsapp || '',
        volunteer.interest || '',
        volunteer.duration || '',
        volunteer.pledge ? 'Yes' : 'No',
        volunteer.date,
      ]);
      downloadCsv(`volunteers-export-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export volunteers';
      toast.error(message);
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'contacts':
        return 'Contact Submissions';
      case 'volunteers':
        return 'Volunteer Submissions';
      case 'newsletters':
        return 'Newsletter Subscribers';
      case 'events':
        return 'Events Management';
      case 'gallery':
        return 'Gallery Management';
      case 'blogs':
        return 'Blog Review';
      case 'export':
        return 'Export Data';
      default:
        return 'Dashboard';
    }
  };

  const formattedAdminName = session?.adminName || 'Admin User';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardHome
            stats={{
              contacts: summary.contacts,
              volunteers: summary.volunteers,
              newsletters: summary.newsletters,
              events: summary.events,
              galleryImages: summary.galleryImages,
            }}
            recentContacts={contacts.slice(0, 5)}
            recentEvents={events.slice(0, 5)}
            onViewContact={() => {
              setActiveTab('contacts');
            }}
            onDeleteContact={handleDeleteContact}
          />
        );
      case 'contacts':
        return (
          <ContactSubmissionsPage
            contacts={contacts}
            onDeleteContact={handleDeleteContact}
            onUpdateContact={handleUpdateContact}
            onExportToExcel={handleExportToExcel}
          />
        );
      case 'events':
        return (
          <EventsManagementPage
            events={events}
            onAddEvent={handleAddEvent}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        );
      case 'volunteers':
        return (
          <VolunteerSubmissionsPage
            volunteers={volunteers}
            onDeleteVolunteer={handleDeleteVolunteer}
            onUpdateVolunteer={handleUpdateVolunteer}
          />
        );
      case 'newsletters':
        return (
          <NewsletterSubmissionsPage
            newsletters={newsletters}
            onDelete={handleDeleteNewsletter}
            onUpdate={handleUpdateNewsletter}
          />
        );
      case 'gallery':
        return (
          <GalleryManagementPage
            images={galleryImages}
            onAddImage={handleAddImage}
            onDeleteImage={handleDeleteImage}
            onUpdateCaption={handleUpdateCaption}
            onUpdateAlbum={handleUpdateAlbum}
          />
        );
      case 'blogs':
        return (
          <BlogSubmissionsPage
            blogs={blogSubmissions}
            onUpdateBlog={handleUpdateBlogSubmission}
            onDeleteBlog={handleDeleteBlogSubmission}
          />
        );
      case 'export':
        return (
          <ExportDataPage
            onExportContacts={handleExportContacts}
            onExportVolunteers={handleExportVolunteers}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="admin-app-bg min-h-screen">
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <div className="flex min-h-screen bg-black/5">
          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminHeader
              title={getPageTitle()}
              adminName={formattedAdminName}
              onRefresh={() => {
                if (session?.token) {
                  void fetchAllData(session.token);
                }
              }}
              isRefreshing={isLoading}
            />
            <main className="flex-1 p-4 md:p-6">
              {isLoading ? (
                <div className="rounded-2xl border border-[#d5e4d9] bg-white p-10 text-[#325443] shadow-sm">
                  <div className="animate-pulse">
                    <div className="mb-4 h-6 w-48 rounded bg-[#d7e5dc]" />
                    <div className="h-4 w-72 rounded bg-[#e4eee8]" />
                  </div>
                </div>
              ) : (
                renderContent()
              )}
            </main>
          </div>
        </div>
      )}
      <Toaster position="top-right" />
    </div>
  );
}
