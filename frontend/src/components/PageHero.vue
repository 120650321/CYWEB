<script setup lang="ts">
defineProps<{ title: string; sub?: string }>();
</script>

<template>
  <section class="page-hero">
    <div class="container">
      <h1>{{ title }}</h1>
      <p v-if="sub" class="sub">{{ sub }}</p>
    </div>
  </section>
</template>

<style scoped>
.page-hero {
  background: var(--grad-hero);
  position: relative;
  padding: 120px 0 48px;
  text-align: center;
  overflow: hidden;
}

.page-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--grad-hero-mesh);
  pointer-events: none;
}

.page-hero::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent);
}

.page-hero h1 {
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12px;
  letter-spacing: 2px;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 20px rgba(0,0,0,0.3);
}

.page-hero .sub {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.65);
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .page-hero {
    padding: 100px 0 40px;
  }
  .page-hero h1 {
    font-size: 30px;
  }
  .page-hero .sub {
    font-size: 15px;
  }
}
</style>