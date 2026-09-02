<script setup lang="ts">
import type { Article } from "@/api";
import PlaceholderImage from "./PlaceholderImage.vue";

const props = defineProps<{ item: Article }>();

const catLabel: Record<string, string> = {
  company: "企业动态",
  news: "行业资讯",
  tech: "技术分享",
};
</script>

<template>
  <article class="a-card">
    <router-link :to="`/新闻资讯/${item.id}`" class="a-card__link">
      <div class="a-card__head">
        <span class="tag">{{ catLabel[item.category] || "新闻资讯" }}</span>
        <span v-if="item.is_top === 1" class="a-card__top">置顶</span>
      </div>
      <h3>{{ item.title }}</h3>
      <p>{{ item.summary }}</p>
    </router-link>
    <div class="a-card__meta">
      <span class="a-card__date">{{ item.publish_time?.slice(0, 10) }}</span>
      <span class="a-card__views">👁 {{ item.views }}</span>
    </div>
  </article>
</template>

<style scoped>
.a-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 22px 24px;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) var(--ease-out);
  height: 100%;
  position: relative;
  overflow: hidden;
}

.a-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-brand);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-normal) var(--ease-out);
}

.a-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11,95,255,0.15);
}

.a-card:hover::before {
  transform: scaleX(1);
}

.a-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.a-card__top {
  font-size: 11px;
  color: #fff;
  background: var(--grad-cyan);
  padding: 3px 10px;
  border-radius: 5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0,200,255,0.25);
}

.a-card h3 {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.6;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 51px;
  transition: color var(--duration-fast);
}

.a-card:hover h3 {
  color: var(--brand-600);
}

.a-card p {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.a-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border-light);
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.a-card__date {
  color: var(--text-tertiary);
}

.a-card__views {
  color: var(--text-tertiary);
}
</style>