<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ src?: string; alt?: string; icon?: string; height?: string; type?: "case" | "product" | "solution" | "download" | "news" }>();

const iconMap: Record<string, string> = {
  camera: "",
  chip: "🔲",
  layers: "📚",
  link: "🔗",
  doc: "",
  code: "</>",
  cpu: "🖥️",
  layout: "️",
  tool: "🛠️",
  headphones: "🎧",
  cloud: "☁️",
  eye: "👁️",
  signal: "",
  award: "🏆",
  shield: "🛡️",
  default: "◆",
};

const typeConfig: Record<string, { bg: string; icon: string; label: string; pattern?: string }> = {
  case: {
    bg: "linear-gradient(135deg, #0f2b4a 0%, #1a4a7a 50%, #0d3b66 100%)",
    icon: "🏆",
    label: "案例展示",
    pattern: "radial-gradient(circle at 20% 80%, rgba(0, 200, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(11, 95, 255, 0.2) 0%, transparent 40%)"
  },
  product: {
    bg: "linear-gradient(135deg, #1a0a3e 0%, #2d1b69 50%, #1a0a3e 100%)",
    icon: "🔗",
    label: "产品中心",
    pattern: "radial-gradient(circle at 70% 30%, rgba(138, 43, 226, 0.2) 0%, transparent 50%), radial-gradient(circle at 30% 70%, rgba(0, 200, 255, 0.15) 0%, transparent 40%)"
  },
  solution: {
    bg: "linear-gradient(135deg, #0a2e1a 0%, #1a5c3a 50%, #0d4a2a 100%)",
    icon: "️",
    label: "解决方案",
    pattern: "radial-gradient(circle at 50% 50%, rgba(0, 255, 136, 0.1) 0%, transparent 60%), radial-gradient(circle at 20% 20%, rgba(0, 200, 255, 0.15) 0%, transparent 40%)"
  },
  download: {
    bg: "linear-gradient(135deg, #2a1a0a 0%, #5c3a1a 50%, #3a2a0a 100%)",
    icon: "📄",
    label: "软件资料",
    pattern: "radial-gradient(circle at 80% 80%, rgba(255, 165, 0, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 30%, rgba(255, 200, 0, 0.1) 0%, transparent 40%)"
  },
  news: {
    bg: "linear-gradient(135deg, #1a0a0a 0%, #5c1a1a 50%, #3a0a0a 100%)",
    icon: "📰",
    label: "新闻资讯",
    pattern: "radial-gradient(circle at 30% 30%, rgba(255, 100, 100, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(255, 150, 50, 0.1) 0%, transparent 40%)"
  }
};

const showImg = computed(() => !!props.src);
const iconText = computed(() => iconMap[props.icon || "default"] || "◆");
const currentType = computed(() => props.type || "default");
const typeData = computed(() => typeConfig[currentType.value] || {
  bg: "linear-gradient(135deg, #0b1e3f, #16365f)",
  icon: iconText.value,
  label: "",
  pattern: "radial-gradient(circle at 30% 20%, rgba(0, 200, 255, 0.25), transparent 45%), radial-gradient(circle at 80% 90%, rgba(11, 95, 255, 0.35), transparent 50%)"
});
</script>

<template>
  <div class="ph" :style="{ height: height || 'auto' }">
    <img v-if="showImg" :src="src" :alt="alt || ''" loading="lazy" />
    <div v-else class="ph--fallback" :class="`ph--fallback--${currentType}`" aria-hidden="true">
      <span class="ph--icon">{{ typeData.icon }}</span>
      <span class="ph--label">{{ typeData.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.ph {
  position: relative;
  overflow: hidden;
  width: 100%;
}

.ph img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s var(--ease-out);
}

.ph:hover img {
  transform: scale(1.06);
}

.ph::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(6,14,34,0.25), transparent 50%);
  opacity: 0;
  transition: opacity var(--duration-normal);
  pointer-events: none;
  z-index: 1;
}

.ph:hover::after {
  opacity: 1;
}

.ph--fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 100%;
  position: relative;
}

.ph--fallback::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 32px 32px;
}

/* 默认类型 */
.ph--fallback--default {
  background:
    radial-gradient(circle at 30% 20%, rgba(0, 200, 255, 0.25), transparent 45%),
    radial-gradient(circle at 80% 90%, rgba(11, 95, 255, 0.35), transparent 50%),
    linear-gradient(135deg, #0b1e3f, #16365f);
}

/* 案例展示 */
.ph--fallback--case {
  background:
    radial-gradient(circle at 20% 80%, rgba(0, 200, 255, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(11, 95, 255, 0.2) 0%, transparent 40%),
    linear-gradient(135deg, #0f2b4a 0%, #1a4a7a 50%, #0d3b66 100%);
}

/* 产品中心 */
.ph--fallback--product {
  background:
    radial-gradient(circle at 70% 30%, rgba(138, 43, 226, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 30% 70%, rgba(0, 200, 255, 0.15) 0%, transparent 40%),
    linear-gradient(135deg, #1a0a3e 0%, #2d1b69 50%, #1a0a3e 100%);
}

/* 解决方案 */
.ph--fallback--solution {
  background:
    radial-gradient(circle at 50% 50%, rgba(0, 255, 136, 0.1) 0%, transparent 60%),
    radial-gradient(circle at 20% 20%, rgba(0, 200, 255, 0.15) 0%, transparent 40%),
    linear-gradient(135deg, #0a2e1a 0%, #1a5c3a 50%, #0d4a2a 100%);
}

/* 软件资料 */
.ph--fallback--download {
  background:
    radial-gradient(circle at 80% 80%, rgba(255, 165, 0, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 20% 30%, rgba(255, 200, 0, 0.1) 0%, transparent 40%),
    linear-gradient(135deg, #2a1a0a 0%, #5c3a1a 50%, #3a2a0a 100%);
}

/* 新闻资讯 */
.ph--fallback--news {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 100, 100, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 70% 70%, rgba(255, 150, 50, 0.1) 0%, transparent 40%),
    linear-gradient(135deg, #1a0a0a 0%, #5c1a1a 50%, #3a0a0a 100%);
}

.ph--icon {
  position: relative;
  font-size: 48px;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 0 30px rgba(0, 200, 255, 0.5);
  margin-bottom: 12px;
}

.ph--label {
  position: relative;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 2px;
  text-transform: uppercase;
}
</style>