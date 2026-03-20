const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/studentController');
const { cacheMiddleware, purgeCache } = require('../middleware/cacheMiddleware');

// ⚡ CACHE OPTIMIZATION: Cache GET requests for 5 minutes
router.get('/', cacheMiddleware(5 * 60 * 1000), ctrl.getAll);

router.get('/check-availability', ctrl.checkAvailability); // Debounced field validation for email/urn/crn
router.post('/register', purgeCache(), ctrl.register);
router.post('/sign', purgeCache(), ctrl.sign);
router.post('/auth', ctrl.getByUrn); // Get student details by URN and password
router.put('/:id', purgeCache(), ctrl.updateStudent); // Update student details (purge cache)
router.post('/forgetpassword', purgeCache(), ctrl.forgetPassword); // Student forget password

module.exports = router;
