const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentController');


router.post('/register', ctrl.register);
router.post('/sign', ctrl.sign);
router.post('/auth', ctrl.getByUrn); // Get student details by URN and password
router.get('/', ctrl.getAll);
router.put('/:id', ctrl.updateStudent); // Update student details
router.post('/forgetpassword', ctrl.forgetPassword); // Student forget password

module.exports = router;
