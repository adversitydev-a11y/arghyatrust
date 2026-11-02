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

type RequestBody = Record<string, unknown>;
type ApiResponse<T> = { ok: boolean; data: T };

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

async function postJson(path: string, body: RequestBody) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`Unable to reach API server at ${API_BASE_URL}`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : 'Request failed';
    throw new Error(message);
  }

  return response.json().catch(() => ({}));
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new Error(`Unable to reach API server at ${API_BASE_URL}`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : 'Request failed';
    throw new Error(message);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

export interface PublicEvent {
  _id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  category: string;
  status: 'Upcoming' | 'Completed';
  participants?: number;
  imageUrl?: string;
  registrationLink?: string;
  brochureUrl?: string;
  featured?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicGalleryImage {
  _id: string;
  url?: string;
  mainImageUrl?: string;
  relatedImages?: string[];
  caption: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicBlogPost {
  _id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  publishedAt: string;
  readTime: string;
  featuredImage: string;
  excerpt: string;
  content: string;
  tags: string[];
}

export function submitContact(payload: {
  name: string;
  email: string;
  phone?: string;
  message: string;
  sourcePage?: string;
}) {
  return postJson('/api/contact', payload);
}

export function submitVolunteer(payload: {
  name: string;
  age?: number | string;
  gender?: string;
  qualification?: string;
  cityState?: string;
  language?: string;
  email: string;
  whatsapp?: string;
  interest?: string;
  duration?: string;
  pledge?: boolean;
  sourcePage?: string;
}) {
  return postJson('/api/volunteer', payload);
}

export function submitNewsletter(payload: { email: string; sourcePage?: string }) {
  return postJson('/api/newsletter', payload);
}

export function trackCta(payload: {
  page: string;
  section: string;
  action: string;
  label?: string;
  targetPath?: string;
  targetUrl?: string;
  meta?: Record<string, unknown>;
}) {
  return fetch(`${API_BASE_URL}/api/cta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export function getPublicEvents(includeHidden = false) {
  const query = includeHidden ? '?includeHidden=true' : '';
  return getJson<PublicEvent[]>(`/api/events${query}`).then((events) =>
    events.map((event) => ({
      ...event,
      imageUrl: normalizeMediaUrl(event.imageUrl),
      brochureUrl: normalizeMediaUrl(event.brochureUrl),
    })),
  );
}

export async function updateEventDetails(
  id: string,
  payload: Partial<PublicEvent>,
  token?: string,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/api/admin/events/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update event');
  }
  return response.json();
}

export async function toggleEventVisibility(
  id: string,
  isVisible: boolean,
  token?: string,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/api/admin/events/${id}/visibility`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ isVisible }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to toggle event visibility');
  }
  return response.json();
}

export function getPublicGallery() {
  return getJson<PublicGalleryImage[]>('/api/gallery');
}

export async function submitBlog(payload: {
  title: string;
  category: string;
  authorName: string;
  authorEmail: string;
  excerpt: string;
  content: string;
  tags: string;
  image: File;
}) {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('category', payload.category);
  formData.append('authorName', payload.authorName);
  formData.append('authorEmail', payload.authorEmail);
  formData.append('excerpt', payload.excerpt);
  formData.append('content', payload.content);
  formData.append('tags', payload.tags);
  formData.append('image', payload.image);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/blogs/submit`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error(`Unable to reach API server at ${API_BASE_URL}`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.error === 'string' ? payload.error : 'Request failed';
    throw new Error(message);
  }

  return response.json().catch(() => ({}));
}

export function getPublicBlogs() {
  return getJson<PublicBlogPost[]>('/api/blogs');
}
