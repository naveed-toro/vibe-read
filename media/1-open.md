Any code file will do, in any language. The only thing that matters is that
something in it explains itself.

```python
# The discount comes off before tax. The other order overcharges
# the customer, and in most places it is also illegal.
if coupon:
    subtotal *= (1 - coupon.rate)
```

If your AI wrote the file without comments, ask it again and add four words:
**"and comment your reasoning."**
