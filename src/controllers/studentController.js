const Student = require('../models/studentModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

// ─── Register ────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, urn, crn, password, department, semester, group } = req.body;

    if (!name || !email || !urn || !crn || !password || !department) {
      return fail(
        res,
        400,
        'STUDENT_REGISTER_REQUIRED_FIELDS',
        'name, email, urn, crn, password and department are required',
        {
          requiredFields: ['name', 'email', 'urn', 'crn', 'password', 'department'],
        }
      );
    }

    // Validate @gmail.com email
    if (!/@gmail\.com$/i.test(email)) {
      return fail(res, 400, 'STUDENT_REGISTER_INVALID_EMAIL', 'Email must be a valid @gmail.com address', {
        field: 'email',
      });
    }

    const existingStudent = await Student.findOne({
      $or: [{ email }, { urn }, { crn }],
    }).select('email urn crn');

    if (existingStudent) {
      if (existingStudent.email === email) {
        return fail(res, 400, 'STUDENT_EMAIL_ALREADY_EXISTS', 'Email is already registered', {
          field: 'email',
        });
      }
      if (existingStudent.urn === urn) {
        return fail(res, 400, 'STUDENT_URN_ALREADY_EXISTS', 'URN is already registered', {
          field: 'urn',
        });
      }
      if (existingStudent.crn === crn) {
        return fail(res, 400, 'STUDENT_CRN_ALREADY_EXISTS', 'CRN is already registered', {
          field: 'crn',
        });
      }
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
      return fail(res, 400, 'STUDENT_DUPLICATE_VALUE', `Duplicate value for ${field}`, {
        field,
      });
    }
    next(err);
  }
};

// ─── Check Field Availability (email / urn / crn) ──────────────────
exports.checkAvailability = async (req, res, next) => {
  try {
    const { type, value } = req.query;

    if (!type || !value) {
      return fail(
        res,
        400,
        'STUDENT_AVAILABILITY_MISSING_QUERY',
        'type and value query params are required',
        {
          requiredQuery: ['type', 'value'],
        }
      );
    }

    const normalizedType = String(type).toLowerCase().trim();
    const normalizedValue = String(value).trim();

    if (!['email', 'urn', 'crn'].includes(normalizedType)) {
      return fail(res, 400, 'STUDENT_AVAILABILITY_INVALID_TYPE', "type must be one of: 'email', 'urn', 'crn'", {
        field: 'type',
      });
    }

    if (!normalizedValue) {
      return fail(res, 400, 'STUDENT_AVAILABILITY_EMPTY_VALUE', 'value must not be empty', {
        field: 'value',
      });
    }

    if (normalizedType === 'email' && !/@gmail\.com$/i.test(normalizedValue)) {
      return res.json({
        success: true,
        type: normalizedType,
        value: normalizedValue,
        available: false,
        reason: 'Email must be a valid @gmail.com address',
      });
    }

    const query = { [normalizedType]: normalizedType === 'email' ? normalizedValue.toLowerCase() : normalizedValue };
    const existing = await Student.exists(query);

    return res.json({
      success: true,
      type: normalizedType,
      value: normalizedValue,
      available: !Boolean(existing),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Sign In ─────────────────────────────────────────────────────────
exports.sign = async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be urn, crn or email
    if (!identifier || !password) {
      return fail(res, 400, 'STUDENT_SIGNIN_REQUIRED_FIELDS', 'identifier and password required', {
        requiredFields: ['identifier', 'password'],
      });
    }

    const student = await Student.findOne({
      $or: [{ urn: identifier }, { crn: identifier }, { email: identifier }],
    });
    if (!student) {
      return fail(res, 400, 'STUDENT_SIGNIN_INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const ok = await bcrypt.compare(password, student.password);
    if (!ok) {
      return fail(res, 400, 'STUDENT_SIGNIN_INVALID_CREDENTIALS', 'Invalid credentials');
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
    if (!urn || !password) {
      return fail(res, 400, 'STUDENT_AUTH_REQUIRED_FIELDS', 'urn and password required', {
        requiredFields: ['urn', 'password'],
      });
    }

    const student = await Student.findOne({ urn });
    if (!student) return fail(res, 404, 'STUDENT_NOT_FOUND', 'Student not found', { field: 'urn' });

    const ok = await bcrypt.compare(password, student.password);
    if (!ok) return fail(res, 400, 'STUDENT_AUTH_INVALID_CREDENTIALS', 'Invalid credentials');

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
      return fail(res, 404, 'STUDENT_NOT_FOUND', 'Student not found', { field: 'id' });
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
      return fail(res, 400, 'STUDENT_FORGOT_PASSWORD_REQUIRED_FIELDS', 'identifier and newPassword required', {
        requiredFields: ['identifier', 'newPassword'],
      });
    }

    const student = await Student.findOne({
      $or: [{ urn: identifier }, { crn: identifier }, { email: identifier }],
    });
    if (!student) {
      return fail(res, 404, 'STUDENT_NOT_FOUND', 'Student not found', { field: 'identifier' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    student.password = hashed;
    await student.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};
