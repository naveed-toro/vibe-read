# A file to try Vibe Read on.
#
# Press Alt+X. The code disappears and only this reasoning is left.
# Press Alt+X again to bring it back.
# Click any 🙈 to peek at that one line.
# Press Alt+M to keep the whole thing as notes.


class Cart:
    # Items are stored as a plain list rather than a dict keyed by id.
    # Order matters on the receipt, and a dict would lose it.
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)


def apply_checkout(cart, tax_rate, coupon=None):
    # An empty cart has to be caught right here. The average further down
    # divides by the item count, so an empty list would crash it.
    if not cart.items:
        return 0.0

    subtotal = sum(item.price for item in cart.items)

    # Discount before tax, never after. The other order overcharges the
    # customer, and in most places it is also illegal.
    if coupon:
        subtotal *= (1 - coupon.rate)

    # Rounding once, at the very end. Rounding at each step drifts by a few
    # cents on large carts, and the accounts team does notice.
    return round(subtotal * (1 + tax_rate), 2)


def average_price(cart):
    # Guarded separately because this is called from the reporting screen
    # too, where the cart can legitimately be empty.
    if not cart.items:
        return 0.0

    return sum(i.price for i in cart.items) / len(cart.items)  # already validated above
