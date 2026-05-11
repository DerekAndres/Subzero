// Carga productos y extras desde Firestore en tiempo real
import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Escucha la colección "productos" en tiempo real
export function escucharProductos(callback) {
  const q = query(
    collection(db, "productos"),
    where("activo", "==", true),
    orderBy("orden")
  );
  return onSnapshot(q, snap => {
    const productos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(productos);
  });
}

// Escucha la colección "extras" (sabores, gomitas, toppings)
export function escucharExtras(categoria, callback) {
  const q = query(
    collection(db, "extras"),
    where("categoria", "==", categoria),
    where("activo", "==", true)
  );
  return onSnapshot(q, snap => {
    const extras = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(extras);
  });
}
