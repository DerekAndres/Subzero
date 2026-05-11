// Reemplaza estos valores con los de tu proyecto Firebase
// Consola Firebase → Configuración del proyecto → Tus apps → SDK de configuración

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getFunctions }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const firebaseConfig = {
  apiKey:            "REEMPLAZAR",
  authDomain:        "subzero-raspados.firebaseapp.com",
  projectId:         "subzero-raspados",
  storageBucket:     "subzero-raspados.appspot.com",
  messagingSenderId: "REEMPLAZAR",
  appId:             "REEMPLAZAR"
};

const app       = initializeApp(firebaseConfig);
const db        = getFirestore(app);
const auth      = getAuth(app);
const storage   = getStorage(app);
const functions = getFunctions(app, "us-central1");

export { app, db, auth, storage, functions };
