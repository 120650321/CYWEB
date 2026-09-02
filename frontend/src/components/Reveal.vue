<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const props = defineProps<{ delay?: number | string; tag?: string }>();

const el = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (!el.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          observer?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  observer.observe(el.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <component
    :is="props.tag || 'div'"
    ref="el"
    class="reveal"
    :data-delay="String(props.delay ?? '')"
  >
    <slot />
  </component>
</template>
