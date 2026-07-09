import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadImage = async (file, path) => {
    if (!file) return null;

    try {
        console.log("Subiendo archivo directamente a Firebase:", path);

        // Referencia al lugar donde se guardará
        const storageRef = ref(storage, path);

        // Metadata básica
        const metadata = {
            contentType: file.type,
        };

        // Subida directa (más fiable si la compresión falla)
        const snapshot = await uploadBytes(storageRef, file, metadata);
        console.log("Subida completada, obteniendo URL...");

        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("URL obtenida:", downloadURL);

        return downloadURL;
    } catch (error) {
        console.error("Error crítico en uploadImage:", error);
        if (error.code === 'storage/unauthorized') {
            alert("⚠️ Permiso Denegado: Firebase Storage está bloqueado. Por favor, ve a la Consola de Firebase -> Storage y activa el servicio o despliega las reglas.");
        } else if (error.code === 'storage/retry-limit-exceeded') {
            alert("⚠️ El internet está muy lento y la foto no se pudo subir. Intenta de nuevo.");
        }
        throw error;
    }
};
