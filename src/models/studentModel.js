const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/@gmail\.com$/, 'Email must be a valid @gmail.com address'],
    },
    urn: { type: String, required: true, unique: true }, // University Roll Number
    crn: { type: String, required: true },               // Class Roll Number
    password: { type: String, required: true },
    department: { type: String, required: true },
    semester: { type: String },
    group: { type: String },
  },
  { timestamps: true }
);

// ⚡ OPTIMIZATION: Add indexes for faster queries
studentSchema.index({ email: 1 }); // Email lookup
studentSchema.index({ urn: 1 }); // URN lookup
studentSchema.index({ crn: 1 }); // CRN lookup
studentSchema.index({ department: 1 }); // Department filter
studentSchema.index({ createdAt: -1 }); // Sort by date
studentSchema.index({ email: 1, createdAt: -1 }); // Compound index

module.exports = mongoose.model('Student', studentSchema);
