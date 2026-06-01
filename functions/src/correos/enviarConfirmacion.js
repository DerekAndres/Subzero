// Cloud Function: envía número de pedido al cliente para pagos en efectivo y transferencia

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const sgMail    = require("@sendgrid/mail");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Pedido nuevo en efectivo → enviar número de orden de inmediato
exports.onNuevoPedidoEfectivo = functions.firestore
  .document("pedidos/{pedidoId}")
  .onCreate(async (snap, context) => {
    const pedido = snap.data();
    const { pedidoId } = context.params;

    if (pedido.metodoPago !== "EFECTIVO" || pedido.estado !== "PENDIENTE") return;
    if (!pedido.clienteEmail) return;

    await enviarConfirmacion(pedidoId, pedido);
  });

// Admin confirma transferencia (ESPERANDO_PAGO → PENDIENTE) → enviar número de orden
exports.onTransferenciaConfirmada = functions.firestore
  .document("pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const antes   = change.before.data();
    const despues = change.after.data();
    const { pedidoId } = context.params;

    if (despues.metodoPago !== "TRANSFERENCIA") return;
    if (antes.estado !== "ESPERANDO_PAGO" || despues.estado !== "PENDIENTE") return;
    if (!despues.clienteEmail || despues.confirmacion_enviada) return;

    await enviarConfirmacion(pedidoId, despues);
    await db.collection("pedidos").doc(pedidoId).update({ confirmacion_enviada: true });
  });

async function enviarConfirmacion(pedidoId, pedido) {
  const codigo = pedidoId.slice(-6).toUpperCase();
  const metodoLabel = pedido.metodoPago === "EFECTIVO" ? "Efectivo" : "Transferencia bancaria";

  const msg = {
    to:   pedido.clienteEmail,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || "pedidos@subzero.com",
      name:  process.env.SENDGRID_FROM_NAME  || "Subzero Raspados",
    },
    subject: `Tu pedido Subzero — #${codigo}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAF4ED;border-radius:16px;overflow:hidden;">
        <div style="background:#E8186D;padding:28px 32px;text-align:center;">
          <h1 style="color:white;font-size:26px;margin:0;">SUBZERO</h1>
          <p style="color:rgba(255,255,255,.75);margin:6px 0 0;font-size:13px;">Raspados artesanales</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1C0D14;font-size:18px;margin:0 0 8px;">¡Pedido confirmado!</h2>
          <p style="color:#8A6070;font-size:14px;line-height:1.65;margin:0 0 24px;">
            Hola <strong>${pedido.clienteNombre || ""}</strong>,
            tu pedido ha sido registrado. Muestra este número al retirar tu raspado.
          </p>

          <div style="background:white;border:2px solid #EDE0D5;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px;">
            <p style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#8A6070;margin:0 0 8px;">
              Número de pedido
            </p>
            <p style="font-size:52px;font-weight:900;color:#E8186D;letter-spacing:8px;margin:0;line-height:1;">
              #${codigo}
            </p>
          </div>

          <div style="background:white;border:1px solid #EDE0D5;border-radius:12px;padding:18px;margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#8A6070;margin-bottom:8px;">
              <span>Total</span>
              <strong style="color:#E8186D;">₡${(pedido.total || 0).toLocaleString()}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#8A6070;">
              <span>Método de pago</span>
              <strong>${metodoLabel}</strong>
            </div>
          </div>

          <p style="color:#8A6070;font-size:12px;margin:0;text-align:center;">
            ¡Gracias por elegirnos! Prepararemos tu Subzero con mucho amor. 🧊
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Confirmación enviada a ${pedido.clienteEmail} — #${codigo}`);
  } catch (err) {
    console.error(`Error enviando confirmación para pedido ${pedidoId}:`, err.message);
  }
}
