// Supabase Edge Function — confirmación automática de cobros (opcional, producción).
//
// Cuándo usar esto:
//   El toggle "Modo de cobro = Automático" del panel ya marca la venta como
//   "Cobrado" cuando el huésped paga (optimista). Para una confirmación VERIFICADA
//   (que el dinero se acreditó de verdad), conectá tu proveedor de pago a esta
//   función como webhook. Cuando llega el evento de pago aprobado, marcamos la
//   venta correspondiente como "Cobrado".
//
// Cómo desplegar:
//   1) supabase functions deploy payment-webhook --no-verify-jwt
//   2) Configurá los secrets:
//        supabase secrets set SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...
//      (y la firma del proveedor, ver más abajo)
//   3) En Stripe: creá la Checkout Session con metadata.sale_id = <id de la venta>
//      y apuntá el webhook a la URL de esta función.
//      En Mercado Pago: usá external_reference = <id de la venta> y configurá el webhook.
//
// IMPORTANTE (seguridad): en producción verificá la firma del webhook
// (Stripe-Signature / x-signature de Mercado Pago) antes de confiar en el evento.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const event = await req.json();

    // id de la venta (sale) según el proveedor:
    const saleId =
      event?.data?.object?.metadata?.sale_id ?? // Stripe Checkout
      event?.metadata?.sale_id ?? // Stripe PaymentIntent
      event?.external_reference ?? // Mercado Pago
      null;

    // ¿El pago fue aprobado?
    const paid =
      event?.type === 'checkout.session.completed' ||
      event?.type === 'payment_intent.succeeded' ||
      event?.status === 'approved';

    if (saleId && paid) {
      const { error } = await supabase
        .from('sales')
        .update({ status: 'Cobrado' })
        .eq('id', saleId);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 400 });
  }
});
