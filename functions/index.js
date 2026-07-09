const { onRequest } = require("firebase-functions/v2/https");
const nodemailer = require("nodemailer");

// Función para enviar correos vía SMTP (2da Generación)
exports.sendEmail = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { host, port, username, password, to, from, fromName, subject, body } = req.body;

    if (!host || !username || !password || !to || !subject || !body) {
        return res.status(400).send("Faltan campos requeridos");
    }

    try {
        const transporter = nodemailer.createTransport({
            host: host,
            port: port || 465,
            secure: (port || 465) === 465,
            auth: {
                user: username,
                pass: password,
            },
        });

        const mailOptions = {
            from: `"${fromName || "Florería App"}" <${from || username}>`,
            to: to,
            subject: subject,
            html: body,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Correo enviado" });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
