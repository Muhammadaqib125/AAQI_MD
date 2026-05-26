// ======================================
//       AAQI MD - WhatsApp Bot
// ======================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Home Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate Pairing Code
app.post('/generate-pair', async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: "Phone number required" });
    }

    const sessionId = uuidv4().slice(0, 12);
    const serverId = Math.floor(Math.random() * 50) + 1;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${sessionId}`);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ["Chrome", "Desktop", "1.0"],
        });

        let pairingCode = null;

        sock.ev.on('connection.update', async (update) => {
            if (update.qr) {
                pairingCode = await sock.requestPairingCode(phoneNumber.replace('+', '').replace(/\s/g, ''));
            }
        });

        sock.ev.on('creds.update', saveCreds);

        setTimeout(() => {
            if (pairingCode) {
                res.json({
                    success: true,
                    pairingCode: pairingCode,
                    assignedServer: serverId
                });
            } else {
                res.status(500).json({ success: false, error: "Failed to generate code" });
            }
        }, 7000);

    } catch (error) {
        res.status(500).json({ success: false, error: "Server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ AAQI MD Server Running on Port ${PORT}`);
});
