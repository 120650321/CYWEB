<script setup lang="ts">
import type { CaseItem } from "@/api";
import PlaceholderImage from "./PlaceholderImage.vue";

defineProps<{ item: CaseItem }>();
</script>

<template>
  <router-link :to="`/案例展示/${item.id}`" class="c-card">
    <div class="c-card__cover">
      <PlaceholderImage :src="item.cover" icon="award" height="100%" type="case" />
      <span v-if="item.category_name" class="c-card__cat">{{ item.category_name }}</span>
      <div class="c-card__overlay"></div>
    </div>
    <div class="c-card__body">
      <h3>{{ item.name }}</h3>
      <p>{{ item.intro }}</p>
      <div class="c-card__tags">
        <span v-for="t in (item.tags || []).slice(0, 3)" :key="t" class="tag">{{ t }}</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.c-card {
  display: block;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) var(--ease-out);
}

.c-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11,95,255,0.15);
}

.c-card__cover {
  position: relative;
  height: 210px;
  overflow: hidden;
}

.c-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(6,14,34,0.45), transparent 60%);
  opacity: 0;
  transition: opacity var(--duration-normal);
}

.c-card:hover .c-card__overlay {
  opacity: 1;
}

.c-card__cat {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(10, 22, 51, 0.78);
  backdrop-filter: blur(10px);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 999px;
  letter-spacing: 1px;
  border: 1px solid rgba(255,255,255,0.15);
  z-index: 2;
}

.c-card__body {
  padding: 20px 24px 22px;
  position: relative;
}

.c-card h3 {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 54px;
  transition: color var(--duration-fast);
  text-align: center;
}

.c-card:hover h3 {
  color: var(--brand-600);
}

.c-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 16px;
  min-height: 50px;
}

.c-card__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>