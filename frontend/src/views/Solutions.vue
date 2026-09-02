<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api, type Solution } from "@/api";
import PageHero from "@/components/PageHero.vue";
import Reveal from "@/components/Reveal.vue";
import PlaceholderImage from "@/components/PlaceholderImage.vue";

const solutions = ref<Solution[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    solutions.value = await api.solutions();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <PageHero title="解决方案" sub="面向行业场景深度定制的智慧化整体方案，助力客户数字化转型升级" />

    <section class="section">
      <div class="container">
        <div v-if="loading" class="sol-list">
          <div v-for="i in 3" :key="i" class="skeleton" style="height: 260px"></div>
        </div>

        <template v-else>
          <article
            v-for="(s, idx) in solutions"
            :key="s.id"
            class="sol-row"
            :class="{ 'sol-row--reverse': idx % 2 === 1 }"
          >
            <Reveal class="sol-row__media">
              <PlaceholderImage :src="s.cover" icon="layout" height="100%" type="solution" class="sol-row__img" />
            </Reveal>
            <Reveal :delay="1" class="sol-row__body">
              <span class="sol-row__ind">{{ s.industry }}</span>
              <h2>{{ s.name }}</h2>
              <p class="sol-row__intro">{{ s.intro }}</p>
              <ul class="sol-row__points">
                <li v-for="(v, i) in (s.value_points || []).slice(0, 3)" :key="i">{{ v }}</li>
              </ul>
              <router-link :to="`/解决方案/${s.id}`" class="btn btn--primary">查看方案详情 →</router-link>
            </Reveal>
          </article>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sol-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.sol-row {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 48px;
  align-items: center;
  padding: 40px 0;
  transition: padding var(--duration-normal) var(--ease-out);
}

.sol-row + .sol-row {
  border-top: 1px solid var(--border-light);
}

.sol-row--reverse .sol-row__media {
  order: 2;
}

.sol-row__media {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  min-height: 320px;
  position: relative;
  transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out);
}

.sol-row__media:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.sol-row__ind {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-600);
  background: rgba(11, 95, 255, 0.08);
  border: 1px solid rgba(11, 95, 255, 0.16);
  padding: 5px 16px;
  border-radius: 999px;
  letter-spacing: 1px;
  margin-bottom: 16px;
  transition: all var(--duration-fast);
}

.sol-row:hover .sol-row__ind {
  background: rgba(11, 95, 255, 0.12);
  border-color: rgba(11, 95, 255, 0.25);
}

.sol-row h2 {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 14px;
  transition: color var(--duration-fast);
}

.sol-row:hover h2 {
  background: linear-gradient(120deg, var(--navy-800), var(--brand-600));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sol-row__intro {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 2;
  margin-bottom: 20px;
}

.sol-row__points {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 28px;
}

.sol-row__points li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.sol-row__points li::before {
  content: "✓";
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(11, 95, 255, 0.1);
  color: var(--brand-600);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--duration-fast);
}

.sol-row:hover .sol-row__points li::before {
  background: var(--grad-brand);
  color: #fff;
}

@media (max-width: 900px) {
  .sol-row,
  .sol-row--reverse {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .sol-row--reverse .sol-row__media {
    order: 0;
  }
  .sol-row__points {
    grid-template-columns: 1fr;
  }
}
</style>