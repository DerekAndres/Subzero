// Cloud Functions: emails de confirmación de pedido
//
// onNuevoPedido        — onCreate  → cualquier pedido nuevo (efectivo o transferencia)
// onTransferenciaConfirmada — onUpdate → admin confirma comprobante → pedido entra a cocina

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const sgMail    = require("@sendgrid/mail");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ─── Pedido recién creado (efectivo o transferencia) ────────────────────────
exports.onNuevoPedido = functions.firestore
  .document("pedidos/{pedidoId}")
  .onCreate(async (snap, context) => {
    const pedido    = snap.data();
    const pedidoId  = context.params.pedidoId;

    if (!pedido.clienteEmail) return;
    // Tarjeta (BAC) tiene su propio flujo de email via factura PDF
    if (!["EFECTIVO", "TRANSFERENCIA"].includes(pedido.metodoPago)) return;

    await enviarEmail(pedidoId, pedido, "nuevo");
  });

// ─── Admin confirma transferencia (ESPERANDO_PAGO → PENDIENTE) ─────────────
exports.onTransferenciaConfirmada = functions.firestore
  .document("pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const antes    = change.before.data();
    const despues  = change.after.data();
    const pedidoId = context.params.pedidoId;

    if (despues.metodoPago !== "TRANSFERENCIA") return;
    if (antes.estado !== "ESPERANDO_PAGO" || despues.estado !== "PENDIENTE") return;
    if (!despues.clienteEmail || despues.confirmacion_enviada) return;

    await enviarEmail(pedidoId, despues, "transferencia_confirmada");
    await db.collection("pedidos").doc(pedidoId).update({ confirmacion_enviada: true });
  });

// ─── Helper: construye y envía el email ─────────────────────────────────────
async function enviarEmail(pedidoId, pedido, tipo) {
  const codigo = pedidoId.slice(-6).toUpperCase();
  const nombre = pedido.clienteNombre || "Cliente";

  let subject, tituloBox, mensajeExtra, colorTop;

  if (tipo === "nuevo" && pedido.metodoPago === "EFECTIVO") {
    subject      = `¡Tu pedido Subzero está en cocina! #${codigo}`;
    colorTop     = "#E8186D";
    tituloBox    = "¡Pedido confirmado!";
    mensajeExtra = `Hola <strong>${nombre}</strong>, tu pedido ya entró a cocina y lo estamos preparando.
                    Muestra este número cuando vengas a retirar tu Subzero. 🧊`;
  } else if (tipo === "nuevo" && pedido.metodoPago === "TRANSFERENCIA") {
    subject      = `Pedido Subzero registrado — #${codigo}`;
    colorTop     = "#1C0D14";
    tituloBox    = "Pedido registrado";
    mensajeExtra = `Hola <strong>${nombre}</strong>, recibimos tu pedido.
                    Envíanos el comprobante de pago por WhatsApp al <strong>+504 3219-8769</strong>
                    y lo activaremos a la brevedad.`;
  } else {
    // transferencia_confirmada
    subject      = `¡Transferencia confirmada! Tu Subzero está en camino — #${codigo}`;
    colorTop     = "#16A34A";
    tituloBox    = "¡Transferencia confirmada!";
    mensajeExtra = `Hola <strong>${nombre}</strong>, recibimos tu comprobante.
                    Tu pedido ya entró a cocina. Te avisaremos cuando esté listo. 🎉`;
  }

  const metodoLabel = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia bancaria", TARJETA: "Tarjeta" }[pedido.metodoPago] || pedido.metodoPago;

  const msg = {
    to:   pedido.clienteEmail,
    from: {
      email: "pedidos@subzero.lat",
      name:  "Sub Zero",
    },
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FAF4ED;border-radius:16px;overflow:hidden;">
        <div style="background:${colorTop};padding:28px 32px;text-align:center;">
          <h1 style="color:white;font-size:26px;margin:0;letter-spacing:2px;">SUBZERO</h1>
          <p style="color:rgba(255,255,255,.75);margin:6px 0 0;font-size:13px;">Raspados artesanales</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#1C0D14;font-size:18px;margin:0 0 8px;">${tituloBox}</h2>
          <p style="color:#8A6070;font-size:14px;line-height:1.7;margin:0 0 24px;">${mensajeExtra}</p>

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
              <strong style="color:#E8186D;">Lps.${(pedido.total || 0).toLocaleString()}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#8A6070;">
              <span>Método de pago</span>
              <strong>${metodoLabel}</strong>
            </div>
          </div>

          <p style="color:#8A6070;font-size:12px;margin:0;text-align:center;">
            ¡Gracias por elegirnos! 🧊
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`[${tipo}] Email enviado a ${pedido.clienteEmail} — #${codigo}`);
  } catch (err) {
    console.error(`[${tipo}] Error enviando email para pedido ${pedidoId}:`, err.message);
  }
}
