/* Global Email object helper to handle SMTP via Electron IPC */
const Email = {
    send: function (options) {
        return new Promise((resolve, reject) => {
            try {
                // Verificamos si podemos acceder a Electron
                if (!window.require) {
                    throw new Error("No se detectó el entorno de escritorio.");
                }

                const electron = window.require('electron');
                const ipcRenderer = electron.ipcRenderer;

                if (!ipcRenderer) {
                    throw new Error("El sistema de comunicación IPC no está disponible.");
                }

                ipcRenderer.invoke('send-email', {
                    host: options.host,
                    port: options.port || 465,
                    username: options.username,
                    password: options.password,
                    to: options.to,
                    from: options.from,
                    fromName: options.fromName,
                    subject: options.subject,
                    body: options.body,
                    attachments: options.attachments || []
                }).then(response => {
                    if (response.success) {
                        resolve("OK");
                    } else {
                        reject({ message: response.message });
                    }
                }).catch(err => {
                    reject({ message: "Error en el servidor de correo: " + err.message });
                });
            } catch (e) {
                // Si no estamos en Electron, intentamos vía Firebase Functions (Versión Web)
                console.log("No detectado Electron, intentando vía Cloud Functions...");

                // Timeout de 20 segundos para evitar el reloj de arena infinito
                const timeoutId = setTimeout(() => {
                    reject({ message: "Tiempo de espera agotado. Verifica tu conexión a internet o el servidor de Firebase." });
                }, 20000);

                fetch("https://us-central1-app-floreria.cloudfunctions.net/sendEmail", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        host: options.host,
                        port: options.port || 465,
                        username: options.username,
                        password: options.password,
                        to: options.to,
                        from: options.from,
                        fromName: options.fromName,
                        subject: options.subject,
                        body: options.body
                    })
                })
                    .then(res => {
                        clearTimeout(timeoutId);
                        return res.json().catch(() => { throw new Error("Respuesta inválida del servidor"); });
                    })
                    .then(data => {
                        if (data.success) {
                            resolve("OK");
                        } else {
                            reject({ message: data.message || "Error desconocido al enviar el correo." });
                        }
                    })
                    .catch(err => {
                        clearTimeout(timeoutId);
                        console.error("Fetch error:", err);
                        reject({ message: "Error de conexión Web: " + (err.message || "No se pudo contactar con la nube.") });
                    });
            }
        });
    }
};

export default Email;
