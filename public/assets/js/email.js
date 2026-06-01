// ── EmailJS — envío de correos sin backend ────────────────────────────────────
// Reemplaza estos tres valores con los de tu cuenta en emailjs.com
const EMAILJS_PUBLIC_KEY  = 'TU_PUBLIC_KEY_AQUI';
const EMAILJS_SERVICE_ID  = 'TU_SERVICE_ID_AQUI';
const EMAILJS_TEMPLATE_ID = 'TU_TEMPLATE_ID_AQUI';

/**
 * Envía el correo de confirmación al cliente.
 * Si las credenciales no están configuradas, falla silenciosamente.
 */
export async function enviarConfirmacionPedido({ email, nombre, pedidoId, metodoPago }) {
  if (
    !EMAILJS_PUBLIC_KEY ||
    EMAILJS_PUBLIC_KEY === 'TU_PUBLIC_KEY_AQUI' ||
    !email
  ) return;

  const numero  = '#' + pedidoId.slice(-6).toUpperCase();
  const esTransf = metodoPago === 'TRANSFERENCIA';
  const mensaje = esTransf
    ? 'Envíanos el comprobante de pago por WhatsApp al +504 3219-8769 y lo activamos a la brevedad.'
    : '¡Tu pedido ya entró a cocina y lo estamos preparando!';

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id:     EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email:     email,
          to_name:      nombre || 'Cliente',
          order_number: numero,
          metodo_pago:  esTransf ? 'Transferencia bancaria' : 'Efectivo',
          mensaje,
        },
      }),
    });
    if (!res.ok) console.warn('EmailJS respondió con', res.status);
  } catch (e) {
    console.warn('No se pudo enviar el correo:', e);
  }
}
