import { useState, useEffect } from 'react';
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
  Edit,
  Eye,
  EyeOff,
  Shield,
  Check,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import {
  getPublicEvents,
  updateEventDetails,
  toggleEventVisibility,
  type PublicEvent,
} from '../lib/api';
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

interface FeaturedEventCard {
  id?: string;
  title: string;
  date: string;
  location: string;
  description: string;
  image: string;
  registrationLink: string;
  brochureUrl?: string;
  isVisible: boolean;
  featured: boolean;
}

const DEFAULT_FEATURED_EVENTS: FeaturedEventCard[] = [
  {
    id: '6994247a4feb3be3fb2151cd',
    title: 'Shri Durga Japa Yagna Abhiyana - 2026',
    date: 'Ongoing Registration',
    location: 'Multiple Locations',
    description: 'Collective spiritual effort rooted in devotion and discipline.',
    image: durgaImg,
    registrationLink: '/contact',
    brochureUrl: durgaJapaPdf,
    isVisible: true,
    featured: true,
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
    isVisible: true,
    featured: true,
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

  // Admin Mode state (defaults to true so admin sees edit & visibility buttons immediately)
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('AT_EVENTS_ADMIN_MODE');
    if (stored !== null) return stored === 'true';
    return true;
  });

  // Featured Cards state initialized with local cache fallback
  const [featuredCards, setFeaturedCards] = useState<FeaturedEventCard[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('AT_FEATURED_CARDS_STATE');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            return parsed.map((item, idx) => ({
              ...DEFAULT_FEATURED_EVENTS[idx],
              ...item,
              image: item.image || DEFAULT_FEATURED_EVENTS[idx].image,
              brochureUrl: item.brochureUrl || DEFAULT_FEATURED_EVENTS[idx].brochureUrl,
            }));
          }
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_FEATURED_EVENTS;
  });

  // Modal edit state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    registrationLink: '',
    brochureUrl: '',
    image: '',
    isVisible: true,
  });

  // Sync featured cards with MongoDB backend
  useEffect(() => {
    let isMounted = true;
    getPublicEvents(true)
      .then((events) => {
        if (!isMounted || !Array.isArray(events) || events.length === 0) return;

        setFeaturedCards((prev) => {
          const updated = prev.map((card, idx) => {
            const match = events.find(
              (e) =>
                (card.id && e._id === card.id) ||
                (idx === 0 && e.title.includes('Durga Japa')) ||
                (idx === 1 && e.title.includes('Shatachandi')),
            );

            if (!match) return card;

            return {
              ...card,
              id: match._id,
              title: match.title || card.title,
              description: match.description || card.description,
              date: match.date || card.date,
              location: match.location || card.location,
              registrationLink: match.registrationLink || card.registrationLink,
              image: match.imageUrl || card.image,
              brochureUrl: match.brochureUrl || card.brochureUrl,
              isVisible: match.isVisible !== false,
            };
          });

          try {
            localStorage.setItem('AT_FEATURED_CARDS_STATE', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      })
      .catch(() => {
        // offline fallback is already handled by state
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenEdit = (card: FeaturedEventCard, index: number) => {
    setEditingCardIndex(index);
    setEditForm({
      title: card.title,
      description: card.description,
      date: card.date,
      location: card.location,
      registrationLink: card.registrationLink || '/contact',
      brochureUrl: card.brochureUrl || '',
      image: card.image || '',
      isVisible: card.isVisible,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (editingCardIndex === null) return;
    const currentCard = featuredCards[editingCardIndex];
    if (!currentCard) return;

    const updatedCard: FeaturedEventCard = {
      ...currentCard,
      title: editForm.title.trim() || currentCard.title,
      description: editForm.description.trim() || currentCard.description,
      date: editForm.date.trim() || currentCard.date,
      location: editForm.location.trim() || currentCard.location,
      registrationLink: editForm.registrationLink.trim() || currentCard.registrationLink,
      brochureUrl: editForm.brochureUrl.trim() || currentCard.brochureUrl,
      image: editForm.image.trim() || currentCard.image,
      isVisible: editForm.isVisible,
    };

    const nextCards = [...featuredCards];
    nextCards[editingCardIndex] = updatedCard;
    setFeaturedCards(nextCards);

    try {
      localStorage.setItem('AT_FEATURED_CARDS_STATE', JSON.stringify(nextCards));
    } catch {
      // ignore
    }

    if (currentCard.id) {
      try {
        const sessionRaw = localStorage.getItem('AT_ADMIN_SESSION');
        const token = sessionRaw ? JSON.parse(sessionRaw)?.token : undefined;
        await updateEventDetails(
          currentCard.id,
          {
            title: updatedCard.title,
            description: updatedCard.description,
            date: updatedCard.date,
            location: updatedCard.location,
            registrationLink: updatedCard.registrationLink,
            brochureUrl: updatedCard.brochureUrl,
            imageUrl: updatedCard.image,
            isVisible: updatedCard.isVisible,
            category: 'Spirituality',
          },
          token,
        );
      } catch (err) {
        console.warn('Server sync error (saved locally):', err);
      }
    }

    toast.success('Event card updated successfully!');
    setIsEditModalOpen(false);
    setEditingCardIndex(null);
  };

  const handleToggleVisibility = async (index: number) => {
    const currentCard = featuredCards[index];
    if (!currentCard) return;

    const nextVisibility = !currentCard.isVisible;
    const updatedCard: FeaturedEventCard = { ...currentCard, isVisible: nextVisibility };
    const nextCards = [...featuredCards];
    nextCards[index] = updatedCard;
    setFeaturedCards(nextCards);

    try {
      localStorage.setItem('AT_FEATURED_CARDS_STATE', JSON.stringify(nextCards));
    } catch {
      // ignore
    }

    if (currentCard.id) {
      try {
        const sessionRaw = localStorage.getItem('AT_ADMIN_SESSION');
        const token = sessionRaw ? JSON.parse(sessionRaw)?.token : undefined;
        await toggleEventVisibility(currentCard.id, nextVisibility, token);
      } catch (err) {
        console.warn('Server visibility toggle error (saved locally):', err);
      }
    }

    if (nextVisibility) {
      toast.success(`"${currentCard.title}" is now visible to public`);
    } else {
      toast.info(`"${currentCard.title}" has been hidden from public view`);
    }
  };

  const upcomingEvents = [
    {
      title: 'Swachha Biligiri (BR Hills Cleanliness Campaign)',
      date: 'Upcoming',
      location: 'BR Hills, Karnataka',
      description: 'Holistic cleanliness and sustainability initiative in Biligiri Rangan Hills.',
      image: cardImg1,
    },
    {
      title: 'Mandira Uttana Yojana (Temple Rejuvenation Program)',
      date: 'Upcoming',
      location: 'Karnataka',
      description: 'Temple rejuvenation with preservation, awareness, and community participation.',
      image: cardImg2,
    },
    {
      title: 'Residential School (Integrated Education Model)',
      date: 'Upcoming',
      location: 'Mangaluru',
      description: 'Integrated education model nurturing clarity, compassion, and leadership.',
      image: cardImg3,
    },
  ];

  const upcomingList = upcomingEvents;

  const pastEvents = [
    {
      title: 'Swacch Manas',
      date: 'Upcoming',
      location: 'Mangaluru',
      participants: 150,
      image: swacchImg,
      description:
        'An after-school program blending civic awareness, cleanliness, life skills, soft skills, and career counseling for holistic child development. In Mangaluru in association with Ramakrishna Mission Swacch Mangaluru Abhiyan.',
    },
    {
      title: 'Be & Make (Youth Workshop)',
      date: 'Upcoming',
      location: 'Mangalore University',
      participants: 120,
      image: beMakeImg,
      description:
        'Personality development, leadership, financial literacy, industry-based training, and nation-building spirit in association with Mangalore University Swami Vivekananda Study Centre.',
    },
    {
      title: 'Sustainability Circles',
      date: 'Upcoming',
      location: 'Schools & Colleges',
      participants: 100,
      image: sustainabilityCirclesImg,
      description:
        'Interactive sessions on waste management, cleanliness, and green practices to build responsible citizens and environmental stewards.',
    },
  ];

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

      {/* Featured Events */}
      <Section background="white" className={transparentSectionClass}>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Admin Controls Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-200/90 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  isAdminMode ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm font-semibold text-gray-900">
                Admin Events Controls
              </span>
              <span className="text-xs text-gray-500 hidden md:inline">
                {isAdminMode
                  ? '— Edit cards & toggle public visibility'
                  : '— Viewing in Public Visitor Preview mode'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isAdminMode ? 'default' : 'outline'}
                className={
                  isAdminMode
                    ? 'bg-[#50b94b] hover:bg-[#439e3f] text-white text-xs font-medium'
                    : 'border-gray-300 text-gray-700 text-xs font-medium'
                }
                onClick={() => {
                  const next = !isAdminMode;
                  setIsAdminMode(next);
                  localStorage.setItem('AT_EVENTS_ADMIN_MODE', String(next));
                }}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                {isAdminMode ? 'Admin Controls Active' : 'Enable Admin Controls'}
              </Button>
            </div>
          </div>

          {/* Featured Event Cards */}
          {featuredCards
            .filter((card) => isAdminMode || card.isVisible)
            .map((event, idx) => {
              const originalIndex = featuredCards.findIndex((c) => c.title === event.title);
              const cardIndex = originalIndex !== -1 ? originalIndex : idx;

              return (
                <Card
                  key={cardIndex}
                  className={`events-card overflow-hidden border-2 transition-all ${
                    !event.isVisible
                      ? 'border-amber-300 bg-amber-50/20 opacity-90'
                      : 'border-green-200 bg-white'
                  } h-full`}
                >
                  <div className="grid md:grid-cols-[250px_1fr] h-full">
                    <div className="w-[250px] h-[350px] mx-auto md:mx-0 relative overflow-hidden bg-gray-100 flex items-center justify-center">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-[250px] h-[350px] object-cover"
                      />
                      {!event.isVisible && (
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-2xs flex items-center justify-center">
                          <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                            <EyeOff className="w-3.5 h-3.5" /> Hidden
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6 md:p-8 flex flex-col justify-center">
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <Badge className="bg-red-100 text-red-700 w-fit">Featured Event</Badge>
                        {!event.isVisible && (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Hidden from Public
                          </Badge>
                        )}
                        {isAdminMode && event.isVisible && (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 text-[11px]">
                            <Eye className="w-3 h-3" /> Visible to Public
                          </Badge>
                        )}
                      </div>

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

                      {/* Primary Visitor Action Buttons */}
                      <div className="flex flex-wrap gap-3">
                        <Link to={event.registrationLink}>
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

                      {/* Admin Buttons: Edit and Make Visible / Hide */}
                      {isAdminMode && (
                        <div className="flex flex-wrap items-center gap-2.5 pt-4 mt-5 border-t border-gray-100">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mr-1 flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-[#50b94b]" /> Admin:
                          </span>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold shadow-2xs"
                            onClick={() => handleOpenEdit(event, cardIndex)}
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={
                              event.isVisible
                                ? 'border-amber-600 text-amber-700 hover:bg-amber-50 font-semibold shadow-2xs'
                                : 'border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold shadow-2xs'
                            }
                            onClick={() => handleToggleVisibility(cardIndex)}
                          >
                            {event.isVisible ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Make Visible
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

          {/* Empty state when both cards are hidden in visitor preview */}
          {!isAdminMode && featuredCards.every((c) => !c.isVisible) && (
            <div className="p-8 text-center text-gray-500 rounded-2xl bg-gray-50/60 border border-gray-100">
              <p className="text-sm font-medium">No featured events currently active.</p>
            </div>
          )}
        </div>
      </Section>

      {/* Upcoming Events */}
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
              key={index}
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
                    {t(event.categoryKey)}
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
                  <Button variant="outline" className="w-full border-[#50b94b] text-[#50b94b] hover:bg-green-50">
                    {t('common.learnMore')}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Past Events */}
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
              key={index}
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

      {/* Impact Through Events */}
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

      {/* Edit Featured Card Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Edit className="w-5 h-5 text-[#50b94b]" />
              Edit Featured Event Card
            </DialogTitle>
            <DialogDescription>
              Update event details, links, or toggle public visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="card-title" className="text-sm font-semibold">
                Event Title
              </Label>
              <Input
                id="card-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1"
                placeholder="Event title"
              />
            </div>

            <div>
              <Label htmlFor="card-description" className="text-sm font-semibold">
                Description / Subtitle
              </Label>
              <Textarea
                id="card-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1 min-h-[80px]"
                placeholder="Brief description"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card-date" className="text-sm font-semibold">
                  Date / Timeline
                </Label>
                <Input
                  id="card-date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="mt-1"
                  placeholder="e.g. Ongoing Registration"
                />
              </div>
              <div>
                <Label htmlFor="card-location" className="text-sm font-semibold">
                  Location
                </Label>
                <Input
                  id="card-location"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="mt-1"
                  placeholder="e.g. Multiple Locations"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card-reg" className="text-sm font-semibold">
                  Registration Link
                </Label>
                <Input
                  id="card-reg"
                  value={editForm.registrationLink}
                  onChange={(e) => setEditForm({ ...editForm, registrationLink: e.target.value })}
                  className="mt-1"
                  placeholder="/contact or https://..."
                />
              </div>
              <div>
                <Label htmlFor="card-brochure" className="text-sm font-semibold">
                  Invitation PDF / URL
                </Label>
                <Input
                  id="card-brochure"
                  value={editForm.brochureUrl}
                  onChange={(e) => setEditForm({ ...editForm, brochureUrl: e.target.value })}
                  className="mt-1"
                  placeholder="/assets/... or https://..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="card-image" className="text-sm font-semibold">
                Image URL (Optional)
              </Label>
              <Input
                id="card-image"
                value={editForm.image}
                onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                className="mt-1"
                placeholder="Image path or URL"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-900">Card Visibility</p>
                <p className="text-xs text-gray-500">
                  {editForm.isVisible
                    ? 'Visible to all public visitors'
                    : 'Hidden from public visitors'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={
                  editForm.isVisible
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 font-medium'
                    : 'border-amber-600 text-amber-700 bg-amber-50 font-medium'
                }
                onClick={() => setEditForm({ ...editForm, isVisible: !editForm.isVisible })}
              >
                {editForm.isVisible ? (
                  <>
                    <Eye className="w-4 h-4 mr-1.5" /> Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-1.5" /> Hidden
                  </>
                )}
              </Button>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingCardIndex(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#50b94b] hover:bg-[#439e3f] text-white"
              onClick={handleSaveEdit}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
