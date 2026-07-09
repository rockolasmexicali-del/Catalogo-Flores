import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export function useFirebaseSync(collectionName, documentId, initialValue) {
    const [data, setData] = useState(initialValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!documentId) return;

        const docRef = doc(db, collectionName, documentId);

        // Escuchar cambios en tiempo real
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setData(docSnap.data().value);
            } else {
                // Si el documento no existe, lo creamos con el valor inicial
                setDoc(docRef, { value: initialValue });
                setData(initialValue);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching firebase data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [collectionName, documentId]);

    const updateData = async (newValue) => {
        try {
            const docRef = doc(db, collectionName, documentId);
            // Si newValue es una función (como en useState), la ejecutamos
            const valueToStore = newValue instanceof Function ? newValue(data) : newValue;

            await setDoc(docRef, { value: valueToStore });
            setData(valueToStore);
        } catch (error) {
            console.error("Error updating firebase data:", error);
            if (error.code === 'resource-exhausted' || error.message.includes('too large')) {
                alert("¡DATOS DEMASIADO PESADOS! ⚠️\n\nNo se pudo guardar porque hay demasiadas fotos pesadas acumuladas. \n\nPor favor, intenta registrar el producto SIN FOTO o usa una foto más pequeña para que el sistema pueda liberar espacio.");
            } else {
                alert("Error de conexión: No se pudieron guardar los datos en la nube. Verifica tu internet.");
            }
        }
    };

    return [data, updateData, loading];
}
