// routes/trackingRoutes.js

const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

// Página inicial (Home)
router.get('/', trackingController.home);

// Página de buscar rastreio
router.get('/rastreio', trackingController.rastreio);

// Página de detalhes do rastreio
router.get('/rastreio/:codigo', trackingController.rastreioDetalhes);

module.exports = router;
