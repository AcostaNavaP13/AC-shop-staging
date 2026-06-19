const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// TODO: Reemplazar con tu Access Token de producción o prueba de Mercado Pago
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-7598487038100771-061915-e2d1d6e2cb9856346cfd692db81a4427-1115153999' });

app.post('/create_preference', async (req, res) => {
    try {
        const cartItems = req.body.items; // Recibimos el carrito desde app.js

        // Mapeamos los artículos del carrito al formato que pide Mercado Pago
        const mpItems = cartItems.map(item => ({
            title: item.name + (item.size && item.size !== 'N/A' ? ` (${item.size})` : ''),
            quantity: Number(item.quantity),
            unit_price: Number(item.price),
            currency_id: 'MXN',
        }));

        const body = {
            items: mpItems,
            back_urls: {
                success: "http://localhost:5500/index.html", // A donde regresa si paga con éxito
                failure: "http://localhost:5500/index.html", // A donde regresa si falla
                pending: "http://localhost:5500/index.html"  // Si va al Oxxo
            },
            auto_return: "approved",
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });
        
        // Devolvemos el ID de la preferencia al Frontend
        res.json({
            id: result.id,
        });
    } catch (error) {
        console.error("Error al crear preferencia:", error);
        res.status(500).json({ error: 'Error al crear la preferencia de Mercado Pago' });
    }
});

// NUEVO: Endpoint para recibir Webhooks de Mercado Pago
app.post('/webhook', async (req, res) => {
    try {
        const query = req.query;
        const body = req.body;
        
        // Mercado Pago nos avisa por aquí cuando un pago cambia de estado.
        // Por ahora solo le decimos "Recibido, gracias" para que no nos marque error.
        // En el futuro, aquí conectaremos con Firebase para actualizar el estatus del pedido.
        
        console.log("¡Webhook recibido!", { query, body });
        
        // Es OBLIGATORIO responder con un status 200 rápido a Mercado Pago
        res.status(200).send('OK');
    } catch (error) {
        console.error("Error en webhook:", error);
        res.status(500).send('Error');
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
