import { type FormEvent, useMemo, useState, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Search,
  Eye,
  EyeOff,
  Star,
  Upload,
  Image as ImageIcon,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { EventItem } from '../../lib/types';
import { normalizeMediaUrl } from '../../lib/api';
import {
  isPastEvent,
  isComingEvent,
  type EventFilterType,
} from '../../lib/eventClassification';

type Event = EventItem;

interface EventsManagementPageProps {
  events: Event[];
  onAddEvent: (event: Omit<Event, 'id'>, imageFile?: File | null) => Promise<boolean | void> | void;
  onEditEvent: (id: string, event: Omit<Event, 'id'>, imageFile?: File | null) => Promise<boolean | void> | void;
  onDeleteEvent: (id: string) => void;
}

export function EventsManagementPage({
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
}: EventsManagementPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<EventFilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    category: '',
    status: 'Upcoming' as 'Upcoming' | 'Completed',
    participants: '',
    imageUrl: '',
    registrationLink: '/contact',
    brochureUrl: '',
    featured: false,
    isVisible: true,
    sortOrder: '0',
  });

  const handleOpenModal = (event?: Event) => {
    setImageError('');
    setSelectedImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (event) {
      setEditingEvent(event);
      setImagePreviewUrl(event.imageUrl ? normalizeMediaUrl(event.imageUrl) : '');
      setFormData({
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location || '',
        category: event.category,
        status: event.status,
        participants:
          Number.isFinite(Number(event.participants)) && Number(event.participants) >= 0
            ? String(event.participants)
            : '',
        imageUrl: event.imageUrl || '',
        registrationLink: event.registrationLink || '/contact',
        brochureUrl: event.brochureUrl || '',
        featured: Boolean(event.featured),
        isVisible: event.isVisible !== false,
        sortOrder: Number.isFinite(Number(event.sortOrder)) ? String(event.sortOrder) : '0',
      });
    } else {
      setEditingEvent(null);
      setImagePreviewUrl('');
      setFormData({
        title: '',
        description: '',
        date: '',
        location: '',
        category: '',
        status: 'Upcoming',
        participants: '',
        imageUrl: '',
        registrationLink: '/contact',
        brochureUrl: '',
        featured: false,
        isVisible: true,
        sortOrder: '0',
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME types and extensions: JPG, JPEG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(extension)) {
      setImageError('Unsupported format. Please select a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    // Validate file size: maximum 5 MB (5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setImageError(`File size (${sizeMb} MB) exceeds maximum allowed limit of 5 MB.`);
      return;
    }

    setImageError('');
    setSelectedImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    setImageError('');
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const participantsValue = Number(formData.participants);
      const sortOrderValue = Number(formData.sortOrder);
      const payload: Omit<Event, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date.trim(),
        location: formData.location.trim(),
        category: formData.category.trim(),
        status: formData.status,
        participants:
          formData.participants.trim() === '' || !Number.isFinite(participantsValue)
            ? undefined
            : Math.max(0, participantsValue),
        // If an existing image was not removed and no new file was chosen, keep existing imageUrl
        imageUrl: selectedImageFile ? '' : formData.imageUrl.trim(),
        registrationLink: formData.registrationLink.trim() || '/contact',
        brochureUrl: formData.brochureUrl.trim(),
        featured: formData.featured,
        isVisible: formData.isVisible,
        sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : 0,
      };

      if (editingEvent) {
        await onEditEvent(editingEvent.id, payload, selectedImageFile);
      } else {
        await onAddEvent(payload, selectedImageFile);
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterCounts = useMemo(() => {
    return {
      all: events.length,
      featured: events.filter((e) => Boolean(e.featured)).length,
      coming: events.filter(isComingEvent).length,
      past: events.filter(isPastEvent).length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // 1. Segmented Filter logic
      if (activeFilter === 'featured' && !event.featured) return false;
      if (activeFilter === 'coming' && !isComingEvent(event)) return false;
      if (activeFilter === 'past' && !isPastEvent(event)) return false;

      // 2. Search query logic
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = event.title?.toLowerCase().includes(q);
        const matchCat = event.category?.toLowerCase().includes(q);
        const matchStatus = event.status?.toLowerCase().includes(q);
        const matchLoc = event.location?.toLowerCase().includes(q);
        return matchTitle || matchCat || matchStatus || matchLoc;
      }
      return true;
    });
  }, [events, searchTerm, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by title, category or status..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add New Event
        </Button>
      </div>

      {/* Segmented Filter Navigation Bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
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
              onClick={() => {
                setActiveFilter(tab.id as EventFilterType);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#4CAF50] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Image</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Event Title</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Event Date</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEvents.map((event) => (
              <tr
                key={event.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                    {event.imageUrl ? (
                      <img src={normalizeMediaUrl(event.imageUrl)} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <Calendar className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  <div className="flex items-center gap-2">
                    <span>{event.title}</span>
                    {event.featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                        <Star className="w-3 h-3 fill-red-500 text-red-500" /> Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{event.date}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{event.category}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'Upcoming'
                        ? 'bg-[#4CAF50]/10 text-[#4CAF50]'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {event.status}
                  </span>
                  <span
                    className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      event.isVisible !== false
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {event.isVisible !== false ? 'Visible' : 'Hidden'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      title={event.isVisible !== false ? 'Hide Event' : 'Make Visible'}
                      onClick={() =>
                        onEditEvent(event.id, {
                          title: event.title,
                          description: event.description,
                          date: event.date,
                          category: event.category,
                          status: event.status,
                          imageUrl: event.imageUrl,
                          location: event.location,
                          participants: event.participants,
                          registrationLink: event.registrationLink,
                          brochureUrl: event.brochureUrl,
                          featured: event.featured,
                          sortOrder: event.sortOrder,
                          isVisible: !(event.isVisible !== false),
                        })
                      }
                      className={
                        event.isVisible !== false
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }
                    >
                      {event.isVisible !== false ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenModal(event)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredEvents.length === 0 ? 0 : startIndex + 1} to{' '}
          {Math.min(startIndex + itemsPerPage, filteredEvents.length)} of {filteredEvents.length} results
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="rounded-xl"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="rounded-xl"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-gray-100 shrink-0 bg-white">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Scrollable form body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <Label htmlFor="title" className="text-sm font-semibold text-gray-700">Event Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 rounded-xl"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Event Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 rounded-xl min-h-[72px]"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="text-sm font-semibold text-gray-700">Event Date</Label>
                  <Input
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 rounded-xl"
                    placeholder="e.g. Ongoing Registration / January 2026"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-sm font-semibold text-gray-700">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 rounded-xl"
                    placeholder="e.g. Multiple Locations"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 rounded-xl"
                    placeholder="e.g. Education, Community, Spirituality"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status" className="text-sm font-semibold text-gray-700">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'Upcoming' | 'Completed') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Event Image Upload */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">Event Image</Label>

                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-3 transition-all hover:border-[#4CAF50]/50">
                  {imagePreviewUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-black/5 flex items-center justify-center">
                        <img
                          src={imagePreviewUrl}
                          alt="Event preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="flex-1 w-full space-y-2">
                        <div className="text-xs text-gray-600 truncate">
                          {selectedImageFile ? (
                            <span className="font-semibold text-gray-800">
                              {selectedImageFile.name} ({(selectedImageFile.size / 1024).toFixed(0)} KB)
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">Currently saved image</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-semibold hover:border-[#4CAF50] hover:text-[#4CAF50] rounded-lg h-8"
                          >
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            {selectedImageFile ? 'Change Image' : 'Replace Image'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveImage}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg h-8"
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-50 text-[#4CAF50] flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700">No image chosen</p>
                          <p className="text-[11px] text-gray-400">JPG, PNG, WEBP up to 5 MB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-[#4CAF50] text-[#4CAF50] hover:bg-green-50 font-semibold rounded-lg text-xs h-8"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Choose Image
                      </Button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {imageError ? (
                  <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {imageError}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    Supported: JPG, PNG, WEBP (Max 5 MB)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brochureUrl" className="text-sm font-semibold text-gray-700">Invitation/Brochure PDF (Optional)</Label>
                  <Input
                    id="brochureUrl"
                    value={formData.brochureUrl}
                    onChange={(e) => setFormData({ ...formData, brochureUrl: e.target.value })}
                    className="mt-1 rounded-xl"
                    placeholder="/assets/Shatachandi.pdf"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationLink" className="text-sm font-semibold text-gray-700">Registration Link</Label>
                  <Input
                    id="registrationLink"
                    value={formData.registrationLink}
                    onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                    className="mt-1 rounded-xl"
                    placeholder="/contact or https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sortOrder" className="text-sm font-semibold text-gray-700">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min={0}
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="participants" className="text-sm font-semibold text-gray-700">Participants (Optional)</Label>
                  <Input
                    id="participants"
                    type="number"
                    min={0}
                    value={formData.participants}
                    onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    id="featured"
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#4CAF50] focus:ring-[#4CAF50]"
                  />
                  <Label htmlFor="featured" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                    Show as Featured Event on Home & Events page
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isVisible"
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#4CAF50] focus:ring-[#4CAF50]"
                  />
                  <Label htmlFor="isVisible" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer">
                    Visible to Public (uncheck to hide from public site)
                  </Label>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="px-6 py-3.5 bg-gray-50/90 backdrop-blur-sm border-t border-gray-100 flex gap-3 shrink-0">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#4CAF50] hover:bg-[#45a049] text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving Event...
                  </>
                ) : editingEvent ? (
                  'Update Event'
                ) : (
                  'Add Event'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-xl py-2.5 font-semibold"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
