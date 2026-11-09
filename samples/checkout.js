import { api, track, sendReceipt } from './services';

export async function payNow(cart, customer, button) {
  // Lock the button the moment it is tapped.
  // A double tap would otherwise charge the card twice.
  button.disabled = true;
  button.textContent = 'Paying…';

  // Prices stay in whole cents. In decimals, 0.10 + 0.20 is not 0.30.
  const items = cart.items.filter(item => item.quantity > 0);
  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  // Discount before tax, never after. The other order overcharges the customer.
  const discounted = applyCoupon(subtotal, cart.coupon);
  const total = discounted + Math.round(discounted * customer.region.taxRate);

  // One key per checkout. If the network drops and we retry,
  // the bank sees the same key and nobody is charged twice.
  const key = `${cart.id}-${cart.updatedAt}`;

  try {
    const result = await api.post('/charges', { amount: total, customer: customer.id },
      { headers: { 'Idempotency-Key': key }, retries: 3 });

    // The receipt is sent after the page moves on,
    // so a slow mail server never makes paying feel slow.
    queueMicrotask(() => sendReceipt(customer.email, result.receiptId));
    track('checkout_paid', { total });
    window.location.assign(`/thanks/${result.orderId}`);
  } catch (error) {
    // Unlock the button so the customer can try again,
    // and tell them in plain words that no money was taken.
    button.disabled = false;
    button.textContent = 'Pay now';
    showError(plainWords(error));
  }
}

// An expired coupon is ignored quietly, not shown as an error.
// The customer still wants to pay; blocking them loses the sale.
function applyCoupon(subtotalCents, coupon) {
  if (!coupon || coupon.expiresAt < Date.now()) return subtotalCents;
  const off = coupon.type === 'percent'
    ? Math.round(subtotalCents * coupon.value / 100)
    : coupon.valueCents;
  return Math.max(subtotalCents - off, 0);
}

// The bank answers in codes like "card_declined".
// Each one gets a sentence a customer can act on.
function plainWords(error) {
  const messages = {
    card_declined: 'Your bank said no. Try another card.',
    insufficient_funds: 'Not enough money on this card.',
    network: 'Connection lost. You were not charged.',
  };
  return messages[error?.code] ?? 'Something went wrong. You were not charged.';
}

function showError(message) {
  const box = document.querySelector('#checkout-error');
  box.textContent = message;
  box.hidden = false;
}
