<script setup lang="ts">
import type { Product } from "@/api";
import PlaceholderImage from "./PlaceholderImage.vue";

defineProps<{ product: Product }>();
</script>

<template>
  <router-link :to="`/产品中心/${product.id}`" class="p-card">
    <PlaceholderImage :src="product.cover" :icon="'link'" type="product" class="p-card__cover" height="210px" />
    <div class="p-card__body">
      <span v-if="product.category_name" class="tag">{{ product.category_name }}</span>
      <h3>{{ product.name }}</h3>
      <p class="p-card__model" v-if="product.model">型号：{{ product.model }}</p>
      <p class="p-card__intro">{{ product.intro }}</p>
      <span class="p-card__more">了解详情 <i>→</i></span>
    </div>
  </router-link>
</template>

<style scoped>
.p-card {
  display: block;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  overflow: hidden;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out);
}

.p-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11,95,255,0.15);
}

.p-card__cover {
  height: 210px;
}

.p-card__body {
  padding: 20px 24px 22px;
}

.p-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 10px 0 4px;
  transition: color var(--duration-fast);
}

.p-card:hover h3 {
  color: var(--brand-600);
  text-shadow: 0 0 1px rgba(11,95,255,0.1);
}

.p-card__model {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-num);
  margin-bottom: 10px;
}

.p-card__intro {
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

.p-card__more {
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

.p-card__more i {
  transition: transform var(--duration-fast);
}

.p-card:hover .p-card__more {
  background: rgba(11,95,255,0.12);
}

.p-card:hover .p-card__more i {
  transform: translateX(5px);
}
</style>