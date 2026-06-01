import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFunctions }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAj1eqG_xXas4D_qnzTz0bg4nNab3Hw1FE",
  authDomain:        "subzero-2d5eb.firebaseapp.com",
  projectId:         "subzero-2d5eb",
  storageBucket:     "subzero-2d5eb.firebasestorage.app",
  messagingSenderId: "176425253179",
  appId:             "1:176425253179:web:5993e10e84268d66d15f1e",
};

const app = initializeApp(firebaseConfig);

export const db        = getFirestore(app);
export const auth      = getAuth(app);
export const functions = getFunctions(app, 'us-central1');
export const storage   = getStorage(app);
