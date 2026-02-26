const express = require('express');
const router = express.Router();

const users = require('./users');
const students = require('./students');

router.use('/users', users);
router.use('/students', students);

module.exports = router;
