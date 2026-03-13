const Student = require('../models/studentModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

// ─── Register ────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, urn, crn, password, department, semester, group } = req.body;

    if (!name || !email || !urn || !crn || !password || !department) {
      return res.status(400).json({ error: 'name, email, urn, crn, password and department are required' });
    }

    // Validate @gmail.com email
    if (!/@gmail\.com$/i.test(email)) {
      return res.status(400).json({ error: 'Email must be a valid @gmail.com address' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const student = new Student({
      name,
      email,
      urn,
      crn,
      password: hashed,
      department,
      semester,
      group,
    });

    await student.save();
    res.status(201).json({
      success: true,
      message: 'Student registered',
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        urn: student.urn,
        crn: student.crn,
        department: student.department,
        semester: student.semester,
        group: student.group,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field =
        Object.keys(err.keyPattern || {})[0] ||
        Object.keys(err.keyValue || {})[0] ||
        'unique field';
      return res.status(400).json({ error: `Duplicate value for ${field}` });
    }
    next(err);
  }
};

// ─── Sign In ─────────────────────────────────────────────────────────
exports.sign = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be urn, crn or email
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'identifier and password required' });
    }

    const student = await Student.findOne({
      $or: [{ urn: identifier }, { crn: identifier }, { email: identifier }],
    });
    if (!student) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, student.password);
    if (!ok) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Sign in successful',
      token,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        urn: student.urn,
        crn: student.crn,
        department: student.department,
        semester: student.semester,
        group: student.group,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Student by URN (authenticated) ─────────────────────────────
exports.getByUrn = async (req, res, next) => {
  try {
    const { urn, password } = req.body;
    if (!urn || !password) return res.status(400).json({ success: false, error: 'urn and password required' });

    const student = await Student.findOne({ urn });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const ok = await bcrypt.compare(password, student.password);
    if (!ok) return res.status(400).json({ success: false, error: 'Invalid credentials' });

    const safeStudent = {
      _id: student._id,
      name: student.name,
      email: student.email,
      urn: student.urn,
      crn: student.crn,
      department: student.department,
      semester: student.semester,
      group: student.group,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };

    res.json({ success: true, student: safeStudent });
  } catch (err) {
    next(err);
  }
};

// ─── Update Student ──────────────────────────────────────────────────
exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Prevent updating sensitive / immutable fields directly
    delete updateData.password;
    delete updateData.email; // email is unique identity – don't allow casual update
    delete updateData.urn;

    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: 'query',
    }).select('-password -__v');

    if (!updatedStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student updated', student: updatedStudent });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Students ────────────────────────────────────────────────
exports.getAll = async (req, res, next) => {
  try {
    const students = await Student.find().select('-password -__v');
    res.json(students);
  } catch (err) {
    next(err);
  }
};

// ─── Forget Password ────────────────────────────────────────────────
exports.forgetPassword = async (req, res, next) => {
  try {
    const { identifier, newPassword } = req.body; // identifier can be urn, crn or email
    if (!identifier || !newPassword) {
      return res.status(400).json({ error: 'identifier and newPassword required' });
    }

    const student = await Student.findOne({
      $or: [{ urn: identifier }, { crn: identifier }, { email: identifier }],
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    student.password = hashed;
    await student.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
