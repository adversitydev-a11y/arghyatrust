import { useMemo, useRef, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Globe,
  ImageIcon,
  Loader2,
  Pencil,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import type { BlogSubmission } from '../../lib/types';
import { toast } from 'sonner';

interface BlogSubmissionsPageProps {
  blogs: BlogSubmission[];
  onUpdateBlog: (
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
  ) => Promise<boolean | void> | void;
  onDeleteBlog: (id: string) => Promise<boolean | void> | void;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

function getStatusBadge(status: BlogSubmission['status']) {
  switch (status) {
    case 'approved':
      return {
        label: 'Approved',
        className: 'bg-green-100 text-green-800 border-green-200',
        dot: 'bg-green-500',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-red-100 text-red-800 border-red-200',
        dot: 'bg-red-500',
      };
    default:
      return {
        label: 'Pending',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
  }
}

const COMMON_CATEGORIES = [
  'Stories',
  'News',
  'Spiritual',
  'Community',
  'Social Initiatives',
  'Education',
  'Environment',
  'Healthcare',
];

export function BlogSubmissionsPage({
  blogs,
  onUpdateBlog,
  onDeleteBlog,
}: BlogSubmissionsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modals state
  const [viewingBlog, setViewingBlog] = useState<BlogSubmission | null>(null);
  const [editingBlog, setEditingBlog] = useState<BlogSubmission | null>(null);
  const [deletingBlog, setDeletingBlog] = useState<BlogSubmission | null>(null);
  const [rejectingBlog, setRejectingBlog] = useState<BlogSubmission | null>(null);

  // Edit form state
  const [form, setForm] = useState({
    title: '',
    category: 'Stories',
    authorName: '',
    authorEmail: '',
    excerpt: '',
    content: '',
    tags: '',
    seoTitle: '',
    seoDescription: '',
    publishedAt: '',
    reviewNotes: '',
    status: 'pending' as BlogSubmission['status'],
  });

  // Rejection note state
  const [rejectionReason, setRejectionReason] = useState('');

  // Device image selection state
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clean up object URLs on unmount or change
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Counts for tabs
  const counts = useMemo(() => {
    const all = blogs.length;
    const pending = blogs.filter((b) => b.status === 'pending').length;
    const approved = blogs.filter((b) => b.status === 'approved').length;
    const rejected = blogs.filter((b) => b.status === 'rejected').length;
    return { all, pending, approved, rejected };
  }, [blogs]);

  // Filtered list
  const filteredBlogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return blogs.filter((blog) => {
      const matchesStatus = statusFilter === 'all' || blog.status === statusFilter;
      const matchesSearch =
        !term ||
        blog.title.toLowerCase().includes(term) ||
        blog.authorName.toLowerCase().includes(term) ||
        blog.authorEmail.toLowerCase().includes(term) ||
        blog.category.toLowerCase().includes(term) ||
        blog.tags.some((t) => t.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [blogs, searchTerm, statusFilter]);

  // Handle open edit modal
  const handleOpenEdit = (blog: BlogSubmission) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title || '',
      category: blog.category || 'Stories',
      authorName: blog.authorName || '',
      authorEmail: blog.authorEmail || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      seoTitle: blog.seoTitle || '',
      seoDescription: blog.seoDescription || '',
      publishedAt: blog.publishedAt ? String(blog.publishedAt).slice(0, 10) : blog.date || '',
      reviewNotes: blog.reviewNotes || '',
      status: blog.status,
    });
    setSelectedImageFile(null);
    setImagePreviewUrl(blog.featuredImageUrl || '');
  };

  // Handle image file change from device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, JPEG, PNG, and WEBP formats are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10 MB');
      return;
    }

    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit edit form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlog) return;

    if (!form.title.trim()) {
      toast.error('Blog title cannot be empty');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Blog content cannot be empty');
      return;
    }
    if (!form.authorName.trim()) {
      toast.error('Author name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onUpdateBlog(
        editingBlog.id,
        {
          title: form.title.trim(),
          category: form.category.trim() || 'Stories',
          authorName: form.authorName.trim(),
          authorEmail: form.authorEmail.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
          tags: form.tags,
          seoTitle: form.seoTitle.trim(),
          seoDescription: form.seoDescription.trim(),
          publishedAt: form.publishedAt || undefined,
          reviewNotes: form.reviewNotes.trim(),
          status: form.status,
          ...(selectedImageFile ? {} : { featuredImageUrl: imagePreviewUrl }),
        },
        selectedImageFile,
      );

      if (res !== false) {
        setEditingBlog(null);
        setSelectedImageFile(null);
        setImagePreviewUrl('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Approve action
  const handleApprove = async (blog: BlogSubmission) => {
    try {
      setIsSubmitting(true);
      await onUpdateBlog(blog.id, {
        status: 'approved',
      });
      if (viewingBlog && viewingBlog.id === blog.id) {
        setViewingBlog({ ...viewingBlog, status: 'approved' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Reject action
  const handleConfirmReject = async () => {
    if (!rejectingBlog) return;
    try {
      setIsSubmitting(true);
      await onUpdateBlog(rejectingBlog.id, {
        status: 'rejected',
        reviewNotes: rejectionReason.trim() || rejectingBlog.reviewNotes || 'Rejected by administrator',
      });
      if (viewingBlog && viewingBlog.id === rejectingBlog.id) {
        setViewingBlog({ ...viewingBlog, status: 'rejected' });
      }
      setRejectingBlog(null);
      setRejectionReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete action
  const handleConfirmDelete = async () => {
    if (!deletingBlog) return;
    try {
      setIsDeleting(true);
      await onDeleteBlog(deletingBlog.id);
      if (viewingBlog && viewingBlog.id === deletingBlog.id) {
        setViewingBlog(null);
      }
      setDeletingBlog(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, author, email, tags..."
            className="h-11 rounded-xl border-gray-200 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-[#4CAF50] focus:ring-[#4CAF50]"
          />
        </div>

        {/* Status Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
          {(
            [
              { key: 'all', label: 'All', count: counts.all },
              { key: 'pending', label: 'Pending', count: counts.pending },
              { key: 'approved', label: 'Approved', count: counts.approved },
              { key: 'rejected', label: 'Rejected', count: counts.rejected },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#4CAF50] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-6 py-4">Blog Title & Category</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Submitted Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-500">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-3">
                      <FileText className="h-7 w-7" />
                    </div>
                    <p className="text-base font-semibold text-gray-800">No blogs found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {searchTerm
                        ? 'Try adjusting your search criteria'
                        : `No ${statusFilter !== 'all' ? statusFilter : ''} blog submissions at this time`}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBlogs.map((blog) => {
                  const badge = getStatusBadge(blog.status);
                  return (
                    <tr
                      key={blog.id}
                      className="group transition-colors hover:bg-gray-50/70"
                    >
                      {/* Title & Thumbnail */}
                      <td className="px-6 py-4 max-w-sm">
                        <div className="flex items-center gap-3.5">
                          {blog.featuredImageUrl ? (
                            <img
                              src={blog.featuredImageUrl}
                              alt={blog.title}
                              className="h-12 w-16 shrink-0 rounded-lg object-cover border border-gray-200 bg-gray-100"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-[#388E3C] transition-colors" title={blog.title}>
                              {blog.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {blog.category || 'Stories'}
                              </span>
                              {blog.readTime && (
                                <span className="text-[11px] text-gray-400">
                                  &bull; {blog.readTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="font-medium text-gray-800">{blog.authorName}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">
                            {blog.authorEmail}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span>{blog.date || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingBlog(blog)}
                            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
                            title="View Blog Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Edit */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(blog)}
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Blog"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* Approve (if pending or rejected) */}
                          {blog.status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(blog)}
                              disabled={isSubmitting}
                              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Approve & Publish Blog"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Reject (if pending) */}
                          {blog.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingBlog(blog);
                                setRejectionReason(blog.reviewNotes || '');
                              }}
                              disabled={isSubmitting}
                              className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="Reject Blog"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Delete */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingBlog(blog)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Blog"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. VIEW BLOG DETAILS MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!viewingBlog} onOpenChange={() => setViewingBlog(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-2xl p-6 sm:p-8">
          {viewingBlog && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      getStatusBadge(viewingBlog.status).className
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        getStatusBadge(viewingBlog.status).dot
                      }`}
                    />
                    {getStatusBadge(viewingBlog.status).label}
                  </span>
                  <span className="rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {viewingBlog.category || 'Stories'}
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                  {viewingBlog.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {viewingBlog.authorName} ({viewingBlog.authorEmail})
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {viewingBlog.date}
                  </span>
                  {viewingBlog.readTime && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {viewingBlog.readTime}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Featured Image */}
              {viewingBlog.featuredImageUrl && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <img
                    src={viewingBlog.featuredImageUrl}
                    alt={viewingBlog.title}
                    className="max-h-72 w-full object-cover"
                  />
                </div>
              )}

              {/* Excerpt */}
              {viewingBlog.excerpt && (
                <div className="rounded-xl border-l-4 border-[#4CAF50] bg-green-50/60 p-4 text-sm font-medium italic text-gray-800">
                  {viewingBlog.excerpt}
                </div>
              )}

              {/* Full Content */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Full Content
                </h4>
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {viewingBlog.content}
                </div>
              </div>

              {/* Tags */}
              {viewingBlog.tags && viewingBlog.tags.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingBlog.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-700 font-medium"
                      >
                        <Tag className="h-3 w-3 text-gray-400" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO & Meta Info */}
              {(viewingBlog.seoTitle || viewingBlog.seoDescription || viewingBlog.slug) && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-xs">
                  <h4 className="font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-gray-500" />
                    SEO & URL Info
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="font-semibold text-gray-600">URL Slug:</span>
                      <p className="text-gray-800 font-mono mt-0.5">/blogs/{viewingBlog.slug}</p>
                    </div>
                    {viewingBlog.seoTitle && (
                      <div>
                        <span className="font-semibold text-gray-600">SEO Title:</span>
                        <p className="text-gray-800 mt-0.5">{viewingBlog.seoTitle}</p>
                      </div>
                    )}
                    {viewingBlog.seoDescription && (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-gray-600">SEO Description:</span>
                        <p className="text-gray-800 mt-0.5">{viewingBlog.seoDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Notes */}
              {viewingBlog.reviewNotes && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs">
                  <h4 className="font-bold uppercase tracking-wider text-amber-900 mb-1">
                    Internal Notes / Rejection Reason
                  </h4>
                  <p className="text-amber-800 whitespace-pre-wrap">{viewingBlog.reviewNotes}</p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setViewingBlog(null)}
                  className="rounded-xl"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      const b = viewingBlog;
                      setViewingBlog(null);
                      handleOpenEdit(b);
                    }}
                    className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil className="mr-1.5 h-4 w-4" />
                    Edit Blog
                  </Button>

                  {viewingBlog.status !== 'approved' && (
                    <Button
                      onClick={() => handleApprove(viewingBlog)}
                      disabled={isSubmitting}
                      className="rounded-xl bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Approve & Publish
                    </Button>
                  )}

                  {viewingBlog.status === 'pending' && (
                    <Button
                      onClick={() => {
                        setRejectingBlog(viewingBlog);
                        setRejectionReason(viewingBlog.reviewNotes || '');
                      }}
                      className="rounded-xl bg-red-600 text-white hover:bg-red-700"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* 2. EDIT BLOG MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!editingBlog} onOpenChange={() => setEditingBlog(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Edit Blog Submission
            </DialogTitle>
            <DialogDescription>
              Update blog details, image, author information, content, and publication status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-5 pt-2">
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Blog Title <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter blog title..."
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-[#4CAF50] focus:ring-[#4CAF50]"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Author Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Author Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={form.authorName}
                  onChange={(e) => setForm((prev) => ({ ...prev, authorName: e.target.value }))}
                  placeholder="Author full name"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Author Email <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={form.authorEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, authorEmail: e.target.value }))}
                  placeholder="author@example.com"
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Featured Image with Device Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Featured Image</label>
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/70 p-3.5 transition-all hover:border-[#4CAF50]/50">
                {imagePreviewUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3.5">
                    <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-black/5 flex items-center justify-center">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
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
                        <p className="text-[11px] text-gray-400">JPG, PNG, WEBP up to 10 MB</p>
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
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Short Description / Excerpt
              </label>
              <Textarea
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Brief summary shown in blog cards and social previews..."
                className="rounded-xl text-sm"
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Full Blog Content <span className="text-red-500">*</span>
              </label>
              <Textarea
                required
                rows={8}
                value={form.content}
                onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Write or edit the complete blog article text here..."
                className="rounded-xl text-sm font-sans leading-relaxed"
              />
            </div>

            {/* Tags & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Tags</label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="spirituality, events, community (comma separated)"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Publication Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as BlogSubmission['status'],
                    }))
                  }
                  className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-[#4CAF50] focus:ring-[#4CAF50]"
                >
                  <option value="pending">Pending (Hidden)</option>
                  <option value="approved">Approved / Published (Public)</option>
                  <option value="rejected">Rejected (Hidden)</option>
                </select>
              </div>
            </div>

            {/* SEO & Publication Date */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-gray-500" />
                SEO & Metadata Settings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">SEO Meta Title</label>
                  <Input
                    value={form.seoTitle}
                    onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder="Custom meta title for Google search"
                    className="rounded-lg bg-white h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Publication Date</label>
                  <Input
                    type="date"
                    value={form.publishedAt}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, publishedAt: e.target.value }))
                    }
                    className="rounded-lg bg-white h-9 text-xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-gray-600">SEO Meta Description</label>
                  <Input
                    value={form.seoDescription}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, seoDescription: e.target.value }))
                    }
                    placeholder="Short summary under 160 characters for search engine snippets"
                    className="rounded-lg bg-white h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Review Notes / Internal Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Review Notes / Rejection Reason (Internal)
              </label>
              <Input
                value={form.reviewNotes}
                onChange={(e) => setForm((prev) => ({ ...prev, reviewNotes: e.target.value }))}
                placeholder="Optional notes for admin records..."
                className="rounded-xl text-sm"
              />
            </div>

            {/* Form Footer */}
            <DialogFooter className="flex-row items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingBlog(null)}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#4CAF50] text-white hover:bg-[#43A047]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* 3. REJECT REASON PROMPT MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!rejectingBlog} onOpenChange={() => setRejectingBlog(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <XCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Reject Blog Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Are you sure you want to reject{' '}
              <span className="font-semibold text-gray-800">
                &ldquo;{rejectingBlog?.title}&rdquo;
              </span>
              ? You can provide a reason for the record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-gray-700">
              Rejection Reason (Optional)
            </label>
            <Textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Content does not align with trust guidelines or needs revision..."
              className="rounded-xl text-sm"
            />
          </div>

          <DialogFooter className="flex-row items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setRejectingBlog(null)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReject}
              disabled={isSubmitting}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* 4. DELETE CONFIRMATION MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!deletingBlog} onOpenChange={() => setDeletingBlog(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Permanently Delete Blog?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 leading-relaxed pt-1">
              Are you sure you want to delete{' '}
              <span className="font-bold text-gray-900">
                &ldquo;{deletingBlog?.title}&rdquo;
              </span>
              ?
              <br />
              This action cannot be undone. It will permanently remove the blog record from the database and the public website.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row items-center justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingBlog(null)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Blog'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
