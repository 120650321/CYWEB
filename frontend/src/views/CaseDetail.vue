<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api, type CaseItem } from "@/api";
import { useDetailPage } from "@/composables/useDetailPage";
import PageHero from "@/components/PageHero.vue";
import SectionTitle from "@/components/SectionTitle.vue";
import Reveal from "@/components/Reveal.vue";
import PlaceholderImage from "@/components/PlaceholderImage.vue";

const { data: item, loading, notFound } = useDetailPage<CaseItem>(
  (id) => api.caseDetail(id)
);

const allCases = ref<CaseItem[]>([]);

onMounted(async () => {
  try {
    const data = await api.cases({ page: 1, size: 12 });
    allCases.value = data.list;
  } catch {
    // 静默失败
  }
});
</script>

<template>
  <div>
    <PageHero :title="item?.name || '案例详情'" :sub="item?.intro" />

    <section class="section">
      <div class="container">
        <div v-if="loading" class="cd-loading">
          <div class="skeleton" style="height: 320px"></div>
          <div class="skeleton" style="height: 160px; margin-top: 24px"></div>
        </div>

        <div v-else-if="notFound" class="empty">
          <div class="empty-icon">⚠️</div>
          <p>案例不存在</p>
        </div>

        <template v-else-if="item">
          <div class="cd-layout">
            <div class="cd-main">
              <Reveal>
                <PlaceholderImage :src="item.cover" icon="award" height="400px" type="case" class="cd-cover" />
              </Reveal>

              <Reveal>
                <div class="cd-block">
                  <h2>项目概况</h2>
                  <div class="cd-text" v-html="(item.detail || '').replace(/\n/g, '<br/>')"></div>
                </div>
              </Reveal>
            </div>

            <aside class="cd-side">
              <Reveal delay="1">
                <div class="cd-block">
                  <h2>项目信息</h2>
                  <ul class="cd-meta">
                    <li><span>所属分类</span><span class="tag">{{ item.category_name }}</span></li>
                    <li><span>项目名称</span><span>{{ item.name }}</span></li>
                  </ul>
                </div>
              </Reveal>

              <Reveal v-if="item.tags && item.tags.length" delay="1">
                <div class="cd-block">
                  <h2>项目标签</h2>
                  <div class="cd-tags">
                    <span v-for="t in item.tags" :key="t" class="tag">{{ t }}</span>
                  </div>
                </div>
              </Reveal>

              <Reveal v-if="item.results && item.results.length" delay="1">
                <div class="cd-block">
                  <h2>项目成果</h2>
                  <div class="cd-results">
                    <div v-for="([num, label], i) in item.results" :key="i" class="cd-result">
                      <span class="cd-result__num num">{{ num }}</span>
                      <span class="cd-result__label">{{ label }}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            </aside>
          </div>
        </template>
      </div>
    </section>

    <!-- 更多案例滚动 -->
    <section v-if="allCases.length" class="section section--alt">
      <div class="container">
        <SectionTitle title="更多案例" sub="真实项目场景，见证数字化落地成果" />
        <div class="case-scroll">
          <div class="case-scroll__track">
            <div v-for="(c, i) in [...allCases, ...allCases]" :key="i" class="case-scroll__item">
              <router-link :to="`/案例展示/${c.id}`" class="case-scroll__card">
                <PlaceholderImage :src="c.cover" icon="award" height="180px" type="case" />
                <div class="case-scroll__info">
                  <span class="case-scroll__cat">{{ c.category_name }}</span>
                  <h4>{{ c.name }}</h4>
                </div>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cd-layout {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 28px;
  align-items: start;
}

.cd-cover {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  margin-bottom: 24px;
}

.cd-block {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 24px;
  margin-bottom: 20px;
}

.cd-block h2 {
  font-size: 19px;
  font-weight: 700;
  margin-bottom: 16px;
  padding-left: 14px;
  border-left: 4px solid var(--brand-500);
}

.cd-text {
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 2.1;
}

.cd-meta {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cd-meta li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.cd-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cd-results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.cd-result {
  text-align: center;
  padding: 20px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-light);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.cd-result::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--grad-cyan);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-normal) var(--ease-out);
}

.cd-result:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: rgba(11, 95, 255, 0.15);
}

.cd-result:hover::before {
  transform: scaleX(1);
}

.cd-result__num {
  display: block;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(120deg, var(--brand-600), var(--cyan-500));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 6px;
}

.cd-result__label {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

@media (max-width: 900px) {
  .cd-layout {
    grid-template-columns: 1fr;
  }
}

/* ========== 案例滚动 ========== */
.section--alt {
  background: var(--bg-light);
}

.case-scroll {
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
}

.case-scroll__track {
  display: flex;
  gap: 22px;
  animation: caseScroll 40s linear infinite;
  width: max-content;
}

.case-scroll__track:hover {
  animation-play-state: paused;
}

@keyframes caseScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.case-scroll__item {
  flex-shrink: 0;
  width: 300px;
}

.case-scroll__card {
  display: block;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
}

.case-scroll__card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11, 95, 255, 0.15);
}

.case-scroll__card :deep(.ph) {
  height: 180px;
  overflow: hidden;
}

.case-scroll__card :deep(.ph img) {
  transition: transform var(--duration-normal) var(--ease-out);
}

.case-scroll__card:hover :deep(.ph img) {
  transform: scale(1.05);
}

.case-scroll__info {
  padding: 16px 18px;
}

.case-scroll__cat {
  display: inline-block;
  font-size: 12px;
  color: var(--brand-600);
  background: rgba(11, 95, 255, 0.08);
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.case-scroll__info h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>