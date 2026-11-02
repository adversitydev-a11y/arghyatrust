export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
}

export interface VolunteerSubmission {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  qualification?: string;
  cityState?: string;
  language?: string;
  email: string;
  whatsapp?: string;
  interest?: string;
  duration?: string;
  pledge?: boolean;
  date: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  sourcePage?: string;
  date: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  status: 'Upcoming' | 'Completed';
  imageUrl?: string;
  location?: string;
  participants?: number;
  registrationLink?: string;
  brochureUrl?: string;
  featured?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  mainImageUrl?: string;
  relatedImages?: string[];
  caption: string;
  sortOrder?: number;
}

export interface AdminSummary {
  contacts: number;
  volunteers: number;
  newsletters: number;
  events: number;
  galleryImages: number;
}

export interface BlogSubmission {
  id: string;
  title: string;
  slug: string;
  category: string;
  authorName: string;
  authorEmail: string;
  excerpt: string;
  content: string;
  readTime: string;
  featuredImageUrl: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  date: string;
}
