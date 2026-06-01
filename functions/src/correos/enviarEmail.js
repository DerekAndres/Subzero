// Cloud Function: envía factura por correo via SendGrid con reintentos
// Escucha cuando el pedido recibe su factura_url (Firestore trigger)

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const sgMail    = require("@sendgrid/mail");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const MAX_REINTENTOS = 3;

// Disparo automático cuando se actualiza factura_url en el pedido
exports.enviarFacturaPorCorreo = functions.firestore
  .document("pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const antes  = change.before.data();
    const despues = change.after.data();

    // Solo actuar cuando se agrega factura_url por primera vez
    if (antes.factura_url || !despues.factura_url) return;
    if (!despues.clienteEmail) return;

    await enviarConReintentos(context.params.pedidoId, despues);
  });

async function enviarConReintentos(pedidoId, pedido, intento = 1) {
  const msg = {
    to:   pedido.clienteEmail,
    from: {
      email: "pedidos@subzero.lat",
      name:  "Sub Zero",
    },
    subject: `Tu factura Subzero — Pedido #${pedidoId.slice(-6).toUpperCase()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#F6FEFF;border-radius:16px;overflow:hidden;">
        <div style="background:#0F172A;padding:28px 32px;text-align:center;">
          <h1 style="color:white;font-size:26px;margin:0;">SUBZERO</h1>
          <p style="color:#94A3B8;margin:6px 0 0;font-size:13px;">Raspados artesanales</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#0F172A;font-size:18px;margin:0 0 16px;">¡Pedido confirmado!</h2>
          <p style="color:#475569;font-size:14px;line-height:1.65;">Hola <strong>${pedido.clienteNombre || ""}</strong>, tu pago fue aprobado. Adjuntamos tu factura.</p>
          <div style="background:white;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin:20px 0;">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:8px;">
              <span>Pedido</span><strong>#${pedidoId.slice(-6).toUpperCase()}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:8px;">
              <span>Total</span><strong style="color:#00ACC1;">Lps.${(pedido.total||0).toLocaleString()}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#475569;">
              <span>Estado</span><strong style="color:#F59E0B;">En preparación</strong>
            </div>
          </div>
          <a href="${pedido.factura_url}" style="display:inline-block;background:#00BCD4;color:white;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;font-size:14px;">Descargar factura PDF</a>
          <p style="color:#94A3B8;font-size:12px;margin-top:24px;">Te avisaremos cuando tu raspado esté listo. ¡Gracias por elegirnos!</p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    await db.collection("pedidos").doc(pedidoId).update({ correo_enviado: true });
    console.log(`Correo enviado a ${pedido.clienteEmail} (intento ${intento})`);
  } catch (err) {
    console.error(`Error SendGrid intento ${intento}:`, err.message);
    if (intento < MAX_REINTENTOS) {
      await new Promise(r => setTimeout(r, 2000 * intento));
      return enviarConReintentos(pedidoId, pedido, intento + 1);
    }
    console.error(`Falló envío de correo para pedido ${pedidoId} después de ${MAX_REINTENTOS} intentos`);
  }
}
