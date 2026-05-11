// Flujo de pago: Frontend → Cloud Function → BAC Credomatic
import { functions } from "./firebase-config.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { getCart, clearCart } from "./cart.js";

const crearSesionPago = httpsCallable(functions, "crearSesionPago");

export async function iniciarPago(datosCliente) {
  const cart = getCart();
  if (!cart.length) throw new Error("El carrito está vacío");

  const payload = {
    items:         cart,
    total:         cart.reduce((s, i) => s + i.precio * i.cantidad, 0),
    clienteEmail:  datosCliente.email,
    clienteNombre: datosCliente.nombre,
    clienteTel:    datosCliente.telefono,
  };

  // Llama a la Cloud Function → crea sesión en BAC
  const { data } = await crearSesionPago(payload);

  // BAC devuelve una URL segura donde el cliente ingresa su tarjeta
  if (data.redirectUrl) {
    window.location.href = data.redirectUrl;
  } else {
    throw new Error("No se recibió URL de pago de BAC");
  }
}

// Llamado desde confirmacion.html después de que BAC redirige de vuelta
export function manejarRetornoPago() {
  const params   = new URLSearchParams(window.location.search);
  const estado   = params.get("estado");
  const pedidoId = params.get("pedidoId");

  if (estado === "aprobado") {
    clearCart();
    return { exito: true, pedidoId };
  }
  return { exito: false, motivo: params.get("motivo") || "Pago rechazado" };
}
