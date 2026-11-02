import { BlogSubmission } from '../models/BlogSubmission.js';
import { Event } from '../models/Event.js';

export const CANONICAL_DOMAIN = 'https://arghyatrust.org';
export const DEFAULT_OG_IMAGE = `${CANONICAL_DOMAIN}/og-image.jpg`;

export const staticBlogs = [
  {
    slug: '3s-philosophy-holistic-approach',
    title: 'The 3S Philosophy: A Holistic Approach to Life',
    excerpt:
      'Understanding how Self-Excellence, Sustainability, and Spirituality work together to create lasting change in individuals and communities.',
    publishedAt: '2026-02-05T00:00:00+05:30',
    author: 'Sri Ranjan Bellarpady',
    tags: ['Spiritual Growth', '3S Philosophy', 'Community'],
  },
  {
    slug: 'swacch-manas-character-through-cleanliness',
    title: 'Swacch Manas: Building Character Through Cleanliness',
    excerpt:
      'How cleanliness education is shaping civic responsibility, self-respect, and teamwork among children and youth.',
    publishedAt: '2026-02-07T00:00:00+05:30',
    author: 'Program Team',
    tags: ['Cleanliness', 'Youth Programs', 'Civic Responsibility'],
  },
  {
    slug: 'youth-leadership-in-nation-building',
    title: 'Youth Leadership in Nation Building',
    excerpt:
      'Insights from youth workshops on discipline, value-based leadership, and building solutions for local challenges.',
    publishedAt: '2026-02-10T00:00:00+05:30',
    author: 'Workshop Team',
    tags: ['Youth Leadership', 'Nation Building', 'Self-Excellence'],
  },
  {
    slug: 'spiritual-gatherings-community-harmony',
    title: 'Spiritual Gatherings and Community Harmony',
    excerpt:
      'How shared spiritual spaces strengthen social trust, emotional resilience, and unity across diverse communities.',
    publishedAt: '2026-02-12T00:00:00+05:30',
    author: 'Events Team',
    tags: ['Spirituality', 'Community Harmony', 'Cultural Values'],
  },
  {
    slug: 'sustainability-circles-environmental-stewards',
    title: 'Sustainability Circles: Creating Environmental Stewards',
    excerpt:
      'A field-tested model for turning environmental awareness into local action through schools, youth clubs, and volunteers.',
    publishedAt: '2026-02-14T00:00:00+05:30',
    author: 'Environment Team',
    tags: ['Environment', 'Sustainability', 'Schools'],
  },
  {
    slug: 'volunteer-voices-service-growth-purpose',
    title: 'Volunteer Voices: Service, Growth, and Purpose',
    excerpt:
      'First-person reflections on how volunteering in education and outreach programs shaped confidence, empathy, and purpose.',
    publishedAt: '2026-02-16T00:00:00+05:30',
    author: 'Volunteer Network',
    tags: ['Volunteer Stories', 'Service', 'Community Impact'],
  },
];

export const staticPagesMetadata = {
  '/': {
    title: 'Arghya Trust | Self-Excellence, Sustainability & Spirituality',
    description:
      'Arghya Trust is a non-profit organization in Karnataka advancing education, sustainability, and spirituality through youth workshops, cleanliness drives, and community empowerment.',
    canonical: `${CANONICAL_DOMAIN}/`,
    ogType: 'website',
    priority: '1.0',
    changefreq: 'weekly',
  },
  '/about': {
    title: 'About Arghya Trust | Vision, Mission & 3S Leadership',
    description:
      'Learn about Arghya Trust vision, mission, and leadership under Sri Ranjan Bellarpady. Guided by the 3S philosophy to transform self, serve society, and offer to the divine.',
    canonical: `${CANONICAL_DOMAIN}/about`,
    ogType: 'article',
    priority: '0.9',
    changefreq: 'monthly',
  },
  '/donate': {
    title: 'Donate to Arghya Trust | Support Education & Sustainability',
    description:
      'Support Arghya Trust initiatives in education, environmental sustainability, and youth leadership across Karnataka. Transparent fund allocation and real community impact.',
    canonical: `${CANONICAL_DOMAIN}/donate`,
    ogType: 'website',
    priority: '0.9',
    changefreq: 'monthly',
  },
  '/events': {
    title: 'Arghya Trust Events | Community Gatherings & Youth Workshops',
    description:
      'Explore upcoming and past Arghya Trust events including Shri Durga Japa Yagna, Shatachandi Maha Yagna, Be & Make youth workshops, and Swachha Biligiri campaigns.',
    canonical: `${CANONICAL_DOMAIN}/events`,
    ogType: 'website',
    priority: '0.85',
    changefreq: 'weekly',
  },
  '/gallery': {
    title: 'Arghya Trust Photo Gallery | Social Impact & Field Moments',
    description:
      'View authentic photos from Arghya Trust programs, student workshops, cleanliness drives, and cultural-spiritual gatherings across Karnataka.',
    canonical: `${CANONICAL_DOMAIN}/gallery`,
    ogType: 'website',
    priority: '0.8',
    changefreq: 'weekly',
  },
  '/blog': {
    title: 'Arghya Trust Blog | Articles on Education, Growth & Sustainability',
    description:
      'Read practical reflections and verified field stories from Arghya Trust on self-development, sustainability, spirituality, and youth leadership.',
    canonical: `${CANONICAL_DOMAIN}/blog`,
    ogType: 'blog',
    priority: '0.85',
    changefreq: 'weekly',
  },
  '/blog/submit': {
    title: 'Submit an Article | Arghya Trust Community Stories',
    description:
      'Contribute your story or perspective on self-excellence, sustainability, or spirituality to the Arghya Trust blog network.',
    canonical: `${CANONICAL_DOMAIN}/blog/submit`,
    ogType: 'website',
    priority: '0.6',
    changefreq: 'monthly',
  },
  '/contact': {
    title: 'Contact Arghya Trust | Office Locations & Volunteer Opportunities',
    description:
      'Reach Arghya Trust offices in Srirangapatna and Mysuru. Connect for volunteering, educational partnerships, donations, or general queries.',
    canonical: `${CANONICAL_DOMAIN}/contact`,
    ogType: 'website',
    priority: '0.8',
    changefreq: 'monthly',
  },
};

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function resolveRouteSeo(pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (staticPagesMetadata[normalized]) {
    return {
      found: true,
      statusCode: 200,
      ...staticPagesMetadata[normalized],
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  if (normalized.startsWith('/blog/')) {
    const slug = normalized.replace('/blog/', '').trim();
    const staticPost = staticBlogs.find((item) => item.slug === slug);
    if (staticPost) {
      return {
        found: true,
        statusCode: 200,
        title: `${staticPost.title} | Arghya Trust Blog`,
        description: staticPost.excerpt,
        canonical: `${CANONICAL_DOMAIN}/blog/${staticPost.slug}`,
        ogType: 'article',
        ogImage: DEFAULT_OG_IMAGE,
        author: staticPost.author,
        publishedAt: staticPost.publishedAt,
      };
    }

    try {
      const dynamicPost = await BlogSubmission.findOne({ slug, status: 'approved' }).lean();
      if (dynamicPost) {
        return {
          found: true,
          statusCode: 200,
          title: `${dynamicPost.title} | Arghya Trust Blog`,
          description: dynamicPost.excerpt,
          canonical: `${CANONICAL_DOMAIN}/blog/${dynamicPost.slug}`,
          ogType: 'article',
          ogImage: dynamicPost.featuredImageUrl?.startsWith('http')
            ? dynamicPost.featuredImageUrl
            : DEFAULT_OG_IMAGE,
          author: dynamicPost.authorName,
          publishedAt: dynamicPost.approvedAt || dynamicPost.createdAt,
        };
      }
    } catch {
      // db lookup silent fallback
    }
  }

  if (normalized.startsWith('/events/')) {
    const slug = normalized.replace('/events/', '').trim().toLowerCase();
    try {
      const allEvents = await Event.find({ isVisible: { $ne: false } }).lean();
      const event = allEvents.find((e) => {
        if (e.slug && e.slug.toLowerCase() === slug) return true;
        if (String(e._id) === slug) return true;
        return false;
      });

      if (event) {
        return {
          found: true,
          statusCode: 200,
          title: `${event.title} | Arghya Trust Events`,
          description: event.description,
          canonical: `${CANONICAL_DOMAIN}/events/${event.slug || event._id}`,
          ogType: 'website',
          ogImage: event.imageUrl?.startsWith('http')
            ? event.imageUrl
            : `${CANONICAL_DOMAIN}${event.imageUrl || '/og-image.jpg'}`,
        };
      }
    } catch {
      // db lookup silent fallback
    }
  }

  // Not a valid public route
  return {
    found: false,
    statusCode: 404,
    title: 'Page Not Found | Arghya Trust',
    description: 'The requested page could not be found on Arghya Trust.',
    canonical: `${CANONICAL_DOMAIN}${normalized}`,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    noindex: true,
  };
}

export function injectSeoIntoHtml(rawHtml, seo) {
  let html = rawHtml;

  // 1. Replace Title
  if (seo.title) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeXml(seo.title)}</title>`);
  }

  // 2. Replace Description
  if (seo.description) {
    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeXml(seo.description)}" />`
    );
  }

  // 3. Replace Canonical
  if (seo.canonical) {
    html = html.replace(
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${seo.canonical}" />`
    );
  }

  // 4. Update or inject robots directive
  const robotsDirective = seo.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  html = html.replace(
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${robotsDirective}" />`
  );

  // 5. Update Open Graph
  if (seo.title) {
    html = html.replace(
      /<meta\s+property=["']og:title["'][^>]*>/i,
      `<meta property="og:title" content="${escapeXml(seo.title)}" />`
    );
  }
  if (seo.description) {
    html = html.replace(
      /<meta\s+property=["']og:description["'][^>]*>/i,
      `<meta property="og:description" content="${escapeXml(seo.description)}" />`
    );
  }
  if (seo.canonical) {
    html = html.replace(
      /<meta\s+property=["']og:url["'][^>]*>/i,
      `<meta property="og:url" content="${seo.canonical}" />`
    );
  }
  if (seo.ogType) {
    html = html.replace(
      /<meta\s+property=["']og:type["'][^>]*>/i,
      `<meta property="og:type" content="${seo.ogType}" />`
    );
  }

  // 6. Update Twitter
  if (seo.title) {
    html = html.replace(
      /<meta\s+name=["']twitter:title["'][^>]*>/i,
      `<meta name="twitter:title" content="${escapeXml(seo.title)}" />`
    );
  }
  if (seo.description) {
    html = html.replace(
      /<meta\s+name=["']twitter:description["'][^>]*>/i,
      `<meta name="twitter:description" content="${escapeXml(seo.description)}" />`
    );
  }

  return html;
}

export async function generateSitemapXml() {
  let dynamicBlogs = [];
  let dynamicEvents = [];
  try {
    dynamicBlogs = await BlogSubmission.find({ status: 'approved' })
      .select('slug updatedAt createdAt')
      .lean();
  } catch {
    dynamicBlogs = [];
  }

  try {
    dynamicEvents = await Event.find({ isVisible: { $ne: false } })
      .select('slug _id updatedAt createdAt')
      .lean();
  } catch {
    dynamicEvents = [];
  }

  const pagesUrls = Object.entries(staticPagesMetadata)
    .map(([path, meta]) => {
      return `  <url>
    <loc>${meta.canonical}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${meta.changefreq}</changefreq>
    <priority>${meta.priority}</priority>
  </url>`;
    })
    .join('\n');

  const staticBlogUrls = staticBlogs
    .map((blog) => {
      const date = (blog.publishedAt || '').split('T')[0] || '2026-02-15';
      return `  <url>
    <loc>${CANONICAL_DOMAIN}/blog/${blog.slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join('\n');

  const dynamicBlogUrls = dynamicBlogs
    .map((b) => {
      const date = (b.updatedAt || b.createdAt || new Date()).toISOString().split('T')[0];
      return `  <url>
    <loc>${CANONICAL_DOMAIN}/blog/${b.slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join('\n');

  const dynamicEventUrls = dynamicEvents
    .map((e) => {
      const date = (e.updatedAt || e.createdAt || new Date()).toISOString().split('T')[0];
      return `  <url>
    <loc>${CANONICAL_DOMAIN}/events/${e.slug || e._id}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pagesUrls}
${staticBlogUrls}
${dynamicBlogUrls}
${dynamicEventUrls}
</urlset>`;
}

