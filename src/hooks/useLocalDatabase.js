import { useState, useEffect, useCallback } from 'react';

const { ipcRenderer } = window.require ? window.require('electron') : {};

/**
 * Hook que reemplaza useFirebaseSync cuando estamos en Electron.
 * Lee y escribe a la base de datos SQLite local via IPC.
 * 
 * Mantiene la MISMA interfaz: [data, setData, loading]
 */
export function useLocalDatabase(collectionName, documentId, initialValue) {
    const [data, setDataState] = useState(initialValue);
    const [loading, setLoading] = useState(true);

    // Cargar datos al montar
    useEffect(() => {
        loadData();
    }, [collectionName]);

    const loadData = async () => {
        try {
            let result;
            switch (collectionName) {
                case 'inventory':
                    result = await ipcRenderer.invoke('db-get-products');
                    if (result.success && result.data && result.data.length > 0) {
                        setDataState(result.data);
                    }
                    break;

                case 'sales':
                    result = await ipcRenderer.invoke('db-get-sales');
                    if (result.success && result.data && result.data.length > 0) {
                        setDataState(result.data);
                    }
                    break;

                case 'settings':
                    result = await ipcRenderer.invoke('db-get-settings');
                    if (result.success && result.data) {
                        setDataState(result.data);
                    }
                    break;

                case 'wholesale_customers':
                    result = await ipcRenderer.invoke('db-get-customers', 'wholesale');
                    if (result.success && result.data && result.data.length > 0) {
                        setDataState(result.data);
                    }
                    break;

                case 'common_customers':
                    result = await ipcRenderer.invoke('db-get-customers', 'common');
                    if (result.success && result.data && result.data.length > 0) {
                        setDataState(result.data);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error cargando ${collectionName}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const updateData = useCallback(async (newValue) => {
        try {
            // Si newValue es una función (como en useState), la ejecutamos
            const valueToStore = newValue instanceof Function ? newValue(data) : newValue;
            
            // Actualizar el estado local inmediatamente
            setDataState(valueToStore);

            // Guardar en la base de datos
            let result;
            switch (collectionName) {
                case 'inventory':
                    result = await ipcRenderer.invoke('db-save-products', valueToStore);
                    break;

                case 'sales':
                    result = await ipcRenderer.invoke('db-save-sales', valueToStore);
                    break;

                case 'settings':
                    result = await ipcRenderer.invoke('db-save-settings', valueToStore);
                    break;

                case 'wholesale_customers':
                    result = await ipcRenderer.invoke('db-save-customers', 'wholesale', valueToStore);
                    break;

                case 'common_customers':
                    result = await ipcRenderer.invoke('db-save-customers', 'common', valueToStore);
                    break;
            }

            if (result && !result.success) {
                console.error(`Error guardando ${collectionName}:`, result.error);
            }
        } catch (error) {
            console.error(`Error actualizando ${collectionName}:`, error);
            alert("Error al guardar datos localmente: " + error.message);
        }
    }, [collectionName, data]);

    return [data, updateData, loading];
}

/**
 * Verifica si la base de datos local necesita migración desde Firebase
 */
export async function checkNeedsMigration() {
    try {
        const result = await ipcRenderer.invoke('db-needs-migration');
        return result.needsMigration;
    } catch (error) {
        console.error('Error verificando migración:', error);
        return false;
    }
}

/**
 * Importa datos desde Firebase a la base de datos local
 */
export async function importFirebaseData(data) {
    try {
        const result = await ipcRenderer.invoke('db-import-firebase', data);
        return result;
    } catch (error) {
        console.error('Error importando datos:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Copia una imagen a la carpeta local de datos
 */
export async function copyImageToLocal(sourcePath) {
    try {
        const result = await ipcRenderer.invoke('db-copy-image', sourcePath);
        return result.success ? result.path : sourcePath;
    } catch (error) {
        return sourcePath;
    }
}

/**
 * Guarda una imagen base64 como archivo local
 */
export async function saveBase64ImageLocal(base64Data, productId) {
    try {
        const result = await ipcRenderer.invoke('db-save-base64-image', base64Data, productId);
        return result.success ? result.path : '';
    } catch (error) {
        return '';
    }
}
