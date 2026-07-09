const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

function getDataPath() {
    // En producción: misma carpeta donde está el .exe
    // En desarrollo: carpeta del proyecto
    if (app.isPackaged) {
        return path.dirname(app.getPath('exe'));
    }
    return app.getPath('userData');
}

function getImagesPath() {
    const imagesPath = path.join(getDataPath(), 'images');
    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath, { recursive: true });
    }
    return imagesPath;
}

function getDbPath() {
    return path.join(getDataPath(), 'floreria.db');
}

function initDatabase() {
    const dbPath = getDbPath();
    console.log('📂 Base de datos en:', dbPath);
    console.log('🖼️ Imágenes en:', getImagesPath());

    db = new Database(dbPath);

    // Habilitar WAL para mejor rendimiento
    db.pragma('journal_mode = WAL');

    // Crear tablas
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            cost REAL DEFAULT 0,
            price REAL DEFAULT 0,
            wholesalePrice REAL DEFAULT 0,
            quantity INTEGER DEFAULT 0,
            category TEXT DEFAULT 'Arreglos',
            details TEXT DEFAULT '',
            image TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS sales (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            customerName TEXT DEFAULT 'Cliente General',
            total REAL DEFAULT 0,
            profit REAL DEFAULT 0,
            items TEXT DEFAULT '[]',
            customer TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS wholesale_customers (
            id TEXT PRIMARY KEY,
            name TEXT DEFAULT '',
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            data TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS common_customers (
            id TEXT PRIMARY KEY,
            name TEXT DEFAULT '',
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            data TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    console.log('✅ Base de datos inicializada correctamente');
    return db;
}

// ==================== PRODUCTOS ====================
function getAllProducts() {
    return db.prepare('SELECT * FROM products').all().map(row => ({
        ...row,
        wholesalePrice: row.wholesalePrice || 0
    }));
}

function saveAllProducts(products) {
    const deleteAll = db.prepare('DELETE FROM products');
    const insert = db.prepare(`
        INSERT OR REPLACE INTO products (id, name, cost, price, wholesalePrice, quantity, category, details, image)
        VALUES (@id, @name, @cost, @price, @wholesalePrice, @quantity, @category, @details, @image)
    `);

    const transaction = db.transaction((items) => {
        deleteAll.run();
        for (const item of items) {
            insert.run({
                id: item.id || Date.now().toString(),
                name: item.name || '',
                cost: item.cost || 0,
                price: item.price || 0,
                wholesalePrice: item.wholesalePrice || 0,
                quantity: item.quantity || 0,
                category: item.category || 'Arreglos',
                details: item.details || '',
                image: item.image || ''
            });
        }
    });

    transaction(products);
}

// ==================== VENTAS ====================
function getAllSales() {
    return db.prepare('SELECT * FROM sales').all().map(row => ({
        ...row,
        items: JSON.parse(row.items || '[]'),
        customer: JSON.parse(row.customer || '{}')
    }));
}

function saveAllSales(sales) {
    const deleteAll = db.prepare('DELETE FROM sales');
    const insert = db.prepare(`
        INSERT OR REPLACE INTO sales (id, date, customerName, total, profit, items, customer)
        VALUES (@id, @date, @customerName, @total, @profit, @items, @customer)
    `);

    const transaction = db.transaction((items) => {
        deleteAll.run();
        for (const item of items) {
            insert.run({
                id: item.id || Date.now().toString(),
                date: item.date || new Date().toISOString(),
                customerName: item.customerName || 'Cliente General',
                total: item.total || 0,
                profit: item.profit || 0,
                items: JSON.stringify(item.items || []),
                customer: JSON.stringify(item.customer || {})
            });
        }
    });

    transaction(sales);
}

// ==================== SETTINGS ====================
function getSettings() {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('main_settings');
    if (row) {
        return JSON.parse(row.value);
    }
    return null;
}

function saveSettings(settings) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('main_settings', JSON.stringify(settings));
}

// ==================== CLIENTES ====================
function getCustomers(type) {
    const table = type === 'wholesale' ? 'wholesale_customers' : 'common_customers';
    return db.prepare(`SELECT * FROM ${table}`).all().map(row => {
        const extra = JSON.parse(row.data || '{}');
        return { id: row.id, name: row.name, email: row.email, phone: row.phone, ...extra };
    });
}

function saveCustomers(type, customers) {
    const table = type === 'wholesale' ? 'wholesale_customers' : 'common_customers';
    const deleteAll = db.prepare(`DELETE FROM ${table}`);
    const insert = db.prepare(`
        INSERT OR REPLACE INTO ${table} (id, name, email, phone, data)
        VALUES (@id, @name, @email, @phone, @data)
    `);

    const transaction = db.transaction((items) => {
        deleteAll.run();
        for (const item of items) {
            const { id, name, email, phone, ...rest } = item;
            insert.run({
                id: id || Date.now().toString(),
                name: name || '',
                email: email || '',
                phone: phone || '',
                data: JSON.stringify(rest)
            });
        }
    });

    transaction(customers);
}

// ==================== IMÁGENES ====================
function copyImageToLocal(sourcePath) {
    try {
        if (!sourcePath || sourcePath === 'LOCAL_IMAGE' || sourcePath.startsWith('data:')) {
            return sourcePath;
        }

        // Si ya está en nuestra carpeta de imágenes, no hacemos nada
        const imagesDir = getImagesPath();
        if (sourcePath.includes(imagesDir.replace(/\\/g, '/'))) {
            return sourcePath;
        }

        // Limpiar la ruta
        let cleanPath = sourcePath;
        if (cleanPath.startsWith('file:///')) {
            cleanPath = cleanPath.replace('file:///', '');
        }
        cleanPath = cleanPath.replace(/\//g, path.sep);

        if (!fs.existsSync(cleanPath)) {
            console.log('⚠️ Imagen no encontrada:', cleanPath);
            return sourcePath;
        }

        const ext = path.extname(cleanPath) || '.jpg';
        const newName = `img_${Date.now()}${ext}`;
        const destPath = path.join(imagesDir, newName);

        fs.copyFileSync(cleanPath, destPath);
        console.log('📷 Imagen copiada:', destPath);

        return destPath;
    } catch (error) {
        console.error('Error copiando imagen:', error);
        return sourcePath;
    }
}

function saveBase64Image(base64Data, productId) {
    try {
        const imagesDir = getImagesPath();
        const match = base64Data.match(/^data:image\/(\w+);base64,/);
        const ext = match ? match[1] : 'png';
        const fileName = `img_${productId}.${ext}`;
        const filePath = path.join(imagesDir, fileName);

        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        fs.writeFileSync(filePath, buffer);
        console.log('📷 Imagen base64 guardada:', filePath);

        return filePath;
    } catch (error) {
        console.error('Error guardando imagen base64:', error);
        return '';
    }
}

// ==================== MIGRACIÓN ====================
function isMigrated() {
    const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get('migrated_from_firebase');
    return row && row.value === 'true';
}

function setMigrated() {
    db.prepare('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)').run('migrated_from_firebase', 'true');
}

function hasAnyData() {
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const sales = db.prepare('SELECT COUNT(*) as count FROM sales').get();
    return (products.count > 0 || sales.count > 0);
}

function importFromFirebase(data) {
    // data = { products, sales, settings, wholesaleCustomers, commonCustomers }
    try {
        if (data.products && data.products.length > 0) {
            saveAllProducts(data.products);
            console.log(`📦 Importados ${data.products.length} productos`);
        }

        if (data.sales && data.sales.length > 0) {
            saveAllSales(data.sales);
            console.log(`💰 Importadas ${data.sales.length} ventas`);
        }

        if (data.settings) {
            saveSettings(data.settings);
            console.log('⚙️ Settings importados');
        }

        if (data.wholesaleCustomers && data.wholesaleCustomers.length > 0) {
            saveCustomers('wholesale', data.wholesaleCustomers);
            console.log(`👥 Importados ${data.wholesaleCustomers.length} clientes mayoreo`);
        }

        if (data.commonCustomers && data.commonCustomers.length > 0) {
            saveCustomers('common', data.commonCustomers);
            console.log(`👥 Importados ${data.commonCustomers.length} clientes comunes`);
        }

        setMigrated();
        console.log('✅ Migración desde Firebase completada');
        return { success: true };
    } catch (error) {
        console.error('❌ Error en migración:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    initDatabase,
    getDataPath,
    getImagesPath,
    getDbPath,
    getAllProducts,
    saveAllProducts,
    getAllSales,
    saveAllSales,
    getSettings,
    saveSettings,
    getCustomers,
    saveCustomers,
    copyImageToLocal,
    saveBase64Image,
    isMigrated,
    setMigrated,
    hasAnyData,
    importFromFirebase
};
