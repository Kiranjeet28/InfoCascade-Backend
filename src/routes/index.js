const express = require('express');
const router = express.Router();

const users = require('./users');
const students = require('./students');
const otp = require('./otp');

router.use('/users', users);
router.use('/students', students);
router.use('/otp', otp);

// Legacy alias – frontend currently POSTs to /api/email/send
// Redirects to the new /api/otp/* endpoints so both paths work
router.use('/email', otp);

module.exports = router;
