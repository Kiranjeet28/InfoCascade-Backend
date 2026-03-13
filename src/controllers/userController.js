const User = require('../models/userModel');
const fail = (res, status, code, message, extra = {}) =>
  res.status(status).json({ success: false, code, message, ...extra });

exports.createUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return fail(res, 400, 'USER_CREATE_REQUIRED_FIELDS', 'name and email are required', {
        requiredFields: ['name', 'email'],
      });
    }

    const user = new User({ name, email });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 400, 'USER_EMAIL_ALREADY_EXISTS', 'Email already exists', { field: 'email' });
    }
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, 'USER_NOT_FOUND', 'User not found', { field: 'id' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return fail(res, 404, 'USER_NOT_FOUND', 'User not found', { field: 'id' });
    res.json(user);
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 400, 'USER_EMAIL_ALREADY_EXISTS', 'Email already exists', { field: 'email' });
    }
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return fail(res, 404, 'USER_NOT_FOUND', 'User not found', { field: 'id' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
