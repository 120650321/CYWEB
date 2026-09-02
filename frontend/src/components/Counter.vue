<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps<{ value: number; duration?: number }>();

const root = ref<HTMLElement | null>(null);
const display = ref(0);
let raf = 0;
let observer: IntersectionObserver | null = null;
let done = false;

function animate() {
  if (done) return;
  done = true;
  const start = performance.now();
  const dur = props.duration || 1600;
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    display.value = Math.round(props.value * eased);
    if (p < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

onMounted(() => {
  if (!root.value) return animate();
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animate();
          observer?.disconnect();
        }
      });
    },
    { threshold: 0.4 }
  );
  observer.observe(root.value);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  observer?.disconnect();
});
</script>

<template>
  <span ref="root" class="num counter">{{ display }}</span>
</template>

<style scoped>
.counter {
  display: inline-block;
  transition: all 0.3s var(--ease-out);
}
</style>