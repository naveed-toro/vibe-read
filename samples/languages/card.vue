<template>
  <!-- The card shows a price only once it has loaded. -->
  <div class="card">
    <a href="https://shop.example.com">Shop</a>
  </div>
</template>

<script setup>
// Prices come in cents, so 1999 is shown as 19.99.
const price = ref(0)
const pattern = "img/**/*.png" // glob, not a comment opener
const isUrl = /https?:\/\//
</script>

<style>
/* The card never grows past the screen on a phone. */
.card { max-width: 100%; }
</style>
