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
      match: [/@gndec\.ac\.in$/, 'Email must be a valid @gndec.ac.in address'],
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

module.exports = mongoose.model('Student', studentSchema);
