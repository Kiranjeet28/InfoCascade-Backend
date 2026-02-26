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

exports.getAll = async (req, res, next) => {
  try {
    const students = await Student.find().select('-password -AcedminPassword -__v -_id');
    res.json(students);
  } catch (err) {
    next(err);
  }
};
