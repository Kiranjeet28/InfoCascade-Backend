// Controller for student forget password
exports.forgetPassword = async (req, res, next) => {
  try {
    const { identifier, newPassword } = req.body; // identifier can be urn or crn
    if (!identifier || !newPassword) {
      return res.status(400).json({ error: 'identifier and newPassword required' });
    }

    const student = await Student.findOne({ $or: [{ urn: identifier }, { crn: identifier }] });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    student.password = hashed;
    await student.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
const Student = require('../models/studentModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

exports.register = async (req, res, next) => {
  try {

    const { name, password, crn, urn, AcedminPassword, department, group, id } = req.body;
    if (!name || !password || !crn || !urn) return res.status(400).json({ error: 'name, password, crn and urn required' });

    const hashed = await bcrypt.hash(password, 10);
    const adminHashed = AcedminPassword ? await bcrypt.hash(AcedminPassword, 10) : undefined;


    const student = new Student({
      id,
      name,
      password: hashed,
      crn,
      urn,
      AcedminPassword: adminHashed,
      department,
      group
    });

    await student.save();
    res.status(201).json({ message: 'Student registered', id: student.id });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Duplicate field' });
    next(err);
  }
};

exports.sign = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be urn or crn
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'identifier and password required' });
    }

    const student = await Student.findOne({ $or: [{ urn: identifier }, { crn: identifier }] });
    if (!student) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, student.password);
    if (!ok) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: student.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Sign in successful',
      token,
      student: {
        id: student.id,
        urn: student.urn,
        crn: student.crn,
        department: student.department,
        group: student.group,
        verified: student.verified
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get student details by URN and password
exports.getByUrn = async (req, res, next) => {
  try {
    const { urn, password } = req.body;
    if (!urn || !password) return res.status(400).json({ success: false, error: 'urn and password required' });

    const student = await Student.findOne({ urn });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const ok = await bcrypt.compare(password, student.password);
    if (!ok) return res.status(400).json({ success: false, error: 'Invalid credentials' });

    // Prepare safe student object
    const safeStudent = {
      id: student.id,
      name: student.name,
      urn: student.urn,
      crn: student.crn,
      department: student.department,
      group: student.group,
      verified: student.verified,
      createdAt: student.createdAt
    };

    res.json({ success: true, student: safeStudent });
  } catch (err) {
    next(err);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    // Prevent updating sensitive fields directly
    delete updateData.password;
    delete updateData.AcedminPassword;
    // Optionally, handle password update separately if needed

    const updatedStudent = await Student.findOneAndUpdate(
      { id },
      updateData,
      { new: true, runValidators: true, context: 'query' }
    ).select('-password -AcedminPassword -__v -_id');

    if (!updatedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student updated', student: updatedStudent });
  } catch (err) {
    next(err);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const students = await Student.find().select('-password -AcedminPassword -__v -_id');
    res.json(students);
  } catch (err) {
    next(err);
  }
};
