// controllers/trackingController.js

const db = require('../models/db'); // Vamos criar esse db.js para conectar no PostgreSQL depois

// Página Home
exports.home = (req, res) => {
    res.render('public/home');
};

// Página de busca de rastreio
exports.rastreio = (req, res) => {
    res.render('public/rastreio', { error: null });
};

// Página de detalhes do rastreio
exports.rastreioDetalhes = async (req, res) => {
    const codigo = req.params.codigo;

    try {
        const orderResult = await db.query('SELECT * FROM orders WHERE tracking_code = $1', [codigo]);
        if (orderResult.rows.length === 0) {
            return res.render('public/rastreio', { error: 'Código de rastreio não encontrado.' });
        }

        const order = orderResult.rows[0];

        const updatesResult = await db.query(
            'SELECT * FROM tracking_updates WHERE order_id = $1 ORDER BY timestamp ASC',
            [order.id]
        );
        const updates = updatesResult.rows;

        res.render('public/rastreioDetalhes', { order, updates });
    } catch (error) {
        console.error(error);
        res.render('public/rastreio', { error: 'Erro ao buscar rastreio. Tente novamente.' });
    }
};
