Before:

```python
if not cart.items:
    return 0.0

# Discount before tax. The other order overcharges the customer.
if coupon:
    subtotal *= (1 - coupon.rate)

# Round once, at the end. Rounding at each step drifts by a few cents.
return round(subtotal * (1 + tax_rate), 2)
```

After `Alt+X`:

```python
🙈
🙈

# Discount before tax. The other order overcharges the customer.
🙈
🙈

# Round once, at the end. Rounding at each step drifts by a few cents.
🙈
```

Thirty seconds, and you know what it did and why.

Nothing has been edited. `Alt+X` again and every line is back exactly as it was.
