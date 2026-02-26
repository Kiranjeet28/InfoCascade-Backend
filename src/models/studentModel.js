const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    id: { type: String, default: () => new mongoose.Types.ObjectId().toHexString(), unique: true },
    name: {type: String, required: true },
  password: { type: String, required: true },
  crn: { type: String, required: true, unique: true },
  urn: { type: String, required: true, unique: true },
  AcedminPassword: { type: String },
  department: { type: String },
  group: { type: String },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);
