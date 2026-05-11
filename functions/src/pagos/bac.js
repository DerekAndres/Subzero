// Cloud Function: integración BAC Credomatic eCommerce Gateway
// Documentación BAC: solicitar en onboarding de comercio electrónico BAC CR

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const axios     = require("axios");
const crypto    = require("crypto");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const BAC_CONFIG = {
  merchantId:  process.env.BAC_MERCHANT_ID,
  apiKey:      process.env.BAC_API_KEY,
  apiSecret:   process.env.BAC_API_SECRET,
  environment: process.env.BAC_ENVIRONMENT || "sandbox",
  webhookSecret: process.env.BAC_WEBHOOK_SECRET,
};

const BAC_BASE_URL = BAC_CONFIG.environment === "production"
  ? "https://credomatic.com/api/v2"
  : "https://sandbox.credomatic.com/api/v2";

// ─── Callable: Frontend llama esto para iniciar el pago ───
exports.crearSesionPago = functions.https.onCall(async (data, context) => {
  const { items, total, clienteEmail, clienteNombre, clienteTel } = data;

  if (!items?.length || !total || !clienteEmail) {
    throw new functions.https.HttpsError("invalid-argument", "Datos de pedido incompletos");
  }

  // Crear el registro del pedido en Firestore (estado: INICIANDO)
  const pedidoRef = db.collection("pedidos").doc();
  await pedidoRef.set({
    items, total,
    clienteEmail, clienteNombre, clienteTel,
    estado: "INICIANDO",
    fecha:  admin.firestore.FieldValue.serverTimestamp(),
    factura_url: null,
  });

  // Solicitar sesión de pago a BAC
  const payload = {
    merchant_id:  BAC_CONFIG.merchantId,
    amount:       total,
    currency:     "CRC",
    order_id:     pedidoRef.id,
    description:  `Pedido Subzero #${pedidoRef.id.slice(-6).toUpperCase()}`,
    customer_email: clienteEmail,
    success_url:  `${process.env.APP_URL}/confirmacion.html?estado=aprobado&pedidoId=${pedidoRef.id}`,
    cancel_url:   `${process.env.APP_URL}/carrito.html`,
    webhook_url:  `${process.env.APP_URL}/api/bac-webhook`,
  };

  const { data: bacResp } = await axios.post(`${BAC_BASE_URL}/sessions`, payload, {
    headers: { "X-Api-Key": BAC_CONFIG.apiKey, "Content-Type": "application/json" },
  });

  return { redirectUrl: bacResp.redirect_url, pedidoId: pedidoRef.id };
});

// ─── HTTPS trigger: BAC llama esto al confirmar el pago ───
exports.webhookBAC = functions.https.onRequest(async (req, res) => {
  // Verificar firma del webhook
  const signature = req.headers["x-bac-signature"];
  const expected  = crypto
    .createHmac("sha256", BAC_CONFIG.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (signature !== expected) {
    console.error("Webhook BAC: firma inválida");
    return res.status(401).send("Unauthorized");
  }

  const { order_id, status, transaction_id } = req.body;

  if (status === "approved") {
    await db.collection("pedidos").doc(order_id).update({
      estado:         "PENDIENTE",
      transaccion_id: transaction_id,
      pago_fecha:     admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Pedido ${order_id} aprobado. Transacción: ${transaction_id}`);
  } else {
    await db.collection("pedidos").doc(order_id).update({ estado: "CANCELADO" });
  }

  res.status(200).send("OK");
});
