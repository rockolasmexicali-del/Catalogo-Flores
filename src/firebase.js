import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// TODO: Reemplazar con la configuración de tu proyecto de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC7rPLnBHmOJc_NMC2cTmsVAGFKJlxNOf8",
    authDomain: "app-floreria.firebaseapp.com",
    projectId: "app-floreria",
    storageBucket: "app-floreria.firebasestorage.app",
    messagingSenderId: "373971355549",
    appId: "1:373971355549:web:e943a902626a340ba19174",
    measurementId: "G-NREGM53DG5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
