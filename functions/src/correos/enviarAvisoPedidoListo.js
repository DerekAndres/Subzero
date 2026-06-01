// Cloud Function: avisa al cliente cuando su pedido está listo para retirar
// Escucha cualquier cambio de estado → LISTO (funciona desde app, web o Firebase Console)

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const sgMail    = require("@sendgrid/mail");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.enviarAvisoPedidoListo = functions.firestore
  .document("pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const antes   = change.before.data();
    const despues = change.after.data();

    // Solo actuar cuando el estado cambia A "LISTO" (no si ya estaba en LISTO)
    if (antes.estado === "LISTO" || despues.estado !== "LISTO") return;

    // Si no hay email no hay a quién notificar
    if (!despues.clienteEmail) return;

    // Idempotencia: no enviar dos veces
    if (despues.aviso_listo_enviado) return;

    const pedidoId = context.params.pedidoId;
    const numero   = "#" + pedidoId.slice(-6).toUpperCase();

    const msg = {
      to:   despues.clienteEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || "pedidos@subzero.com",
        name:  process.env.SENDGRID_FROM_NAME  || "Subzero Raspados",
      },
      subject: `¡Tu pedido ${numero} está listo! 🎉`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#FFF5F8;border-radius:16px;overflow:hidden;">
          <div style="background:#E8186D;padding:28px 32px;text-align:center;">
            <h1 style="color:white;font-size:28px;margin:0;letter-spacing:2px;">SUBZERO</h1>
            <p style="color:#FFB3D1;margin:6px 0 0;font-size:13px;">Raspados artesanales</p>
          </div>

          <div style="padding:32px;text-align:center;">
            <div style="font-size:64px;margin-bottom:12px;">🎉</div>

            <h2 style="color:#1C0D14;font-size:22px;margin:0 0 8px;">
              ${despues.clienteNombre ? `¡${despues.clienteNombre}, tu pedido está listo!` : "¡Tu pedido está listo!"}
            </h2>

            <p style="color:#8A6070;font-size:14px;margin:0 0 24px;line-height:1.6;">
              Tu Subzero ya está listo para retirar.<br>Acércate a la caja y muestra este número:
            </p>

            <div style="background:white;border:2px solid #E8186D;border-radius:16px;padding:20px 32px;display:inline-block;margin-bottom:24px;">
              <p style="color:#8A6070;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">Tu turno</p>
              <p style="color:#E8186D;font-size:48px;font-weight:900;letter-spacing:6px;margin:0;">${numero}</p>
            </div>

            <div style="background:#FFF0F6;border-radius:12px;padding:16px;margin-bottom:24px;text-align:left;">
              <p style="margin:0 0 6px;font-size:13px;color:#475569;">
                <strong>Total:</strong>
                <span style="color:#E8186D;font-weight:700;">₡${(despues.total || 0).toLocaleString()}</span>
              </p>
              <p style="margin:0;font-size:13px;color:#475569;">
                <strong>Método de pago:</strong> ${despues.metodoPago || ""}
              </p>
            </div>

            <p style="color:#8A6070;font-size:12px;margin:0;">
              ¡Gracias por elegirnos! 🧊
            </p>
          </div>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      await db.collection("pedidos").doc(pedidoId).update({ aviso_listo_enviado: true });
      console.log(`Aviso "listo" enviado a ${despues.clienteEmail} — pedido ${pedidoId}`);
    } catch (err) {
      console.error(`Error enviando aviso listo para pedido ${pedidoId}:`, err.message);
    }
  });
