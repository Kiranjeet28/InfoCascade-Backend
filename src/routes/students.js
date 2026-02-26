const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentController');

router.post('/register', ctrl.register);
router.post('/sign', ctrl.sign);
router.get('/', ctrl.getAll);

module.exports = router;
