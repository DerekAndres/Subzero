// Gestión del carrito — persiste en localStorage
const CART_KEY = "subzero_cart";

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }));
}

export function addItem(item) {
  const cart = getCart();
  cart.push({ ...item, id: Date.now(), cantidad: 1 });
  saveCart(cart);
}

export function removeItem(id) {
  saveCart(getCart().filter(i => i.id !== id));
}

export function clearCart() {
  saveCart([]);
}

export function getTotal() {
  return getCart().reduce((sum, i) => sum + i.precio * i.cantidad, 0);
}

export function getCount() {
  return getCart().reduce((sum, i) => sum + i.cantidad, 0);
}
