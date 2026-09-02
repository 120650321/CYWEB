<script setup lang="ts">
import type { Download } from "@/api";

const props = defineProps<{ item: Download }>();

const iconMap: Record<string, string> = {
  doc: "📄",
  camera: "📷",
  chip: "🔲",
  code: "💻",
  default: "📦",
};

const icon = () => iconMap[props.item.icon] || iconMap.default;
</script>

<template>
  <router-link :to="`/软件资料/${item.id}`" class="d-card">
    <div class="d-card__icon">
      <span>{{ icon() }}</span>
    </div>
    <div class="d-card__body">
      <div class="d-card__top">
        <span v-if="item.category_name" class="tag">{{ item.category_name }}</span>
        <span class="d-card__ver" v-if="item.version">v{{ item.version }}</span>
      </div>
      <h3>{{ item.name }}</h3>
      <p>{{ item.intro }}</p>
      <div class="d-card__meta">
        <span class="d-card__size">📦 {{ item.size }}</span>
        <span class="num d-card__count">下载 {{ item.download_count }}</span>
      </div>
    </div>
    <div class="d-card__arrow">↓</div>
  </router-link>
</template>

<style scoped>
.d-card {
  display: flex;
  align-items: stretch;
  gap: 16px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 20px 22px;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.d-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--grad-brand);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform var(--duration-normal) var(--ease-out);
}

.d-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11,95,255,0.15);
}

.d-card:hover::before {
  transform: scaleY(1);
}

.d-card__icon {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.1), rgba(0, 200, 255, 0.12));
  border: 1px solid rgba(11, 95, 255, 0.14);
  transition: transform var(--duration-fast);
}

.d-card:hover .d-card__icon {
  transform: scale(1.08);
}

.d-card__body {
  flex: 1;
  min-width: 0;
}

.d-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.d-card__ver {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: var(--font-num);
  font-weight: 600;
}

.d-card h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--duration-fast);
}

.d-card:hover h3 {
  color: var(--brand-600);
}

.d-card p {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10px;
}

.d-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.d-card__count {
  font-weight: 600;
  color: var(--brand-600);
}

.d-card__arrow {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(11,95,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-600);
  font-weight: 700;
  font-size: 14px;
  opacity: 0;
  transition: all var(--duration-fast);
}

.d-card:hover .d-card__arrow {
  opacity: 1;
  right: 16px;
}
</style>