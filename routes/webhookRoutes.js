// routes/webhookRoutes.js

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/', webhookController.receberPagamento);

module.exports = router;
