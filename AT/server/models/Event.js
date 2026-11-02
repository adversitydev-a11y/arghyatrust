import mongoose from 'mongoose';

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    slug: { type: String, trim: true, lowercase: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    date: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 220 },
    category: { type: String, required: true, trim: true, maxlength: 120 },
    status: { type: String, enum: ['Upcoming', 'Completed'], default: 'Upcoming' },
    participants: { type: Number, min: 0 },
    imageUrl: { type: String, trim: true, maxlength: 1000 },
    registrationLink: { type: String, trim: true, maxlength: 500 },
    brochureUrl: { type: String, trim: true, maxlength: 1000 },
    featured: { type: Boolean, default: false },
    isVisible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

eventSchema.pre('save', function () {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title);
  }
});

eventSchema.index({ isVisible: 1, status: 1, featured: -1, sortOrder: 1, createdAt: -1 });

export const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);
