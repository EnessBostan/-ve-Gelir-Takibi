import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import config from "../../firebase-applet-config.json";

const app = initializeApp(config);

// Initialize Firestore with the specific database ID from the config
export const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
