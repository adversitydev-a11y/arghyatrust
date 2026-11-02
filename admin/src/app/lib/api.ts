import type {
  AdminSummary,
  BlogSubmission,
  ContactSubmission,
  EventItem,
  GalleryImage,
  NewsletterSubscriber,
  VolunteerSubmission,
} from './types';

function resolveApiBaseUrl() {
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  const raw = String(import.meta.env.VITE_API_BASE_URL || '').trim();
  if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw.replace(/\/$/, '');
  }
  return '';
}

const API_BASE_URL = resolveApiBaseUrl();

type ApiResponse<T> = {
  ok: boolean;
  data: T;
};

export function normalizeMediaUrl(url: string | undefined) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  }
  return `/${url}`;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : 'Request failed';
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

async function safeFetch(input: string, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(`Unable to reach API server at ${API_BASE_URL}`);
  }
}

function mapContact(item: any): ContactSubmission {
  return {
    id: String(item._id),
    name: item.name || '',
    email: item.email || '',
    phone: item.phone || '',
    message: item.message || '',
    date: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
  };
}

function mapVolunteer(item: any): VolunteerSubmission {
  return {
    id: String(item._id),
    name: item.name || '',
    age: item.age,
    gender: item.gender,
    qualification: item.qualification || '',
    cityState: item.cityState || '',
    language: item.language || '',
    email: item.email || '',
    whatsapp: item.whatsapp || '',
    interest: item.interest || '',
    duration: item.duration || '',
    pledge: Boolean(item.pledge),
    date: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
  };
}

function mapNewsletter(item: any): NewsletterSubscriber {
  return {
    id: String(item._id),
    email: item.email || '',
    sourcePage: item.sourcePage || 'global',
    date: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
  };
}

function mapEvent(item: any): EventItem {
  return {
    id: String(item._id),
    title: item.title || '',
    description: item.description || '',
    date: item.date || '',
    category: item.category || '',
    status: item.status === 'Completed' ? 'Completed' : 'Upcoming',
    imageUrl: normalizeMediaUrl(item.imageUrl),
    location: item.location || '',
    participants: item.participants,
    registrationLink: item.registrationLink || '',
    brochureUrl: item.brochureUrl || '',
    featured: Boolean(item.featured),
    isVisible: item.isVisible !== false,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : 0,
  };
}

function mapGallery(item: any): GalleryImage {
  const mainImageUrl = normalizeMediaUrl(item.mainImageUrl || item.url);
  return {
    id: String(item._id),
    url: mainImageUrl,
    mainImageUrl,
    relatedImages: Array.isArray(item.relatedImages)
      ? item.relatedImages.map((img: string) => normalizeMediaUrl(img))
      : [],
    caption: item.caption || '',
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : 0,
  };
}

function mapBlogSubmission(item: any): BlogSubmission {
  return {
    id: String(item._id),
    title: item.title || '',
    slug: item.slug || '',
    category: item.category || 'Stories',
    authorName: item.authorName || '',
    authorEmail: item.authorEmail || '',
    excerpt: item.excerpt || '',
    content: item.content || '',
    readTime: item.readTime || '',
    featuredImageUrl: normalizeMediaUrl(item.featuredImageUrl),
    tags: Array.isArray(item.tags) ? item.tags.map((tag: string) => String(tag)) : [],
    status: item.status === 'approved' || item.status === 'rejected' ? item.status : 'pending',
    reviewNotes: item.reviewNotes || '',
    seoTitle: item.seoTitle || '',
    seoDescription: item.seoDescription || '',
    publishedAt: item.publishedAt || item.approvedAt || item.createdAt || '',
    date: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
  };
}


export async function loginAdmin(loginId: string, password: string) {
  let response: Response;
  try {
    response = await safeFetch(`${API_BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginId, username: loginId, password }),
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Unable to reach API server at ${API_BASE_URL}`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : 'Login failed';
    throw new Error(message);
  }

  const payload = await response.json();
  return {
    token: String(payload.token || ''),
    expiresAt: Number(payload.expiresAt || 0),
    adminName: String(payload?.admin?.name || 'Admin User'),
  };
}

export async function getSummary(token: string): Promise<AdminSummary> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<AdminSummary>(response);
}

export async function getContacts(
  token: string,
  options?: { startDate?: string; endDate?: string },
): Promise<ContactSubmission[]> {
  const query = new URLSearchParams();
  if (options?.startDate) query.set('startDate', options.startDate);
  if (options?.endDate) query.set('endDate', options.endDate);

  const response = await safeFetch(
    `${API_BASE_URL}/api/admin/contacts${query.size ? `?${query.toString()}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = await parseResponse<any[]>(response);
  return data.map(mapContact);
}

export async function deleteContact(token: string, id: string) {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/contacts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseResponse<unknown>(response);
}

export async function updateContact(
  token: string,
  id: string,
  payload: Pick<ContactSubmission, 'name' | 'email' | 'phone' | 'message'>,
): Promise<ContactSubmission> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/contacts/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<any>(response);
  return mapContact(data);
}

export async function getVolunteers(
  token: string,
  options?: { startDate?: string; endDate?: string },
): Promise<VolunteerSubmission[]> {
  const query = new URLSearchParams();
  if (options?.startDate) query.set('startDate', options.startDate);
  if (options?.endDate) query.set('endDate', options.endDate);

  const response = await safeFetch(
    `${API_BASE_URL}/api/admin/volunteers${query.size ? `?${query.toString()}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = await parseResponse<any[]>(response);
  return data.map(mapVolunteer);
}

export async function deleteVolunteer(token: string, id: string) {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/volunteers/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseResponse<unknown>(response);
}

export async function updateVolunteer(
  token: string,
  id: string,
  payload: Omit<VolunteerSubmission, 'id' | 'date'>,
): Promise<VolunteerSubmission> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/volunteers/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<any>(response);
  return mapVolunteer(data);
}

export async function getNewsletters(
  token: string,
  options?: { startDate?: string; endDate?: string },
): Promise<NewsletterSubscriber[]> {
  const query = new URLSearchParams();
  if (options?.startDate) query.set('startDate', options.startDate);
  if (options?.endDate) query.set('endDate', options.endDate);

  const response = await safeFetch(
    `${API_BASE_URL}/api/admin/newsletters${query.size ? `?${query.toString()}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = await parseResponse<any[]>(response);
  return data.map(mapNewsletter);
}

export async function deleteNewsletter(token: string, id: string) {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/newsletters/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseResponse<unknown>(response);
}

export async function updateNewsletter(
  token: string,
  id: string,
  payload: Pick<NewsletterSubscriber, 'email' | 'sourcePage'>,
): Promise<NewsletterSubscriber> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/newsletters/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<any>(response);
  return mapNewsletter(data);
}

export async function getEvents(token: string): Promise<EventItem[]> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse<any[]>(response);
  return data.map(mapEvent);
}

export async function uploadEventImage(
  token: string,
  file: File,
): Promise<{ ok: boolean; imageUrl: string; filename: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await safeFetch(`${API_BASE_URL}/api/admin/events/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  return parseResponse<{ ok: boolean; imageUrl: string; filename: string }>(response);
}

export async function createEvent(token: string, event: Omit<EventItem, 'id'>): Promise<EventItem> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/events`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(event),
  });
  const data = await parseResponse<any>(response);
  return mapEvent(data);
}

export async function updateEvent(
  token: string,
  id: string,
  event: Omit<EventItem, 'id'>,
): Promise<EventItem> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/events/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(event),
  });
  const data = await parseResponse<any>(response);
  return mapEvent(data);
}

export async function deleteEvent(token: string, id: string) {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/events/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseResponse<unknown>(response);
}

export async function getGallery(token: string): Promise<GalleryImage[]> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/gallery`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse<any[]>(response);
  return data.map(mapGallery);
}

export async function createGalleryImage(
  token: string,
  image: Omit<GalleryImage, 'id'>,
): Promise<GalleryImage> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/gallery`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(image),
  });
  const data = await parseResponse<any>(response);
  return mapGallery(data);
}

export async function uploadGalleryImageProgram(
  token: string,
  payload: { caption: string; mainImage: File; relatedImages: File[] },
): Promise<GalleryImage> {
  const formData = new FormData();
  formData.append('caption', payload.caption);
  formData.append('mainImage', payload.mainImage);
  for (const file of payload.relatedImages) {
    formData.append('relatedImages', file);
  }

  const response = await safeFetch(`${API_BASE_URL}/api/admin/gallery/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await parseResponse<any>(response);
  return mapGallery(data);
}

export async function uploadGalleryImageUpdate(
  token: string,
  id: string,
  payload: {
    caption?: string;
    mainImage?: File;
    relatedImages?: File[];
    existingRelatedImages?: string[];
  },
): Promise<GalleryImage> {
  const formData = new FormData();
  if (payload.caption !== undefined) formData.append('caption', payload.caption);
  if (payload.mainImage) formData.append('mainImage', payload.mainImage);
  if (payload.existingRelatedImages !== undefined) {
    formData.append('existingRelatedImages', JSON.stringify(payload.existingRelatedImages));
  }
  if (payload.relatedImages && payload.relatedImages.length > 0) {
    for (const file of payload.relatedImages) {
      formData.append('relatedImages', file);
    }
  }

  const response = await safeFetch(`${API_BASE_URL}/api/admin/gallery/${id}/upload`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await parseResponse<any>(response);
  return mapGallery(data);
}

export async function updateGalleryImage(
  token: string,
  id: string,
  image: Omit<GalleryImage, 'id'>,
): Promise<GalleryImage> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/gallery/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(image),
  });
  const data = await parseResponse<any>(response);
  return mapGallery(data);
}

export async function deleteGalleryImage(token: string, id: string) {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/gallery/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await parseResponse<unknown>(response);
}

export async function getBlogSubmissions(token: string): Promise<BlogSubmission[]> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/blog-submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseResponse<any[]>(response);
  return data.map(mapBlogSubmission);
}

export async function uploadBlogImage(
  token: string,
  file: File,
): Promise<{ ok: boolean; imageUrl: string; filename: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await safeFetch(`${API_BASE_URL}/api/admin/blog-submissions/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  return parseResponse<{ ok: boolean; imageUrl: string; filename: string }>(response);
}

export async function updateBlogSubmission(
  token: string,
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
): Promise<BlogSubmission> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/blog-submissions/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<any>(response);
  return mapBlogSubmission(data);
}

export async function deleteBlogSubmission(token: string, id: string): Promise<boolean> {
  const response = await safeFetch(`${API_BASE_URL}/api/admin/blog-submissions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await parseResponse<unknown>(response);
  return true;
}
