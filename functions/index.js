// Entry point — exporta todas las Cloud Functions
const { crearSesionPago, webhookBAC }              = require("./src/pagos/bac");
const { crearPedidoDirecto }                       = require("./src/pagos/directo");
const { onPedidoCreado }                           = require("./src/facturas/generarPDF");
const { enviarFacturaPorCorreo }                   = require("./src/correos/enviarEmail");
const { onNuevoPedido, onTransferenciaConfirmada } = require("./src/correos/enviarConfirmacion");
const { enviarAvisoPedidoListo }                          = require("./src/correos/enviarAvisoPedidoListo");

module.exports = {
  // BAC Credomatic (pago con tarjeta)
  crearSesionPago,       // HTTPS Callable: frontend → genera sesión de pago BAC
  webhookBAC,            // HTTPS trigger: BAC → confirma pago aprobado

  // Pagos directos (efectivo / transferencia)
  crearPedidoDirecto,    // HTTPS Callable: crea pedido sin gateway externo

  // Firestore triggers — factura PDF (solo BAC)
  onPedidoCreado,        // estado → PENDIENTE → genera PDF de factura

  // Correos — factura (BAC)
  enviarFacturaPorCorreo,

  // Correos — confirmación de número de pedido (efectivo / transferencia)
  onNuevoPedido,               // onCreate: cualquier pedido nuevo → envía #pedido de inmediato
  onTransferenciaConfirmada,   // onUpdate: admin confirma transferencia → avisa que entró a cocina

  // Correos — aviso al cliente cuando el pedido está listo para retirar
  enviarAvisoPedidoListo,      // onUpdate: estado → LISTO → email al cliente
};
