// Flujo de pago: Frontend → Firestore directo (plan Spark)
import { db } from "./firebase-config.js";
import {
  collection, addDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCart, clearCart } from "./cart.js";
import { enviarConfirmacionPedido } from "./email.js";

function buildPayload(cart, datosCliente, metodoPago) {
  return {
    items:         cart,
    total:         cart.reduce((s, i) => s + i.precio * i.cantidad, 0),
    clienteEmail:  datosCliente.email,
    clienteNombre: datosCliente.nombre,
    clienteTel:    datosCliente.telefono || "",
    metodoPago,
    estado:        metodoPago === "EFECTIVO" ? "PENDIENTE" : "ESPERANDO_PAGO",
    fecha:         serverTimestamp(),
    factura_url:   null,
  };
}

// ── Pago con tarjeta (BAC Credomatic) — requiere plan Blaze ──────────────────
export async function iniciarPago(datosCliente) {
  throw new Error("El pago con tarjeta requiere actualización del plan. Por favor elige Efectivo o Transferencia.");
}

// ── Pago en efectivo ─────────────────────────────────────────────────────────
export async function confirmarEfectivo(datosCliente) {
  const cart = getCart();
  if (!cart.length) throw new Error("El carrito está vacío");
  const ref = await addDoc(collection(db, "pedidos"), buildPayload(cart, datosCliente, "EFECTIVO"));
  clearCart();
  enviarConfirmacionPedido({
    email:      datosCliente.email,
    nombre:     datosCliente.nombre,
    pedidoId:   ref.id,
    metodoPago: "EFECTIVO",
  });
  window.location.href = `pedido.html?id=${ref.id}`;
}

// ── Pago por transferencia — devuelve pedidoId sin redirigir ─────────────────
export async function confirmarTransferencia(datosCliente) {
  const cart = getCart();
  if (!cart.length) throw new Error("El carrito está vacío");
  const ref = await addDoc(collection(db, "pedidos"), buildPayload(cart, datosCliente, "TRANSFERENCIA"));
  clearCart();
  enviarConfirmacionPedido({
    email:      datosCliente.email,
    nombre:     datosCliente.nombre,
    pedidoId:   ref.id,
    metodoPago: "TRANSFERENCIA",
  });
  return ref.id;
}

// ── Retorno desde BAC ────────────────────────────────────────────────────────
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
