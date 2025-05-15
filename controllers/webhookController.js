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
        const body = req.body;

        // Ignora webhook de teste
        if (body.sucess && typeof body.sucess === 'string') {
            console.log('🟡 Webhook de teste recebido:', body.sucess);
            return res.status(200).json({ status: 'ok', message: 'Webhook de teste ignorado.' });
        }

        const client = body.client;
        const address = body.address;
        const items = body.items;

        if (!client || !address || !items || items.length === 0) {
            return res.status(400).json({ erro: 'Payload incompleto: cliente, endereço ou itens ausentes.' });
        }

        // Dados do cliente
        const nomeCompleto = client.name;
        const email = client.email;
        const phone = client.phone;

        // Endereço
        const street = address.street;
        const number = address.number;
        const neighborhood = address.neighborhood || '-';
        const city = address.city;
        const uf = address.state;
        const zipcode = address.zipcode;

        const trackingCode = gerarCodigoRastreio();

        // Salvar pedido no banco
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

        // Registrar etapa inicial
        await db.query(
            `INSERT INTO tracking_updates (order_id, status, timestamp)
             VALUES ($1, $2, (NOW() AT TIME ZONE 'America/Sao_Paulo'))`,
            [orderId, 'Aguardando Coleta']
        );

        // Corrigir preços caso venham como string (ex: "99.90")
        const formattedItems = items.map(item => ({
            name: item.name,
            quantity: Number(item.quantity),
            price: Number(item.price) // já vem em reais
        }));

        // Enviar e-mail com dados
        await sendPaymentConfirmation(
            email,
            trackingCode,
            nomeCompleto,
            phone,
            { street, number, neighborhood, city, uf, zipcode },
            formattedItems
        );

        res.status(200).json({ sucesso: true, trackingCode });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ erro: 'Erro interno' });
    }
};
