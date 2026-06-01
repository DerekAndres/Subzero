// Cloud Function: genera factura PDF al crearse un pedido en Firestore
// Usa jsPDF + Firebase Storage. Disparo: onCreate en /pedidos/{pedidoId}

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const { jsPDF } = require("jspdf");

if (!admin.apps.length) admin.initializeApp();
const db      = admin.firestore();
const storage = admin.storage();

exports.onPedidoCreado = functions.firestore
  .document("pedidos/{pedidoId}")
  .onUpdate(async (change, context) => {
    const antes  = change.before.data();
    const despues = change.after.data();
    const { pedidoId } = context.params;

    // Solo actuar cuando el estado cambia a PENDIENTE (pago aprobado)
    if (antes.estado === despues.estado || despues.estado !== "PENDIENTE") return;
    if (despues.factura_url) return; // ya generada
    // PDF solo para pagos con tarjeta/BAC; efectivo y transferencia reciben solo el número de orden
    if (despues.metodoPago === "EFECTIVO" || despues.metodoPago === "TRANSFERENCIA") return;

    const pedido = despues;

    // ─── Generar PDF ──────────────────────────────────────
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const margen = 20;
    let y = margen;

    pdf.setFontSize(24); pdf.setFont("helvetica", "bold");
    pdf.text("SUBZERO Raspados", margen, y); y += 10;

    pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
    pdf.text("Factura electrónica", margen, y); y += 6;
    pdf.text(`Pedido: #${pedidoId.slice(-6).toUpperCase()}`, margen, y); y += 6;
    pdf.text(`Fecha: ${new Date().toLocaleDateString("es-CR")}`, margen, y); y += 6;
    pdf.text(`Cliente: ${pedido.clienteNombre || pedido.clienteEmail}`, margen, y); y += 6;
    pdf.text(`Correo: ${pedido.clienteEmail}`, margen, y); y += 12;

    pdf.setFont("helvetica", "bold");
    pdf.text("Detalle del pedido", margen, y); y += 6;
    pdf.setFont("helvetica", "normal");

    (pedido.items || []).forEach(item => {
      pdf.text(`• ${item.nombre}${item.meta ? " — " + item.meta : ""}`, margen + 4, y);
      pdf.text(`₡${item.precio.toLocaleString()}`, 180, y, { align: "right" });
      y += 6;
    });

    y += 4;
    pdf.setFont("helvetica", "bold");
    pdf.text("TOTAL:", margen, y);
    pdf.text(`₡${(pedido.total || 0).toLocaleString()}`, 180, y, { align: "right" });

    pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
    pdf.text("Gracias por tu compra. Subzero — hecho con amor y mucho hielo.", margen, 280);

    // ─── Subir a Firebase Storage ─────────────────────────
    const buffer   = Buffer.from(pdf.output("arraybuffer"));
    const bucket   = storage.bucket();
    const filePath = `facturas/${pedidoId}.pdf`;
    const file     = bucket.file(filePath);

    await file.save(buffer, {
      metadata: { contentType: "application/pdf" },
    });
    await file.makePublic();

    const facturaUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // ─── Actualizar pedido con URL de factura ─────────────
    await db.collection("pedidos").doc(pedidoId).update({ factura_url: facturaUrl });

    console.log(`Factura generada: ${facturaUrl}`);
    return facturaUrl;
  });
