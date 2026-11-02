import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  Download,
  ArrowLeft,
  Share2,
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { Section } from '../components/Section';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getPublicEventBySlug,
  getPublicEvents,
  normalizeMediaUrl,
  type PublicEvent,
} from '../lib/api';

import sectionBackground from '../../assets/back.jpg';
import durgaImg from '../../assets/devii.jpg';
import shatachandiImg from '../../assets/devii1.jpg';
import cardImg1 from '../../assets/1U.jpg';
import cardImg2 from '../../assets/2U.jpg';
import cardImg3 from '../../assets/3U.jpg';
import swacchImg from '../../assets/10.jpg';
import beMakeImg from '../../assets/20.jpeg';
import sustainabilityCirclesImg from '../../assets/30.jpg';
import durgaJapaPdf from '../../assets/DurgaJapa.pdf';
import shatachandiPdf from '../../assets/Shatachandi.pdf';

interface LocalFallbackEvent {
  id: string;
  slug: string;
  title: string;
  date: string;
  location: string;
  description: string;
  image: string;
  registrationLink?: string;
  brochureUrl?: string;
  category: string;
  status: 'Upcoming' | 'Completed';
  participants?: number;
  featured?: boolean;
}

const STATIC_FALLBACK_EVENTS: LocalFallbackEvent[] = [
  {
    id: '6994247a4feb3be3fb2151cd',
    slug: 'shri-durga-japa-yagna-2026',
    title: 'Shri Durga Japa Yagna Abhiyana - 2026',
    date: 'Ongoing Registration',
    location: 'Multiple Locations',
    description: 'Collective spiritual effort rooted in devotion and discipline.',
    image: durgaImg,
    registrationLink: '/contact',
    brochureUrl: durgaJapaPdf,
    category: 'Spirituality',
    status: 'Upcoming',
    featured: true,
  },
  {
    id: '6994247a4feb3be3fb2151ce',
    slug: 'shatachandi-maha-yagna-january-2026',
    title: 'Shatachandi Maha Yagna – January 2026',
    date: 'January 2026',
    location: 'Sri Ramakrishna Tapovana, Polali',
    description: 'Experience the sacred Shatachandi Maha Yagna and offer your devotion.',
    image: shatachandiImg,
    registrationLink: '/contact',
    brochureUrl: shatachandiPdf,
    category: 'Spirituality',
    status: 'Completed',
    featured: true,
  },
  {
    id: '6994247a4feb3be3fb2151cf',
    slug: 'swachha-biligiri-br-hills-cleanliness-campaign',
    title: 'Swachha Biligiri (BR Hills Cleanliness Campaign)',
    date: 'Upcoming',
    location: 'BR Hills, Karnataka',
    description: 'Holistic cleanliness and sustainability initiative in Biligiri Rangan Hills.',
    image: cardImg1,
    registrationLink: '/contact',
    category: 'Sustainability',
    status: 'Upcoming',
    featured: false,
  },
  {
    id: '6994247a4feb3be3fb2151d0',
    slug: 'mandira-uttana-yojana-temple-rejuvenation-program',
    title: 'Mandira Uttana Yojana (Temple Rejuvenation Program)',
    date: 'Upcoming',
    location: 'Karnataka',
    description: 'Temple rejuvenation with preservation, awareness, and community participation.',
    image: cardImg2,
    registrationLink: '/contact',
    category: 'Community',
    status: 'Upcoming',
    featured: false,
  },
  {
    id: '6994247a4feb3be3fb2151d1',
    slug: 'residential-school-integrated-education-model',
    title: 'Residential School (Integrated Education Model)',
    date: 'Upcoming',
    location: 'Mangaluru',
    description: 'Integrated education model nurturing clarity, compassion, and leadership.',
    image: cardImg3,
    registrationLink: '/contact',
    category: 'Education',
    status: 'Upcoming',
    featured: false,
  },
  {
    id: '6994247a4feb3be3fb2151d2',
    slug: 'swacch-manas',
    title: 'Swacch Manas',
    date: 'Completed',
    location: 'Mangaluru',
    participants: 150,
    image: swacchImg,
    description:
      'An after-school program blending civic awareness, cleanliness, life skills, soft skills, and career counseling for holistic child development. In Mangaluru in association with Ramakrishna Mission Swacch Mangaluru Abhiyan.',
    registrationLink: '/contact',
    category: 'Education',
    status: 'Completed',
    featured: false,
  },
  {
    id: '6994247a4feb3be3fb2151d3',
    slug: 'be-make-youth-workshop',
    title: 'Be & Make (Youth Workshop)',
    date: 'Completed',
    location: 'Mangalore University',
    participants: 120,
    image: beMakeImg,
    description:
      'Personality development, leadership, financial literacy, industry-based training, and nation-building spirit in association with Mangalore University Swami Vivekananda Study Centre.',
    registrationLink: '/contact',
    category: 'Self-Excellence',
    status: 'Completed',
    featured: false,
  },
  {
    id: '6994247a4feb3be3fb2151d4',
    slug: 'sustainability-circles',
    title: 'Sustainability Circles',
    date: 'Completed',
    location: 'Schools & Colleges',
    participants: 100,
    image: sustainabilityCirclesImg,
    description:
      'Interactive sessions on waste management, cleanliness, and green practices to build responsible citizens and environmental stewards.',
    registrationLink: '/contact',
    category: 'Sustainability',
    status: 'Completed',
    featured: false,
  },
];

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [allEvents, setAllEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const pageBackgroundStyle = {
    backgroundImage: `url(${sectionBackground})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  } as const;
  const transparentSectionClass = '!bg-transparent';

  // Load single event by slug or ID
  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    getPublicEventBySlug(slug)
      .then((data) => {
        if (!data || data.isVisible === false) {
          setNotFound(true);
        } else {
          setEvent(data);
        }
      })
      .catch(() => {
        // Fallback matching against static initial list
        const cleanSlug = slug.toLowerCase();
        const fallback = STATIC_FALLBACK_EVENTS.find(
          (e) =>
            e.slug.toLowerCase() === cleanSlug ||
            e.id === cleanSlug ||
            cleanSlug.includes(e.slug) ||
            e.slug.includes(cleanSlug),
        );

        if (fallback) {
          setEvent({
            _id: fallback.id,
            slug: fallback.slug,
            title: fallback.title,
            description: fallback.description,
            date: fallback.date,
            location: fallback.location,
            category: fallback.category,
            status: fallback.status,
            participants: fallback.participants,
            imageUrl: fallback.image,
            registrationLink: fallback.registrationLink,
            brochureUrl: fallback.brochureUrl,
            featured: fallback.featured,
            isVisible: true,
          });
        } else {
          setNotFound(true);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  // Load all events for related events recommendations
  useEffect(() => {
    getPublicEvents()
      .then((data) => {
        if (Array.isArray(data)) {
          setAllEvents(data.filter((e) => e.isVisible !== false));
        }
      })
      .catch(() => {
        // silent fallback
      });
  }, []);

  // Set page title and schema.org structured data
  useEffect(() => {
    if (!event) return;

    const previousTitle = document.title;
    document.title = `${event.title} | Arghya Trust Events`;

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : '';
    if (metaDesc && event.description) {
      metaDesc.setAttribute('content', event.description);
    }

    // Inject Schema.org Event JSON-LD
    const scriptId = 'schema-event-jsonld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description,
      startDate: event.date,
      eventStatus:
        event.status === 'Completed'
          ? 'https://schema.org/EventMovedOnline'
          : 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: event.location || 'Multiple Locations',
        address: {
          '@type': 'PostalAddress',
          addressRegion: 'Karnataka',
          addressCountry: 'IN',
        },
      },
      image: event.imageUrl ? [normalizeMediaUrl(event.imageUrl)] : undefined,
      organizer: {
        '@type': 'Organization',
        name: 'Arghya Trust',
        url: 'https://arghyatrust.org',
      },
    };
    script.text = JSON.stringify(jsonLd);

    return () => {
      document.title = previousTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
      const existingScript = document.getElementById(scriptId);
      if (existingScript) existingScript.remove();
    };
  }, [event]);

  // Related events list (exclude current event)
  const relatedEvents = useMemo(() => {
    if (!event) return [];
    return allEvents
      .filter((e) => e._id !== event._id && e.slug !== event.slug)
      .slice(0, 3);
  }, [allEvents, event]);

  // Resolve best image with fallback
  const resolvedImage = useMemo(() => {
    if (!event) return cardImg1;
    if (event.imageUrl) return normalizeMediaUrl(event.imageUrl);
    const fallback = STATIC_FALLBACK_EVENTS.find(
      (s) => s.id === event._id || s.title.toLowerCase() === event.title.toLowerCase(),
    );
    return fallback?.image || cardImg1;
  }, [event]);

  // Share handler
  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Event link copied to clipboard!');
      });
    } else {
      toast.info('Share URL: ' + url);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-20" style={pageBackgroundStyle}>
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse mb-8" />
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-6 w-24 bg-green-200 rounded-full animate-pulse" />
              <div className="h-10 w-3/4 bg-gray-300 rounded-xl animate-pulse" />
              <div className="h-20 w-full bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-28 w-full bg-gray-200 rounded-2xl animate-pulse" />
            </div>
            <div className="lg:col-span-5">
              <div className="h-80 w-full bg-gray-300 rounded-3xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (notFound || !event) {
    return (
      <div className="min-h-screen pt-28 pb-20 flex items-center justify-center" style={pageBackgroundStyle}>
        <div className="container mx-auto px-4 max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Event Not Found</h1>
          <p className="text-gray-600 mb-6 text-base leading-relaxed">
            The event you are looking for does not exist, has been removed, or is currently unpublished.
          </p>
          <Button
            onClick={() => navigate('/events')}
            className="bg-[#50b94b] hover:bg-[#439e3f] text-white px-6 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Events
          </Button>
        </div>
      </div>
    );
  }

  const isCompleted = event.status === 'Completed';
  const registrationUrl = event.registrationLink || '/contact';
  const isExternalRegistration =
    registrationUrl.startsWith('http://') || registrationUrl.startsWith('https://');

  return (
    <div className="min-h-screen pt-24 pb-20" style={pageBackgroundStyle}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#50b94b] transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{t('events.hero.desc') ? 'Back to Events' : 'Back to Events'}</span>
          </Link>
        </div>

        {/* Section 1: Hero & Event Overview */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-12 gap-8 items-start mb-12"
        >
          {/* Left Details Column */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Badges strip */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {event.featured && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  Featured Event
                </Badge>
              )}
              <Badge className="bg-[#50b94b]/15 text-[#388e3c] border-none px-3 py-1 text-xs font-semibold">
                {event.category || 'General'}
              </Badge>
              <Badge
                className={`border-none px-3 py-1 text-xs font-semibold ${
                  isCompleted
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isCompleted ? 'Completed' : 'Upcoming Event'}
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
              {event.title}
            </h1>

            {/* Short Description */}
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              {event.description}
            </p>

            {/* Meta Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 rounded-2xl bg-white/90 backdrop-blur-md border border-gray-200/80 shadow-xs mb-8">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-[#50b94b] flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Timing</p>
                  <p className="text-sm font-semibold text-gray-800">{event.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-[#50b94b] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Venue / Location</p>
                  <p className="text-sm font-semibold text-gray-800">{event.location || 'Multiple Locations'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-[#50b94b] flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Domain / Category</p>
                  <p className="text-sm font-semibold text-gray-800">{event.category}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 text-[#50b94b] flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Participants</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {event.participants && event.participants > 0
                      ? `${event.participants}+ Community Members`
                      : 'Open to All Devotees & Citizens'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons Strip */}
            <div className="flex flex-wrap items-center gap-3">
              {!isCompleted ? (
                isExternalRegistration ? (
                  <a
                    href={registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button className="bg-[#50b94b] hover:bg-[#439e3f] text-white px-7 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2">
                      <span>Register Now</span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                ) : (
                  <Link to={registrationUrl}>
                    <Button className="bg-[#50b94b] hover:bg-[#439e3f] text-white px-7 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2">
                      <span>Register Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Event Concluded</span>
                </div>
              )}

              {event.brochureUrl && (
                <a
                  href={normalizeMediaUrl(event.brochureUrl)}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="border-[#123c7c] text-[#123c7c] hover:bg-gray-50 px-5 py-3 rounded-xl font-semibold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Invitation (PDF)</span>
                  </Button>
                </a>
              )}

              <Button
                variant="outline"
                onClick={handleShare}
                title="Share Event Link"
                className="border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Share</span>
              </Button>
            </div>
          </div>

          {/* Right Image Banner Column */}
          <div className="lg:col-span-5">
            <Card className="overflow-hidden rounded-3xl border-2 border-green-200/70 shadow-lg bg-white/95 backdrop-blur-md">
              <div className="relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] w-full overflow-hidden bg-gray-100 flex items-center justify-center">
                <img
                  src={resolvedImage}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-black/60 backdrop-blur-md text-white border-none font-medium text-xs px-3 py-1">
                    {event.status}
                  </Badge>
                </div>
              </div>

              {/* Quick Summary Footer */}
              <div className="p-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#50b94b]" />
                  <span>Status: <strong>{event.status}</strong></span>
                </div>
                <div>
                  Organized by: <strong className="text-gray-700">Arghya Trust</strong>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Section 2: Complete Event Information & Details */}
        <div className="grid lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-8 space-y-6">
            {/* About the Event */}
            <Card className="p-6 md:p-8 rounded-3xl bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xs">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2.5">
                <FileText className="w-6 h-6 text-[#50b94b]" />
                About This Event
              </h2>
              <div className="prose prose-green max-w-none text-gray-700 leading-relaxed space-y-4">
                <p className="text-base sm:text-lg">{event.description}</p>
                <p className="text-sm sm:text-base text-gray-600">
                  Arghya Trust invites volunteers, community leaders, and devotees to join in this
                  effort. Through our core pillars of Self-Excellence, Sustainability, and
                  Spirituality (3S), every initiative is designed to create lasting positive impact
                  in individuals and the broader community.
                </p>
              </div>

              {/* Event Highlights Strip */}
              <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Category</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{event.category}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Location</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{event.location || 'Multiple Locations'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Timeline</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">{event.date}</p>
                </div>
              </div>
            </Card>

            {/* Important Instructions / Guidelines */}
            <Card className="p-6 md:p-8 rounded-3xl bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xs">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#50b94b]" />
                Important Guidelines & Participation
              </h2>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#50b94b] mt-2 shrink-0" />
                  <span>All sessions are organized with devotion, civic responsibility, and environmental consciousness.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#50b94b] mt-2 shrink-0" />
                  <span>Participants are requested to arrive on time and adhere to the venue guidelines.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#50b94b] mt-2 shrink-0" />
                  <span>For queries regarding transport, accommodation, or remote participation, please contact our coordinator team.</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Right Action & Organizer Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Action Box */}
            <Card className="p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xs">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Participation</h3>
              {!isCompleted ? (
                <>
                  <p className="text-xs text-gray-500 mb-4">
                    Registrations are currently open for this event. Reserve your spot or get in touch with our organizers.
                  </p>
                  {isExternalRegistration ? (
                    <a
                      href={registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full mb-3"
                    >
                      <Button className="w-full bg-[#50b94b] hover:bg-[#439e3f] text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2">
                        <span>Register Now</span>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  ) : (
                    <Link to={registrationUrl} className="block w-full mb-3">
                      <Button className="w-full bg-[#50b94b] hover:bg-[#439e3f] text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2">
                        <span>Register Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 text-center mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Event Completed</p>
                  <p className="text-[11px] text-gray-500">
                    This program has concluded. You can view memories in our gallery.
                  </p>
                  <Link to="/gallery" className="inline-block mt-3">
                    <Button variant="outline" size="sm" className="border-[#123c7c] text-[#123c7c] text-xs">
                      View Gallery
                    </Button>
                  </Link>
                </div>
              )}

              {event.brochureUrl && (
                <a
                  href={normalizeMediaUrl(event.brochureUrl)}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs py-2 font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Download Brochure</span>
                  </Button>
                </a>
              )}
            </Card>

            {/* Organizer Card */}
            <Card className="p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xs">
              <h3 className="text-base font-bold text-gray-900 mb-2">Organized by Arghya Trust</h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Arghya Trust is a non-profit registered social trust committed to Self-Excellence,
                Cleanliness & Sustainability, and Cultural-Spiritual Awakening across Karnataka.
              </p>
              <div className="space-y-2 text-xs text-gray-600">
                <p><strong>Email:</strong> contact@arghyatrust.org</p>
                <p><strong>Website:</strong> arghyatrust.org</p>
                <p><strong>Location:</strong> Srirangapatna & Mysuru, Karnataka</p>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100">
                <Link to="/contact">
                  <Button variant="ghost" size="sm" className="w-full text-[#50b94b] hover:bg-green-50 text-xs font-semibold">
                    Contact Organizer Team →
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Section 6: Related Events */}
        {relatedEvents.length > 0 && (
          <Section
            eyebrow="Explore More"
            title="Related Events"
            centered
            background="white"
            className={transparentSectionClass}
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedEvents.map((related, idx) => {
                const targetSlug = related.slug || related._id;
                const relatedImg = related.imageUrl
                  ? normalizeMediaUrl(related.imageUrl)
                  : STATIC_FALLBACK_EVENTS.find(
                      (s) => s.id === related._id || s.title.toLowerCase() === related.title.toLowerCase(),
                    )?.image || cardImg1;

                return (
                  <motion.div
                    key={related._id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                    viewport={{ once: true }}
                  >
                    <Card className="events-card overflow-hidden hover:shadow-xl transition-all group h-full flex flex-col rounded-3xl border border-gray-200/80 bg-white">
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img
                          src={relatedImg}
                          alt={related.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <Badge className="absolute top-4 right-4 bg-[#50b94b] text-white">
                          {related.category || 'General'}
                        </Badge>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg font-bold mb-2 group-hover:text-[#50b94b] transition-colors">
                            {related.title}
                          </h3>
                          <p className="text-gray-600 mb-4 text-xs line-clamp-2">
                            {related.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                            <Calendar className="w-3.5 h-3.5 text-[#50b94b]" />
                            <span>{related.date}</span>
                          </div>
                        </div>

                        <Link to={`/events/${targetSlug}`} className="mt-2">
                          <Button
                            variant="outline"
                            className="w-full border-[#50b94b] text-[#50b94b] hover:bg-[#50b94b] hover:text-white rounded-xl text-xs font-semibold"
                          >
                            View Details
                            <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
