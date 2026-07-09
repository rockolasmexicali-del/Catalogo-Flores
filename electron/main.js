const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const nodemailer = require('nodemailer');
const database = require('./database');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Florería Floria - Punto de Venta",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        },
        icon: path.join(__dirname, '../public/icon.png')
    });

    // Hide menu bar
    win.setMenuBarVisibility(false);

    if (isDev) {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// ==================== IPC: EMAIL ====================
ipcMain.handle('send-email', async (event, options) => {
    try {
        const transporter = nodemailer.createTransport({
            host: options.host,
            port: options.port || 465, // Usar 465 para SSL o 587 para TLS
            secure: options.port === 465 || !options.port, // true para 465, false para otros
            auth: {
                user: options.username,
                pass: options.password
            }
        });

        const mailOptions = {
            from: `"${options.fromName || options.from}" <${options.from}>`,
            to: options.to,
            subject: options.subject,
            html: options.body,
            attachments: options.attachments || []
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado: ' + info.messageId);
        return { success: true, message: 'OK' };
    } catch (error) {
        console.error('Error enviando correo:', error);
        return { success: false, message: error.message };
    }
});

// ==================== IPC: BASE DE DATOS ====================

// Obtener todos los productos
ipcMain.handle('db-get-products', () => {
    try {
        return { success: true, data: database.getAllProducts() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Guardar todos los productos
ipcMain.handle('db-save-products', (event, products) => {
    try {
        database.saveAllProducts(products);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Obtener todas las ventas
ipcMain.handle('db-get-sales', () => {
    try {
        return { success: true, data: database.getAllSales() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Guardar todas las ventas
ipcMain.handle('db-save-sales', (event, sales) => {
    try {
        database.saveAllSales(sales);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Obtener settings
ipcMain.handle('db-get-settings', () => {
    try {
        return { success: true, data: database.getSettings() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Guardar settings
ipcMain.handle('db-save-settings', (event, settings) => {
    try {
        database.saveSettings(settings);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Obtener clientes
ipcMain.handle('db-get-customers', (event, type) => {
    try {
        return { success: true, data: database.getCustomers(type) };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Guardar clientes
ipcMain.handle('db-save-customers', (event, type, customers) => {
    try {
        database.saveCustomers(type, customers);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== IPC: IMÁGENES ====================

// Copiar imagen a carpeta local
ipcMain.handle('db-copy-image', (event, sourcePath) => {
    try {
        const newPath = database.copyImageToLocal(sourcePath);
        return { success: true, path: newPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Guardar imagen base64 a archivo
ipcMain.handle('db-save-base64-image', (event, base64Data, productId) => {
    try {
        const filePath = database.saveBase64Image(base64Data, productId);
        return { success: true, path: filePath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Obtener ruta de la carpeta de datos
ipcMain.handle('db-get-data-path', () => {
    return { path: database.getDataPath(), imagesPath: database.getImagesPath() };
});

// ==================== IPC: MIGRACIÓN ====================

// Verificar si necesita migración
ipcMain.handle('db-needs-migration', () => {
    try {
        const migrated = database.isMigrated();
        const hasData = database.hasAnyData();
        return { needsMigration: !migrated && !hasData };
    } catch (error) {
        return { needsMigration: false, error: error.message };
    }
});

// Importar datos desde Firebase
ipcMain.handle('db-import-firebase', (event, data) => {
    try {
        return database.importFromFirebase(data);
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ==================== APP LIFECYCLE ====================
app.whenReady().then(() => {
    // Inicializar la base de datos ANTES de crear la ventana
    database.initDatabase();

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
