// controllers/adminController.js

const db = require('../models/db');
const bcrypt = require('bcrypt');

// Simples: admin hardcoded (depois podemos fazer mais seguro)
const ADMIN_USER = 'admin';
const ADMIN_PASS_HASH = '$2b$10$QsD8zWhR/G6SV2MzqflUVuGo1PCNE/XVxQfUqI84dO3qKL0T1AjSu'; // senha: admin123

exports.loginPage = (req, res) => {
    res.render('admin/login', { error: null });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin123') {
        req.session.admin = true;
        return res.redirect('/admin/dashboard');
    } else {
        return res.render('admin/login', { error: 'Credenciais inválidas' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
};

exports.isAuthenticated = (req, res, next) => {
    if (req.session.admin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

exports.dashboard = async (req, res) => {
    try {
        const ordersResult = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
        const orders = ordersResult.rows;
        res.render('admin/dashboard', { orders });
    } catch (error) {
        console.error(error);
        res.send('Erro ao carregar dashboard');
    }
};

exports.updateStatus = async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;

    try {
        // Atualiza o status atual do pedido (não precisa mexer no horário aqui)
        await db.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, orderId]
        );

        // Registra o histórico com horário de Brasília
        await db.query(
            `INSERT INTO tracking_updates (order_id, status, timestamp)
             VALUES ($1, $2, (NOW() AT TIME ZONE 'America/Sao_Paulo'))`,
            [orderId, status]
        );

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.send('Erro ao atualizar status');
    }
};


exports.pedidoDetalhes = async (req, res) => {
  const orderId = req.params.id;

  try {
    const pedido = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const etapas = await db.query(
      'SELECT * FROM tracking_updates WHERE order_id = $1 ORDER BY timestamp ASC',
      [orderId]
    );

    res.render('admin/pedidoDetalhes', {
      order: pedido.rows[0],
      updates: etapas.rows
    });

  } catch (error) {
    console.error('Erro ao carregar pedido:', error);
    res.status(500).send('Erro ao carregar detalhes do pedido');
  }
};


exports.adicionarEtapa = async (req, res) => {
  const orderId = req.params.id;
  const { status, descricao, cidade, uf } = req.body;

  try {
    // Insere a nova etapa
    await db.query(
      `INSERT INTO tracking_updates (order_id, status, descricao, cidade, uf, timestamp)
       VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'America/Sao_Paulo'))`,
      [orderId, status, descricao, cidade, uf]
    );

    // Atualiza o status atual do pedido (reflete o último passo)
    await db.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, orderId]
    );

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Erro ao adicionar etapa:', error);
    res.status(500).send('Erro ao adicionar etapa');
  }
};

