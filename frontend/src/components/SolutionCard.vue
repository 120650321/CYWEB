<script setup lang="ts">
import type { Solution } from "@/api";
import PlaceholderImage from "./PlaceholderImage.vue";

defineProps<{ solution: Solution }>();
</script>

<template>
  <router-link :to="`/解决方案/${solution.id}`" class="s-card">
    <PlaceholderImage :src="solution.cover" icon="layout" type="solution" class="s-card__cover" height="180px" />
    <div class="s-card__body">
      <span class="s-card__ind">{{ solution.industry || "行业方案" }}</span>
      <h3>{{ solution.name }}</h3>
      <p>{{ solution.intro }}</p>
      <span class="s-card__more">查看方案 <i>→</i></span>
    </div>
  </router-link>
</template>

<style scoped>
.s-card {
  display: block;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) var(--ease-out);
}

.s-card:hover {
  transform: translateY(-10px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11,95,255,0.15);
}

.s-card__cover {
  height: 180px;
}

.s-card__body {
  padding: 20px 24px 22px;
  position: relative;
}

.s-card__ind {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-600);
  background: rgba(11, 95, 255, 0.08);
  border: 1px solid rgba(11, 95, 255, 0.16);
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: 14px;
  letter-spacing: 1px;
}

.s-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;
  transition: color var(--duration-fast);
}

.s-card:hover h3 {
  color: var(--brand-600);
}

.s-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 18px;
  min-height: 50px;
}

.s-card__more {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-600);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(11,95,255,0.06);
  transition: all var(--duration-fast);
}

.s-card__more i {
  transition: transform var(--duration-fast);
}

.s-card:hover .s-card__more {
  background: rgba(11,95,255,0.12);
}

.s-card:hover .s-card__more i {
  transform: translateX(5px);
}
</style>