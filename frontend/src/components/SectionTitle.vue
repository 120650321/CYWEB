<script setup lang="ts">
defineProps<{ tag?: string; title: string; desc?: string; dark?: boolean }>();
</script>

<template>
  <div class="sec-head" :class="{ 'sec-head--dark': dark }">
    <span class="sec-tag">{{ tag || "OUR SERVICES" }}</span>
    <h2>{{ title }}</h2>
    <p v-if="desc">{{ desc }}</p>
  </div>
</template>

<style scoped>
.sec-head {
  text-align: center;
  margin-bottom: 36px;
}

.sec-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--brand-600);
  background: rgba(11,95,255,0.08);
  border: 1px solid rgba(11,95,255,0.15);
  padding: 6px 16px;
  border-radius: 999px;
  margin-bottom: 16px;
  text-transform: uppercase;
}

.sec-head h2 {
  font-size: 36px;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: 1px;
  position: relative;
  display: inline-block;
}

.sec-head h2::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -8px;
  width: 48px;
  height: 3px;
  transform: translateX(-50%);
  background: var(--grad-cyan);
  border-radius: 2px;
}

.sec-head p {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 580px;
  margin: 16px auto 0;
  line-height: 1.8;
}

.sec-head--dark .sec-tag {
  color: var(--cyan-400);
  background: rgba(0, 200, 255, 0.1);
  border-color: rgba(0, 200, 255, 0.25);
}

.sec-head--dark h2 {
  color: #fff;
}

.sec-head--dark p {
  color: rgba(255,255,255,0.65);
}

@media (max-width: 768px) {
  .sec-head h2 {
    font-size: 28px;
  }
  .sec-head p {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .sec-head {
    margin-bottom: 24px;
  }
  .sec-head h2 {
    font-size: 24px;
  }
  .sec-head p {
    font-size: 13px;
  }
}
</style>