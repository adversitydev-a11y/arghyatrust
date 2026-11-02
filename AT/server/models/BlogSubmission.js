import mongoose from 'mongoose';

const blogSubmissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, trim: true, maxlength: 220 },
    category: { type: String, trim: true, default: 'Stories', maxlength: 80 },
    authorName: { type: String, required: true, trim: true, maxlength: 120 },
    authorEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    excerpt: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
    contentHtml: { type: String, required: true, trim: true, maxlength: 30000 },
    readTime: { type: String, required: true, trim: true, maxlength: 40 },
    featuredImageUrl: { type: String, required: true, trim: true, maxlength: 1200 },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewNotes: { type: String, trim: true, maxlength: 2000 },
    seoTitle: { type: String, trim: true, maxlength: 200 },
    seoDescription: { type: String, trim: true, maxlength: 500 },
    publishedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  { timestamps: true },
);

blogSubmissionSchema.index({ status: 1, createdAt: -1 });
blogSubmissionSchema.index({ slug: 1 });

export const BlogSubmission =
  mongoose.models.BlogSubmission || mongoose.model('BlogSubmission', blogSubmissionSchema);
