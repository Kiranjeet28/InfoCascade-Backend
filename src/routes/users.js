const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');

router.post('/', ctrl.createUser);
router.get('/', ctrl.getUsers);
router.get('/:id', ctrl.getUserById);
router.put('/:id', ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);

module.exports = router;
