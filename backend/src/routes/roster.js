const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { authenticate, isAdmin } = require('../middleware/auth');

router.post('/import', authenticate, isAdmin, rosterController.importRoster);
router.get('/students', authenticate, isAdmin, rosterController.getPendingStudents);

module.exports = router;
