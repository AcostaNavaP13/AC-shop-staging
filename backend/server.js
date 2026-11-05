const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();

// Configuración de CORS con soporte para dominios autorizados y variables de entorno
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
    : ['https://acostanavap13.github.io', 'http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:5500'];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir solicitudes sin origen (mobile apps, server-to-server) o si está en lista blanca
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por política CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '500kb' }));

// Access Token desde variable de entorno de Vercel (NUNCA poner la llave directamente aquí)
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

app.post('/create_preference', async (req, res) => {
    try {
        const cartItems = req.body.items;
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ error: 'El carrito no contiene artículos válidos' });
        }

        const mpItems = cartItems.map(item => {
            const quantity = parseInt(item.quantity, 10);
            const unit_price = parseFloat(item.unit_price || item.price);

            if (isNaN(quantity) || quantity <= 0) {
                throw new Error(`Cantidad inválida para el artículo: ${item.title || item.name || 'desconocido'}`);
            }
            if (isNaN(unit_price) || unit_price <= 0) {
                throw new Error(`Precio inválido para el artículo: ${item.title || item.name || 'desconocido'}`);
            }

            return {
                title: String(item.title || item.name || 'Artículo').substring(0, 100),
                quantity,
                unit_price,
                currency_id: 'MXN',
            };
        });

        const storeFrontUrl = process.env.FRONTEND_URL || "https://acostanavap13.github.io/AC-shop-staging";
        const webhookUrl = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/webhook` : "https://ac-shop-staging.vercel.app/webhook";

        const mpAccessToken = (req.body.mpAccessToken && String(req.body.mpAccessToken).trim())
            ? String(req.body.mpAccessToken).trim()
            : process.env.MP_ACCESS_TOKEN;

        if (!mpAccessToken) {
            return res.status(500).json({ error: 'Falta configurar el Access Token de Mercado Pago' });
        }

        const allowCash = req.body.allowCash !== false && req.body.allowCash !== 'false';
        const paymentMethods = {};
        if (!allowCash) {
            paymentMethods.excluded_payment_types = [
                { id: "ticket" },
                { id: "atm" }
            ];
        }
        if (req.body.installments) {
            paymentMethods.installments = Math.min(Math.max(parseInt(req.body.installments, 10) || 1, 1), 24);
        }

        const body = {
            items: mpItems,
            back_urls: {
                success: `${storeFrontUrl}/success.html`, 
                failure: `${storeFrontUrl}/index.html`, 
                pending: `${storeFrontUrl}/success.html`  
            },
            auto_return: "approved",
            external_reference: String(req.body.orderId || ('ORD-' + Date.now())).substring(0, 50),
            notification_url: webhookUrl,
            payment_methods: paymentMethods
        };

        const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
        const preference = new Preference(client);
        const result = await preference.create({ body });
        
        // Devolvemos el ID de la preferencia al Frontend
        res.json({
            id: result.id,
        });
    } catch (error) {
        console.error("Error al crear preferencia:", error);
        res.status(500).json({ 
            error: 'Error al crear la preferencia de Mercado Pago',
            detail: error.message || 'Error en procesamiento'
        });
    }
});

// Endpoint para recibir Webhooks de Mercado Pago
app.post('/webhook', async (req, res) => {
    try {
        const query = req.query;
        const body = req.body;
        
        console.log("¡Webhook recibido!", { query, body });
        
        // Responder con status 200 rápido a Mercado Pago
        res.status(200).send('OK');
    } catch (error) {
        console.error("Error en webhook:", error);
        res.status(500).send('Error');
    }
});

// Endpoint para consultar los detalles del pago (como el correo del comprador)
app.get('/get_payment_info', async (req, res) => {
    try {
        const paymentId = req.query.id;
        if (!paymentId || !/^[0-9]+$/.test(String(paymentId).trim())) {
            return res.status(400).json({ error: 'ID de pago inválido o no proporcionado' });
        }

        const mpAccessToken = (req.query.token && String(req.query.token).trim())
            || (req.headers['x-mp-access-token'] && String(req.headers['x-mp-access-token']).trim())
            || process.env.MP_ACCESS_TOKEN;

        if (!mpAccessToken) {
            return res.status(500).json({ error: 'Falta configurar el Access Token de Mercado Pago' });
        }

        const fetchFn = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({default: f}) => f(...args));
        const response = await fetchFn(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
            headers: {
                Authorization: `Bearer ${mpAccessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('No se pudo obtener información del pago desde Mercado Pago');
        }

        const data = await response.json();
        res.json({
            email: data.payer?.email || 'No proporcionado'
        });

    } catch (error) {
        console.error("Error al obtener info del pago:", error);
        res.status(500).json({ error: 'Error interno al consultar el pago', detail: error.message });
    }
});

// VERCEL SERVERLESS EXPORT
module.exports = app;

// Solo escuchamos en el puerto si NO estamos en Vercel (para pruebas locales)
if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`Servidor de cobros corriendo en http://localhost:${PORT}`);
    });
}
