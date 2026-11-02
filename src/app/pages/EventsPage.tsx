import { useState, useEffect, useMemo } from 'react';
import { Section } from '../components/Section';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Calendar,
  MapPin,
  Users,
  Search,
  X,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { getPublicEvents, type PublicEvent } from '../lib/api';
import {
  isPastEvent,
  isComingEvent,
  type EventFilterType,
} from '../lib/eventClassification';

import durgaImg from '../../assets/devii.jpg';
import shatachandiImg from '../../assets/devii1.jpg';
import cardImg1 from '../../assets/1U.jpg';
import cardImg2 from '../../assets/2U.jpg';
import cardImg3 from '../../assets/3U.jpg';
import durgaJapaPdf from '../../assets/DurgaJapa.pdf';
import shatachandiPdf from '../../assets/Shatachandi.pdf';
import swacchImg from '../../assets/10.jpg';
import beMakeImg from '../../assets/20.jpeg';
import sustainabilityCirclesImg from '../../assets/30.jpg';
import sectionBackground from '../../assets/back.jpg';

interface DisplayEvent {
  _id?: string;
  id?: string;
  title: string;
  date: string;
  location?: string;
  description: string;
  category: string;
  status: 'Upcoming' | 'Completed';
  participants?: number;
  imageUrl?: string;
  image: string;
  registrationLink?: string;
  brochureUrl?: string;
  featured?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
}

const INITIAL_EVENTS: DisplayEvent[] = [
  {
    id: '6994247a4feb3be3fb2151cd',
    title: 'Shri Durga Japa Yagna Abhiyana - 2026',
    date: 'Ongoing Registration',
    location: 'Multiple Locations',
    description: 'Collective spiritual effort rooted in devotion and discipline.',
    category: 'Spirituality',
    status: 'Upcoming',
    image: durgaImg,
    registrationLink: '/contact',
    brochureUrl: durgaJapaPdf,
    featured: true,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151ce',
    title: 'Shatachandi Maha Yagna – January 2026',
    date: 'January 2026',
    location: 'Sri Ramakrishna Tapovana, Polali',
    description: 'Experience the sacred Shatachandi Maha Yagna and offer your devotion.',
    category: 'Spirituality',
    status: 'Completed',
    image: shatachandiImg,
    registrationLink: '/contact',
    brochureUrl: shatachandiPdf,
    featured: true,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151cf',
    title: 'Swachha Biligiri (BR Hills Cleanliness Campaign)',
    date: 'Upcoming',
    location: 'BR Hills, Karnataka',
    description: 'Holistic cleanliness and sustainability initiative in Biligiri Rangan Hills.',
    category: 'Sustainability',
    status: 'Upcoming',
    image: cardImg1,
    registrationLink: '/contact',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d0',
    title: 'Mandira Uttana Yojana (Temple Rejuvenation Program)',
    date: 'Upcoming',
    location: 'Karnataka',
    description: 'Temple rejuvenation with preservation, awareness, and community participation.',
    category: 'Community',
    status: 'Upcoming',
    image: cardImg2,
    registrationLink: '/contact',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d1',
    title: 'Residential School (Integrated Education Model)',
    date: 'Upcoming',
    location: 'Mangaluru',
    description: 'Integrated education model nurturing clarity, compassion, and leadership.',
    category: 'Education',
    status: 'Upcoming',
    image: cardImg3,
    registrationLink: '/contact',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d2',
    title: 'Swacch Manas',
    date: 'Completed',
    location: 'Mangaluru',
    participants: 150,
    category: 'Community',
    status: 'Completed',
    image: swacchImg,
    description:
      'An after-school program blending civic awareness, cleanliness, life skills, soft skills, and career counseling for holistic child development. In Mangaluru in association with Ramakrishna Mission Swacch Mangaluru Abhiyan.',
    registrationLink: '/contact',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d3',
    title: 'Be & Make (Youth Workshop)',
    date: 'Completed',
    location: 'Mangalore University',
    participants: 120,
    category: 'Youth Leadership',
    status: 'Completed',
    image: beMakeImg,
    description:
      'Personality development, leadership, financial literacy, industry-based training, and nation-building spirit in association with Mangalore University Swami Vivekananda Study Centre.',
    registrationLink: '/contact',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d4',
    title: 'Sustainability Circles',
    date: 'Completed',
    location: 'Schools & Colleges',
    participants: 100,
    category: 'Sustainability',
    status: 'Completed',
    image: sustainabilityCirclesImg,
    description:
      'Interactive sessions on waste management, cleanliness, and green practices to build responsible citizens and environmental stewards.',
    registrationLink: '/contact',
    featured: false,
    isVisible: true,
  },
];

export function EventsPage() {
  const { t } = useLanguage();
  const pageBackgroundStyle = {
    backgroundImage: `url(${sectionBackground})`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  } as const;
  const transparentSectionClass = '!bg-transparent';

  const [events, setEvents] = useState<DisplayEvent[]>(INITIAL_EVENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<EventFilterType>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch live public events from database
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getPublicEvents()
      .then((serverEvents) => {
        if (!isMounted || !Array.isArray(serverEvents) || serverEvents.length === 0) return;

        setEvents((prevEvents) => {
          // Merge server events with existing metadata & fallbacks
          return serverEvents.map((srv) => {
            const fallback = prevEvents.find(
              (p) =>
                (p.id && p.id === srv._id) ||
                (p._id && p._id === srv._id) ||
                p.title.toLowerCase().trim() === srv.title.toLowerCase().trim(),
            );

            return {
              _id: srv._id,
              id: srv._id,
              title: srv.title,
              description: srv.description,
              date: srv.date,
              location: srv.location || fallback?.location || '',
              category: srv.category || fallback?.category || 'General',
              status: srv.status || fallback?.status || 'Upcoming',
              participants: srv.participants ?? fallback?.participants,
              imageUrl: srv.imageUrl,
              image: srv.imageUrl || fallback?.image || cardImg1,
              registrationLink: srv.registrationLink || fallback?.registrationLink || '/contact',
              brochureUrl: srv.brochureUrl || fallback?.brochureUrl,
              featured: Boolean(srv.featured),
              isVisible: srv.isVisible !== false,
              sortOrder: srv.sortOrder ?? fallback?.sortOrder ?? 0,
            };
          });
        });
      })
      .catch((err) => {
        console.warn('Events fetch using initial cache fallback:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter out any hidden events for public view
  const visibleEvents = useMemo(() => {
    return events.filter((e) => e.isVisible !== false);
  }, [events]);

  // Compute event counts for each segmented filter
  const filterCounts = useMemo(() => {
    return {
      all: visibleEvents.length,
      featured: visibleEvents.filter((e) => Boolean(e.featured)).length,
      coming: visibleEvents.filter(isComingEvent).length,
      past: visibleEvents.filter(isPastEvent).length,
    };
  }, [visibleEvents]);

  // Combined filtering: Filter tab + Search query
  const displayedEvents = useMemo(() => {
    return visibleEvents.filter((event) => {
      // 1. Filter match
      if (activeFilter === 'featured' && !event.featured) return false;
      if (activeFilter === 'coming' && !isComingEvent(event)) return false;
      if (activeFilter === 'past' && !isPastEvent(event)) return false;

      // 2. Search query match
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = event.title?.toLowerCase().includes(q);
        const matchDesc = event.description?.toLowerCase().includes(q);
        const matchLoc = event.location?.toLowerCase().includes(q);
        const matchCat = event.category?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchLoc || matchCat;
      }
      return true;
    });
  }, [visibleEvents, activeFilter, searchTerm]);

  // Split displayed events into Featured vs Regular for distinct layout
  const featuredInDisplay = useMemo(() => {
    if (activeFilter === 'featured') {
      return displayedEvents;
    }
    return displayedEvents.filter((e) => e.featured);
  }, [displayedEvents, activeFilter]);

  const regularInDisplay = useMemo(() => {
    if (activeFilter === 'featured') {
      return [];
    }
    return displayedEvents.filter((e) => !e.featured);
  }, [displayedEvents, activeFilter]);

  const participantTestimonials = [
    {
      name: 'Arun Kumar',
      event: 'Be & Make Workshop',
      textKey: 'events.testimonials.arun.text',
    },
    {
      name: 'Meera Shetty',
      event: 'Shatachandi Maha Yagna',
      textKey: 'events.testimonials.meera.text',
    },
  ];

  return (
    <div className="min-h-screen pt-20" style={pageBackgroundStyle}>
      {/* Hero Section */}
      <Section background="green" className={`${transparentSectionClass} py-20 md:py-28`}>
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6"
          >
            <Calendar className="w-10 h-10 text-[#50b94b]" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold mb-6 text-gray-900"
          >
            {t('events.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl text-gray-700 leading-relaxed"
          >
            {t('events.hero.desc')}
          </motion.p>
        </div>
      </Section>

      {/* Search & Event Filter Navigation Bars */}
      <Section background="white" className={`${transparentSectionClass} pt-2 pb-6`}>
        <div className="max-w-5xl mx-auto">
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto px-4 mb-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search events by title, category or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-10 py-3 rounded-full bg-white/95 backdrop-blur-md border border-gray-200 text-gray-800 shadow-sm focus:border-[#50b94b] focus:ring-2 focus:ring-[#50b94b]/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Segmented Filter Navigation Bar: [ All ] [ Featured ] [ Coming ] [ Past ] */}
          <div className="flex items-center justify-center mb-10 px-4">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-xs gap-1 sm:gap-2 overflow-x-auto max-w-full scrollbar-none">
              {[
                { id: 'all', label: 'All', count: filterCounts.all },
                { id: 'featured', label: 'Featured', count: filterCounts.featured },
                { id: 'coming', label: 'Coming', count: filterCounts.coming },
                { id: 'past', label: 'Past', count: filterCounts.past },
              ].map((tab) => {
                const isSelected = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id as EventFilterType)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#50b94b] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Listing Content */}
          {displayedEvents.length === 0 ? (
            <div className="text-center py-16 bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 max-w-2xl mx-auto px-6">
              <p className="text-lg font-semibold text-gray-800 mb-2">No events found</p>
              <p className="text-sm text-gray-500 mb-6">
                No events match your current filter or search criteria.
              </p>
              <Button
                variant="outline"
                className="border-[#50b94b] text-[#50b94b] hover:bg-green-50"
                onClick={() => {
                  setActiveFilter('all');
                  setSearchTerm('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Featured Cards Presentation */}
              {featuredInDisplay.length > 0 && (
                <div className="space-y-6">
                  {featuredInDisplay.map((event, idx) => (
                    <motion.div
                      key={event.id || event._id || idx}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: idx * 0.05 }}
                    >
                      <Card className="events-card overflow-hidden border-2 border-green-200 h-full bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="grid md:grid-cols-[250px_1fr] h-full">
                          <div className="w-[250px] h-[350px] mx-auto md:mx-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-[250px] h-[350px] object-cover"
                            />
                          </div>
                          <div className="p-6 md:p-8 flex flex-col justify-center">
                            <Badge className="bg-red-100 text-red-700 w-fit mb-4">
                              Featured Event
                            </Badge>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                              {event.title}
                            </h2>
                            <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                              {event.description}
                            </p>
                            <div className="space-y-3 mb-6">
                              <div className="flex items-center gap-3 text-gray-700">
                                <Calendar className="w-5 h-5 text-[#50b94b]" />
                                <span>{event.date}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-3 text-gray-700">
                                  <MapPin className="w-5 h-5 text-[#50b94b]" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                            </div>

                            {/* Public Read-Only Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                              <Link to={event.registrationLink || '/contact'}>
                                <Button size="lg" className="bg-[#50b94b] hover:bg-[#45a340] text-white">
                                  Register Now
                                  <ExternalLink className="ml-2 w-5 h-5" />
                                </Button>
                              </Link>
                              {event.brochureUrl && (
                                <a
                                  href={event.brochureUrl}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button
                                    variant="outline"
                                    size="lg"
                                    className="border-[#123c7c] text-[#123c7c] hover:bg-gray-50"
                                  >
                                    Download Invitation
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Regular Cards Grid Presentation */}
              {regularInDisplay.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularInDisplay.map((event, index) => (
                    <motion.div
                      key={event.id || event._id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.4 }}
                    >
                      <Card className="events-card overflow-hidden hover:shadow-xl transition-all group bg-white h-full flex flex-col">
                        <div className="relative h-48 overflow-hidden bg-gray-100">
                          <img
                            src={event.image}
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <Badge className="absolute top-4 right-4 bg-[#50b94b] text-white shadow-xs">
                            {event.category}
                          </Badge>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900 line-clamp-2">
                              {event.title}
                            </h3>
                            <p className="text-gray-600 mb-4 text-sm line-clamp-3 leading-relaxed">
                              {event.description}
                            </p>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4 text-[#50b94b]" />
                                <span>{event.date}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 text-[#50b94b]" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {Number.isFinite(event.participants) && Number(event.participants) > 0 && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Users className="w-4 h-4 text-[#50b94b]" />
                                  <span>{event.participants} Participants</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2">
                            <Link to={event.registrationLink || '/contact'}>
                              <Button
                                variant="outline"
                                className="w-full border-[#50b94b] text-[#50b94b] hover:bg-[#50b94b] hover:text-white"
                              >
                                {isPastEvent(event) ? 'Learn More' : 'Register Now'}
                                <ArrowRight className="ml-2 w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Impact Stats */}
      <Section
        eyebrow={t('events.impact.eyebrow')}
        title={t('events.impact.title')}
        centered
        background="white"
        className={transparentSectionClass}
      >
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="events-card p-6 text-center">
            <div className="text-4xl font-bold text-[#50b94b] mb-2">800+</div>
            <div className="text-gray-700 font-medium">{t('events.impact.metric.participants')}</div>
          </Card>
          <Card className="events-card p-6 text-center">
            <div className="text-4xl font-bold text-[#50b94b] mb-2">15+</div>
            <div className="text-gray-700 font-medium">{t('events.impact.metric.events')}</div>
          </Card>
          <Card className="events-card p-6 text-center">
            <div className="text-4xl font-bold text-[#50b94b] mb-2">5+</div>
            <div className="text-gray-700 font-medium">{t('events.impact.metric.partners')}</div>
          </Card>
        </div>
      </Section>

      {/* Participant Testimonials */}
      <Section
        eyebrow={t('events.testimonials.eyebrow')}
        title={t('events.testimonials.title')}
        centered
        background="white"
        className={transparentSectionClass}
      >
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {participantTestimonials.map((testimonial, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.event}</div>
                </div>
              </div>
              <p className="text-gray-600 italic">"{t(testimonial.textKey)}"</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section background="gray" className={transparentSectionClass}>
        <div className="text-center bg-gradient-to-br from-[#50b94b] to-[#45a340] rounded-3xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('events.participate')}</h2>
          <p className="text-lg mb-8 text-green-50 max-w-2xl mx-auto">
            {t('events.cta.desc')}
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-white text-[#50b94b] hover:bg-gray-100 px-8">
              {t('events.cta.button')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </Section>
    </div>
  );
}
