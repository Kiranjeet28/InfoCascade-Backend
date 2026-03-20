const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { cacheMiddleware, purgeCache } = require('../middleware/cacheMiddleware');

// ⚡ CACHE OPTIMIZATION: Cache GET requests for 5 minutes
router.get('/', cacheMiddleware(5 * 60 * 1000), ctrl.getUsers);

router.post('/', purgeCache(), ctrl.createUser);
router.get('/:id', ctrl.getUserById);
router.put('/:id', purgeCache(), ctrl.updateUser);
router.delete('/:id', purgeCache(), ctrl.deleteUser);

module.exports = router;
