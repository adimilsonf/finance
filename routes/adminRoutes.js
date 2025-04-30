// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Login
router.get('/login', adminController.loginPage);
router.post('/login', adminController.login);

// Dashboard de pedidos
router.get('/dashboard', adminController.isAuthenticated, adminController.dashboard);

// Nova rota
router.get('/pedido/:id', adminController.isAuthenticated, adminController.pedidoDetalhes);

// Atualizar status do pedido
//router.post('/update-status/:id', adminController.isAuthenticated, adminController.updateStatus);
router.post('/status/:id/etapa', adminController.isAuthenticated, adminController.adicionarEtapa);

// Logout
router.get('/logout', adminController.logout);

module.exports = router;
