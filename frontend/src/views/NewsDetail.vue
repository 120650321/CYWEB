<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, type Article } from "@/api";
import { useDetailPage } from "@/composables/useDetailPage";
import PageHero from "@/components/PageHero.vue";
import Reveal from "@/components/Reveal.vue";
import PlaceholderImage from "@/components/PlaceholderImage.vue";

const route = useRoute();
const router = useRouter();

const { data: article, loading, notFound } = useDetailPage<Article>(
  (id) => api.article(id)
);

const catLabel: Record<string, string> = {
  company: "企业动态",
  news: "行业资讯",
  tech: "技术分享",
};

const paragraphs = computed(() => {
  if (!article.value?.content) return [];
  return article.value.content.split(/\n+/).filter((p) => p.trim());
});
</script>

<template>
  <div>
    <PageHero :title="article?.title || '文章详情'" />

    <section class="section">
      <div class="container">
        <div v-if="loading" class="nd-loading">
          <div class="skeleton" style="height: 120px"></div>
          <div class="skeleton" style="height: 300px; margin-top: 24px"></div>
        </div>

        <div v-else-if="notFound" class="empty">
          <div class="empty-icon">⚠️</div>
          <p>文章不存在</p>
        </div>

        <template v-else-if="article">
          <div class="nd-layout">
            <article class="nd-main">
              <Reveal>
                <PlaceholderImage :src="article.cover" icon="news" height="280px" type="news" class="nd-cover" />
              </Reveal>
              <Reveal>
                <div class="nd-header">
                  <div class="nd-header__tags">
                    <span class="tag">{{ catLabel[article.category] || "新闻资讯" }}</span>
                    <span v-if="article.is_top === 1" class="nd-top">置顶</span>
                  </div>
                  <h1>{{ article.title }}</h1>
                  <div class="nd-header__meta">
                    <span>🕒 {{ article.publish_time?.slice(0, 10) }}</span>
                    <span>👤 {{ article.author }}</span>
                    <span class="num">👁 {{ article.views }}</span>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div class="nd-body">
                  <p v-for="(p, i) in paragraphs" :key="i" class="nd-para">{{ p }}</p>
                </div>
              </Reveal>

              <Reveal v-if="article.tags && article.tags.length">
                <div class="nd-tags">
                  <span v-for="t in article.tags" :key="t" class="tag"># {{ t }}</span>
                </div>
              </Reveal>

              <Reveal>
                <div class="nd-nav">
                  <router-link v-if="article.prev" :to="`/新闻资讯/${article.prev.id}`" class="nd-nav__item">
                    <span class="nd-nav__label">上一篇</span>
                    <span class="nd-nav__title">{{ article.prev.title }}</span>
                  </router-link>
                  <span v-else class="nd-nav__item nd-nav__item--empty">上一篇：没有了</span>
                  <router-link v-if="article.next" :to="`/新闻资讯/${article.next.id}`" class="nd-nav__item nd-nav__item--right">
                    <span class="nd-nav__label">下一篇</span>
                    <span class="nd-nav__title">{{ article.next.title }}</span>
                  </router-link>
                  <span v-else class="nd-nav__item nd-nav__item--empty nd-nav__item--right">下一篇：没有了</span>
                </div>
              </Reveal>

              <Reveal>
                <div class="nd-back">
                  <button class="btn btn--outline" @click="router.back()">← 返回列表</button>
                </div>
              </Reveal>
            </article>

            <aside class="nd-side">
              <Reveal delay="1" v-if="article.related && article.related.length">
                <div class="nd-widget">
                  <h3>相关推荐</h3>
                  <router-link
                    v-for="r in article.related"
                    :key="r.id"
                    :to="`/新闻资讯/${r.id}`"
                    class="nd-widget__item"
                  >
                    <span class="nd-widget__dot"></span>
                    <span class="nd-widget__text">{{ r.title }}</span>
                    <span class="nd-widget__date num">{{ r.publish_time?.slice(0, 10) }}</span>
                  </router-link>
                </div>
              </Reveal>

              <Reveal delay="1">
                <div class="nd-widget nd-widget--cta">
                  <h3>需要帮助？</h3>
                  <p>我们的顾问团队随时为您提供专业支持。</p>
                  <router-link to="/联系我们" class="btn btn--primary">联系我们</router-link>
                </div>
              </Reveal>
            </aside>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.nd-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 28px;
  align-items: start;
}

.nd-main {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 24px;
}

.nd-cover {
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 24px;
}

.nd-header {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 28px;
}

.nd-header__tags {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.nd-top {
  font-size: 11px;
  color: #fff;
  background: var(--grad-cyan);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.nd-header h1 {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.5;
  margin-bottom: 16px;
}

.nd-header__meta {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.nd-body {
  margin-bottom: 30px;
}

.nd-para {
  font-size: 15px;
  line-height: 2.15;
  color: var(--text-secondary);
  margin-bottom: 18px;
  text-align: justify;
}

.nd-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.nd-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  margin-bottom: 20px;
}

.nd-nav__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 18px;
  border-radius: 10px;
  background: var(--bg-light);
  border: 1px solid var(--border-light);
  transition: all var(--duration-fast);
}

.nd-nav__item:hover {
  border-color: var(--brand-500);
  box-shadow: var(--shadow-sm);
}

.nd-nav__item--right {
  text-align: right;
}

.nd-nav__item--empty {
  opacity: 0.45;
}

.nd-nav__label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.nd-nav__title {
  font-size: 14px;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text-primary);
}

.nd-back {
  text-align: center;
}

.nd-widget {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 26px;
  margin-bottom: 24px;
}

.nd-widget h3 {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 18px;
  padding-left: 12px;
  border-left: 4px solid var(--brand-500);
}

.nd-widget__item {
  display: grid;
  grid-template-columns: 8px 1fr;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-light);
  align-items: start;
}

.nd-widget__item:last-child {
  border-bottom: none;
}

.nd-widget__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-500);
  margin-top: 8px;
  transition: all var(--duration-fast);
}

.nd-widget__item:hover .nd-widget__dot {
  background: var(--cyan-400);
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.4);
}

.nd-widget__text {
  font-size: 13.5px;
  color: var(--text-primary);
  line-height: 1.7;
  transition: color var(--duration-fast);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.nd-widget__item:hover .nd-widget__text {
  color: var(--brand-600);
}

.nd-widget__date {
  grid-column: 2;
  font-size: 12px;
  color: var(--text-tertiary);
}

.nd-widget--cta p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 18px;
  line-height: 1.8;
}

@media (max-width: 900px) {
  .nd-layout {
    grid-template-columns: 1fr;
  }
  .nd-main {
    padding: 24px;
  }
}

@media (max-width: 560px) {
  .nd-nav {
    grid-template-columns: 1fr;
  }
}
</style>