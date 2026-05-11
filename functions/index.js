// Entry point — exporta todas las Cloud Functions
const { crearSesionPago, webhookBAC } = require("./src/pagos/bac");
const { onPedidoCreado }              = require("./src/facturas/generarPDF");
const { enviarFacturaPorCorreo }      = require("./src/correos/enviarEmail");

module.exports = {
  // BAC Credomatic
  crearSesionPago,    // HTTPS Callable: frontend → genera sesión de pago BAC
  webhookBAC,         // HTTPS trigger: BAC → confirma pago aprobado

  // Firestore triggers
  onPedidoCreado,     // Se dispara al crear doc en /pedidos → genera PDF

  // Email
  enviarFacturaPorCorreo, // Callable para reenviar factura manualmente
};
