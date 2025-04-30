const db = require('../models/db');
const { sendPaymentConfirmation } = require('../services/emailService');
const crypto = require('crypto');

// Geração de código de rastreio (ex: AST123456AB)
function gerarCodigoRastreio() {
    const prefixo = 'BR';
    const aleatorio = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
    const sufixo = 'AST'; // 2 letras
    return `${sufixo}${aleatorio}${prefixo}`;
}

exports.receberPagamento = async (req, res) => {
    try {
        const resource = req.body.resource;
        const customer = resource.customer;
        const address = resource.address;

        // Validação mínima
        if (!customer || !address) {
            return res.status(400).json({ erro: 'Payload incompleto: dados de cliente ou endereço ausentes.' });
        }

        // Dados do cliente
        const nomeCompleto = `${customer.first_name} ${customer.last_name}`;
        const email = customer.email;
        const phone = customer.phone;

        // Dados do endereço
        const street = address.street;
        const number = address.number;
        const neighborhood = address.neighborhood;
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

        // Histórico inicial com horário de Brasília
        await db.query(
            `INSERT INTO tracking_updates (order_id, status, timestamp) 
             VALUES ($1, $2, (NOW() AT TIME ZONE 'America/Sao_Paulo'))`,
            [orderId, 'Aguardando Coleta']
        );

        // Enviar e-mail com rastreio
        await sendPaymentConfirmation(
  email,
  trackingCode,
  nomeCompleto,
  phone,
  { street, number, neighborhood, city, uf, zipcode },
  resource.items
);

        res.status(200).json({ sucesso: true, trackingCode });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
};
