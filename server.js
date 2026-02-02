const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());
app.use(express.static('.'));

const db = new sqlite3.Database('./database.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount INTEGER,
        currency TEXT,
        status TEXT,
        merchant_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, merchant_id } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, 
            currency: 'usd',
            metadata: { merchant_id: merchant_id }
        });
        db.run(`INSERT INTO transactions (id, amount, currency, status, merchant_id) 
                VALUES (?, ?, ?, ?, ?)`, 
                [paymentIntent.id, amount / 100, 'usd', 'pending', merchant_id]);
        res.send({ clientSecret: paymentIntent.client_secret });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
