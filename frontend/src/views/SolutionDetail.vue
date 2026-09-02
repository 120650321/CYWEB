<script setup lang="ts">
import { api, type Solution } from "@/api";
import { useDetailPage } from "@/composables/useDetailPage";
import PageHero from "@/components/PageHero.vue";
import Reveal from "@/components/Reveal.vue";
import PlaceholderImage from "@/components/PlaceholderImage.vue";
import ContactForm from "@/components/ContactForm.vue";

const { data: solution, loading, notFound } = useDetailPage<(Solution & { other?: Solution[] })>(
  (id) => api.solution(id)
);
</script>

<template>
  <div>
    <PageHero :title="solution?.name || '解决方案'" :sub="solution?.intro" />

    <section class="section">
      <div class="container">
        <div v-if="loading" class="sd-loading">
          <div class="skeleton" style="height: 260px"></div>
          <div class="skeleton" style="height: 180px; margin-top: 24px"></div>
        </div>

        <div v-else-if="notFound" class="empty">
          <div class="empty-icon">⚠️</div>
          <p>解决方案不存在</p>
        </div>

        <template v-else-if="solution">
          <!-- 顶部横幅 -->
          <Reveal>
            <div class="sd-hero">
              <PlaceholderImage :src="solution.cover" icon="layout" height="100%" type="solution" class="sd-hero__img" />
              <div class="sd-hero__overlay">
                <span class="sd-hero__ind">{{ solution.industry }}</span>
                <h1>{{ solution.name }}</h1>
                <p>{{ solution.intro }}</p>
              </div>
            </div>
          </Reveal>

          <!-- 方案价值 -->
          <Reveal v-if="solution.value_points && solution.value_points.length">
            <div class="sd-block">
              <h2 class="sd-block__title">方案价值</h2>
              <div class="sd-values">
                <div v-for="(v, i) in solution.value_points" :key="i" class="sd-value">
                  <span class="sd-value__num num">{{ String(i + 1).padStart(2, "0") }}</span>
                  <p>{{ v }}</p>
                </div>
              </div>
            </div>
          </Reveal>

          <!-- 方案内容 -->
          <div class="sd-grid">
            <Reveal>
              <div class="sd-block">
                <h2 class="sd-block__title">方案详情</h2>
                <div class="sd-text" v-html="(solution.detail || '').replace(/\n/g, '<br/>')"></div>
              </div>
            </Reveal>

            <Reveal delay="1">
              <div class="sd-side">
                <div v-if="solution.scenario" class="sd-block">
                  <h2 class="sd-block__title">适用场景</h2>
                  <p class="sd-text">{{ solution.scenario }}</p>
                </div>
                <div v-if="solution.architecture" class="sd-block">
                  <h2 class="sd-block__title">方案架构</h2>
                  <div class="sd-arch">
                    <div v-for="(a, i) in solution.architecture.split('→')" :key="i" class="sd-arch__node">
                      <span class="sd-arch__dot"></span>
                      <span>{{ a.trim() }}</span>
                      <span v-if="i < solution.architecture.split('→').length - 1" class="sd-arch__arrow">→</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <!-- 其他方案 -->
          <Reveal v-if="solution.other && solution.other.length">
            <h2 class="sd-other__title">更多解决方案</h2>
            <div class="sd-other">
              <router-link
                v-for="o in solution.other"
                :key="o.id"
                :to="`/解决方案/${o.id}`"
                class="sd-other__card"
              >
                <span class="sd-other__ind">{{ o.industry }}</span>
                <h3>{{ o.name }}</h3>
                <p>{{ o.intro }}</p>
                <span class="sd-other__link">查看方案 →</span>
              </router-link>
            </div>
          </Reveal>

          <!-- 咨询 -->
          <Reveal>
            <div class="sd-cta">
              <div class="sd-cta__info">
                <h2>需要定制行业解决方案？</h2>
                <p>我们的方案顾问将根据您的业务场景，为您量身定制解决方案。</p>
              </div>
              <div class="sd-cta__form">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sd-hero {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  min-height: 380px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 32px;
}

.sd-hero__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 44px;
  background: linear-gradient(to top, rgba(6, 14, 34, 0.92) 0%, rgba(6, 14, 34, 0.35) 55%, transparent);
  color: #fff;
}

.sd-hero__ind {
  align-self: flex-start;
  font-size: 13px;
  color: var(--cyan-400);
  border: 1px solid rgba(0, 200, 255, 0.4);
  padding: 4px 14px;
  border-radius: 999px;
  letter-spacing: 1px;
  margin-bottom: 14px;
  background: rgba(0, 200, 255, 0.1);
}

.sd-hero h1 {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 12px;
}

.sd-hero p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.82);
  max-width: 640px;
  line-height: 1.9;
}

.sd-block {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 24px;
  margin-bottom: 24px;
}

.sd-block__title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 18px;
  padding-left: 14px;
  border-left: 4px solid var(--brand-500);
}

.sd-values {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.sd-value {
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--bg-light);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
}

.sd-value:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.sd-value__num {
  font-size: 24px;
  font-weight: 800;
  color: var(--brand-500);
  display: block;
  margin-bottom: 8px;
}

.sd-value p {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.8;
}

.sd-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 28px;
  align-items: start;
}

.sd-text {
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 2.1;
}

.sd-side .sd-block {
  margin-bottom: 24px;
}

.sd-arch {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.sd-arch__node {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--text-primary);
  position: relative;
  padding: 10px 0;
}

.sd-arch__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--grad-cyan);
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.5);
}

.sd-arch__arrow {
  color: var(--brand-500);
  font-size: 16px;
  margin-left: 2px;
}

.sd-other__title {
  font-size: 22px;
  font-weight: 700;
  margin: 40px 0 24px;
  padding-left: 14px;
  border-left: 4px solid var(--brand-500);
}

.sd-other {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.sd-other__card {
  padding: 28px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.sd-other__card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-cyan);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-normal) var(--ease-out);
}

.sd-other__card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11, 95, 255, 0.15);
}

.sd-other__card:hover::before {
  transform: scaleX(1);
}

.sd-other__ind {
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-600);
  background: rgba(11, 95, 255, 0.08);
  padding: 4px 12px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

.sd-other__card h3 {
  font-size: 17px;
  font-weight: 700;
  margin: 14px 0 10px;
}

.sd-other__card p {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sd-other__link {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-600);
  transition: color var(--duration-fast);
}

.sd-other__card:hover .sd-other__link {
  color: var(--cyan-500);
}

.sd-cta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-top: 36px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-light);
}

.sd-cta__info {
  background: var(--grad-hero);
  padding: 48px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.sd-cta__info::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(400px 300px at 10% 0%, rgba(0, 200, 255, 0.18), transparent 60%),
    radial-gradient(360px 260px at 90% 100%, rgba(11, 95, 255, 0.35), transparent 60%);
}

.sd-cta__info h2 {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 16px;
  position: relative;
}

.sd-cta__info p {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.9;
  position: relative;
}

.sd-cta__form {
  background: var(--bg-card);
  padding: 40px;
}

@media (max-width: 900px) {
  .sd-grid,
  .sd-cta {
    grid-template-columns: 1fr;
  }
  .sd-other {
    grid-template-columns: 1fr;
  }
}
</style>