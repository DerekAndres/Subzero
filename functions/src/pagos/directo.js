const functions = require("firebase-functions");
const admin     = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Callable: crea pedido de efectivo o transferencia (sin gateway externo)
exports.crearPedidoDirecto = functions.https.onCall(async (data) => {
  const { items, total, clienteEmail, clienteNombre, clienteTel, metodoPago } = data;

  if (!items?.length || !total || !clienteEmail || !metodoPago) {
    throw new functions.https.HttpsError("invalid-argument", "Datos de pedido incompletos");
  }
  if (!["EFECTIVO", "TRANSFERENCIA"].includes(metodoPago)) {
    throw new functions.https.HttpsError("invalid-argument", "Método de pago no válido");
  }

  // Efectivo: confirmar de inmediato; transferencia: esperar comprobante del cliente
  const estado = metodoPago === "EFECTIVO" ? "PENDIENTE" : "ESPERANDO_PAGO";

  const pedidoRef = db.collection("pedidos").doc();
  await pedidoRef.set({
    items, total,
    clienteEmail, clienteNombre: clienteNombre || "", clienteTel: clienteTel || "",
    estado,
    metodoPago,
    fecha:       admin.firestore.FieldValue.serverTimestamp(),
    factura_url: null,
  });

  return { pedidoId: pedidoRef.id };
});
