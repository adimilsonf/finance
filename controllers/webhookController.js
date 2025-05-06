const db = require('../models/db');
const { sendPaymentConfirmation } = require('../services/emailService');

// Geração de código de rastreio
function gerarCodigoRastreio() {
    const prefixo = 'BR';
    const aleatorio = Math.floor(100000 + Math.random() * 900000);
    const sufixo = 'AST';
    return `${sufixo}${aleatorio}${prefixo}`;
}

exports.receberPagamento = async (req, res) => {
    try {

        // 🔍 Verificação para ignorar webhook de teste
        if (req.body.sucess && typeof req.body.sucess === 'string') {
            console.log('🟡 Webhook de teste recebido:', req.body.sucess);
            return res.status(200).json({ status: 'ok', message: 'Webhook de teste ignorado.' });
        }

        const resource = req.body.resource;

        if (!resource) {
            return res.status(400).json({ erro: 'Corpo do webhook sem campo resource.' });
        }

        const customer = resource.customer;
        const address = resource.address;
        const items = resource.items;

        if (!customer || !address || !items || items.length === 0) {
            return res.status(400).json({ erro: 'Payload incompleto: dados de cliente, endereço ou itens ausentes.' });
        }

        // Dados do cliente
        const nomeCompleto = `${customer.first_name} ${customer.last_name}`;
        const email = customer.email;
        const phone = customer.phone;

        // Dados do endereço
        const street = address.street;
        const number = address.number;
        const neighborhood = address.neighborhood || '-';
        const city = address.city;
        const uf = address.uf;
        const zipcode = address.zipcode;

        const trackingCode = gerarCodigoRastreio();

        // Inserir pedido no banco
        const result = await db.query(
            `INSERT INTO orders 
                (client_name, client_email, phone, tracking_code, status, street, number, neighborhood, city, uf, zipcode)
             VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id`,
            [
                nomeCompleto, email, phone, trackingCode, 'Aguardando Coleta',
                street, number, neighborhood, city, uf, zipcode
            ]
        );

        const orderId = result.rows[0].id;

        // Histórico inicial
        await db.query(
            `INSERT INTO tracking_updates (order_id, status, timestamp) 
             VALUES ($1, $2, (NOW() AT TIME ZONE 'America/Sao_Paulo'))`,
            [orderId, 'Aguardando Coleta']
        );

        // Enviar e-mail
        await sendPaymentConfirmation(
            email,
            trackingCode,
            nomeCompleto,
            phone,
            { street, number, neighborhood, city, uf, zipcode },
            items
        );

        res.status(200).json({ sucesso: true, trackingCode });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
};
