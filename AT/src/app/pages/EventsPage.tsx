import { useState, useEffect, useMemo } from 'react';
import { Section } from '../components/Section';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { getPublicEvents, normalizeMediaUrl } from '../lib/api';
import {
  isPastEvent,
  isComingEvent,
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

interface EventData {
  _id?: string;
  id?: string;
  title: string;
  date: string;
  location?: string;
  description: string;
  category?: string;
  categoryKey?: string;
  status?: 'Upcoming' | 'Completed';
  participants?: number;
  imageUrl?: string;
  image: string;
  registrationLink?: string;
  brochureUrl?: string;
  featured?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
}

const DEFAULT_UPCOMING_EVENTS: EventData[] = [
  {
    id: '6994247a4feb3be3fb2151cd',
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
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151ce',
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
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151cf',
    title: 'Swachha Biligiri (BR Hills Cleanliness Campaign)',
    date: 'Upcoming',
    location: 'BR Hills, Karnataka',
    description: 'Holistic cleanliness and sustainability initiative in Biligiri Rangan Hills.',
    image: cardImg1,
    registrationLink: '/contact',
    categoryKey: 'events.categories.sustainability',
    category: 'Sustainability',
    status: 'Upcoming',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d0',
    title: 'Mandira Uttana Yojana (Temple Rejuvenation Program)',
    date: 'Upcoming',
    location: 'Karnataka',
    description: 'Temple rejuvenation with preservation, awareness, and community participation.',
    image: cardImg2,
    registrationLink: '/contact',
    categoryKey: 'events.categories.community',
    category: 'Community',
    status: 'Upcoming',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d1',
    title: 'Residential School (Integrated Education Model)',
    date: 'Upcoming',
    location: 'Mangaluru',
    description: 'Integrated education model nurturing clarity, compassion, and leadership.',
    image: cardImg3,
    registrationLink: '/contact',
    categoryKey: 'events.categories.education',
    category: 'Education',
    status: 'Upcoming',
    featured: false,
    isVisible: true,
  },
];

const DEFAULT_PAST_EVENTS: EventData[] = [
  {
    id: '6994247a4feb3be3fb2151d2',
    title: 'Swacch Manas',
    date: 'Upcoming',
    location: 'Mangaluru',
    participants: 150,
    image: swacchImg,
    description:
      'An after-school program blending civic awareness, cleanliness, life skills, soft skills, and career counseling for holistic child development. In Mangaluru in association with Ramakrishna Mission Swacch Mangaluru Abhiyan.',
    registrationLink: '/contact',
    category: 'Community',
    status: 'Completed',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d3',
    title: 'Be & Make (Youth Workshop)',
    date: 'Upcoming',
    location: 'Mangalore University',
    participants: 120,
    image: beMakeImg,
    description:
      'Personality development, leadership, financial literacy, industry-based training, and nation-building spirit in association with Mangalore University Swami Vivekananda Study Centre.',
    registrationLink: '/contact',
    category: 'Youth Leadership',
    status: 'Completed',
    featured: false,
    isVisible: true,
  },
  {
    id: '6994247a4feb3be3fb2151d4',
    title: 'Sustainability Circles',
    date: 'Upcoming',
    location: 'Schools & Colleges',
    participants: 100,
    image: sustainabilityCirclesImg,
    description:
      'Interactive sessions on waste management, cleanliness, and green practices to build responsible citizens and environmental stewards.',
    registrationLink: '/contact',
    category: 'Sustainability',
    status: 'Completed',
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

  const [allEvents, setAllEvents] = useState<EventData[]>([
    ...DEFAULT_UPCOMING_EVENTS,
    ...DEFAULT_PAST_EVENTS,
  ]);

  // Fetch live public events from database
  useEffect(() => {
    let isMounted = true;
    getPublicEvents()
      .then((serverEvents) => {
        if (!isMounted || !Array.isArray(serverEvents) || serverEvents.length === 0) return;

        setAllEvents((prevEvents) => {
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
              categoryKey: fallback?.categoryKey,
              status: srv.status || fallback?.status || 'Upcoming',
              participants: srv.participants ?? fallback?.participants,
              imageUrl: srv.imageUrl,
              image: normalizeMediaUrl(srv.imageUrl) || fallback?.image || cardImg1,
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
        console.warn('Events fetch using initial fallback cache:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter only publicly visible events
  const visibleEvents = useMemo(() => {
    return allEvents.filter((e) => e.isVisible !== false);
  }, [allEvents]);

  // Group events into their canonical original UI sections
  const featuredEvents = useMemo(() => {
    return visibleEvents.filter((e) => Boolean(e.featured));
  }, [visibleEvents]);

  const upcomingList = useMemo(() => {
    return visibleEvents.filter((e) => !e.featured && isComingEvent(e));
  }, [visibleEvents]);

  const pastEvents = useMemo(() => {
    return visibleEvents.filter((e) => !e.featured && isPastEvent(e));
  }, [visibleEvents]);

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
      <Section background="green" className={`${transparentSectionClass} py-24 md:py-32`}>
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
            className="text-4xl md:text-6xl font-bold mb-6"
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

      {/* Featured Events Section (Original Layout & Alignment) */}
      {featuredEvents.length > 0 && (
        <Section background="white" className={transparentSectionClass}>
          <div className="space-y-6 max-w-5xl mx-auto">
            {featuredEvents.map((event, idx) => (
              <Card key={event.id || event._id || idx} className="events-card overflow-hidden border-2 border-green-200 h-full">
                <div className="grid md:grid-cols-[250px_1fr] h-full">
                  <div className="w-[250px] h-[350px] mx-auto md:mx-0">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-[250px] h-[350px] object-cover"
                    />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <Badge className="bg-red-100 text-red-700 w-fit mb-4">Featured Event</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h2>
                    <p className="text-gray-600 mb-6 text-lg">{event.description}</p>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-gray-700">
                        <Calendar className="w-5 h-5 text-[#50b94b]" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-700">
                        <MapPin className="w-5 h-5 text-[#50b94b]" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link to={event.registrationLink || '/contact'}>
                        <Button size="lg" className="bg-[#50b94b] hover:bg-[#45a340]">
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
                          <Button variant="outline" size="lg" className="border-[#123c7c] text-[#123c7c] hover:bg-gray-50">
                            Download Invitation
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Upcoming Events Section (Original Layout & Alignment) */}
      {upcomingList.length > 0 && (
        <Section
          eyebrow={t('events.upcoming.eyebrow')}
          title={t('events.upcoming')}
          centered
          background="gray"
          className={transparentSectionClass}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingList.map((event, index) => (
              <motion.div
                key={event.id || event._id || index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="events-card overflow-hidden hover:shadow-xl transition-all group">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <Badge className="absolute top-4 right-4 bg-[#50b94b] text-white">
                      {event.categoryKey ? t(event.categoryKey) : event.category || 'General'}
                    </Badge>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3">{event.title}</h3>
                    <p className="text-gray-600 mb-4 text-sm">{event.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-[#50b94b]" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-[#50b94b]" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                    <Link to={event.registrationLink || '/contact'}>
                      <Button variant="outline" className="w-full border-[#50b94b] text-[#50b94b] hover:bg-green-50">
                        {t('common.learnMore')}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* Past Events Section (Original Layout & Alignment) */}
      {pastEvents.length > 0 && (
        <Section
          eyebrow={t('events.past.eyebrow')}
          title={t('events.past')}
          centered
          background="white"
          className={transparentSectionClass}
        >
          <div className="grid md:grid-cols-3 gap-6">
            {pastEvents.map((event, index) => (
              <motion.div
                key={event.id || event._id || index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="events-card overflow-hidden hover:shadow-lg transition-all h-full flex flex-col">
                  <div className="relative h-44 md:h-48">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold mb-2 text-lg">{event.title}</h3>
                    <p className="text-gray-700 text-base leading-relaxed mb-4 flex-1">{event.description}</p>
                    <div className="flex items-center justify-between text-base text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{event.participants} {t('events.participants')}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <Link to="/gallery">
              <Button variant="outline" className="px-6 border-[#123c7c] text-[#123c7c] hover:bg-gray-50">
                View Gallery
              </Button>
            </Link>
          </div>
        </Section>
      )}

      {/* Impact Through Events Section */}
      <Section
        eyebrow={t('events.impact.eyebrow')}
        title={t('events.impact.title')}
        centered
        background="green"
        className={transparentSectionClass}
      >
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
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

      {/* Participant Testimonials Section */}
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

      {/* CTA Section */}
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
