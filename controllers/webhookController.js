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

        const customer = body.customer;
        const address = body.address;
        const plans = body.plans;

        if (!customer || !address || !plans || plans.length === 0) {
            return res.status(400).json({ erro: 'Payload incompleto: cliente, endereço ou planos ausentes.' });
        }

        // Dados do cliente
        const nomeCompleto = customer.name;
        const email = customer.email;
        const phone = customer.phone;

        // Dados do endereço
        const street = address.street;
        const number = address.number;
        const neighborhood = address.district || '-';
        const city = address.city;
        const uf = address.state;
        const zipcode = address.zip_code;

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

        // Extrair todos os produtos de dentro dos planos
        const items = plans.flatMap(plan =>
            plan.products.map(product => ({
                name: product.name,
                quantity: product.amount,
                price: Number(plan.value) / product.amount // valor dividido igualmente
            }))
        );

        // Enviar e-mail com rastreio
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
