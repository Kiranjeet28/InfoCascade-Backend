const express = require('express');
const router = express.Router();

const users = require('./users');
const students = require('./students');
const otp = require('./otp');

router.use('/users', users);
router.use('/students', students);
router.use('/otp', otp);

module.exports = router;
