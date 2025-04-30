// services/emailService.js

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465', // true para porta 465 (TLS)
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

/**
 * Envia e-mail de confirmação com rastreio, endereço e produtos.
 */
async function sendPaymentConfirmation(email, trackingCode, nomeCompleto, phone, address, items) {
    const { street, number, neighborhood, city, uf, zipcode } = address;
    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">

        <!-- Logo / Nome -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 28px; font-weight: bold; color: #2563eb;">🚚 Transportadora Aurora</div>
          <div style="font-size: 14px; color: #666;">Seu pedido está a caminho!</div>
        </div>

        <!-- Cabeçalho -->
        <h1 style="color: #111111; font-size: 24px;">✅ Pagamento Aprovado!</h1>
        <p style="font-size: 16px; color: #333;">Olá, <strong>${nomeCompleto}</strong>! Seu pagamento foi confirmado com sucesso em <strong>${dataHora}</strong>. Agora estamos preparando tudo para o envio do seu pedido.</p>

        <!-- Código de Rastreio -->
        <p style="font-size: 16px; color: #333;">
          <strong>Código de Rastreio:</strong> <span style="font-size: 18px; color: #2563eb;">${trackingCode}</span>
        </p>

        <!-- Endereço -->
        <div style="margin: 20px 0;">
          <h2 style="font-size: 18px; color: #111111;">📦 Endereço de Entrega</h2>
          <p style="font-size: 15px; color: #333; line-height: 1.5;">
            ${street}, nº ${number}<br>
            ${neighborhood} – ${city}/${uf}<br>
            CEP: ${zipcode}<br>
            Tel: ${phone}
          </p>
        </div>

        <!-- Lista de Produtos -->
        <div style="margin: 20px 0;">
          <h2 style="font-size: 18px; color: #111111;">🛒 Produtos Comprados</h2>
          <ul style="font-size: 15px; color: #333; padding-left: 20px;">
            ${items.map(item => `
              <li>
                ${item.quantity}x <strong>${item.name}</strong> — R$ ${item.price.toFixed(2).replace('.', ',')}
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Botão de Rastreio -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://seusite.com/rastreio/${trackingCode}" 
             style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px;">
             🔍 Rastrear Pedido
          </a>
        </div>

        <!-- Rodapé -->
        <p style="font-size: 14px; color: #999; text-align: center;">
          Qualquer dúvida, entre em contato com a nossa equipe.<br>
          Obrigado por escolher a Transportadora Aurora 🚀
        </p>
      </div>
    </div>
    `;

    const info = await transporter.sendMail({
        from: `"Transportadora Aurora" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Seu pagamento foi aprovado!",
        html: htmlContent,
    });

    console.log('✅ E-mail enviado para', email, '| ID:', info.messageId);
}

module.exports = { sendPaymentConfirmation };
