<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, type Article } from "@/api";
import { usePagination } from "@/composables/usePagination";
import PageHero from "@/components/PageHero.vue";
import ArticleCard from "@/components/ArticleCard.vue";
import Reveal from "@/components/Reveal.vue";

const route = useRoute();
const router = useRouter();

const cats = [
  { label: "全部资讯", value: "all" },
  { label: "企业动态", value: "company" },
  { label: "行业资讯", value: "news" },
  { label: "技术分享", value: "tech" },
];

const articles = ref<Article[]>([]);
const total = ref(0);
const { page, totalPages, pages } = usePagination();
page.value = Number(route.query.page || 1);
const activeCat = ref(String(route.query.category || "all"));
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: page.value, size: 9 };
    if (activeCat.value !== "all") params.category = activeCat.value;
    const data = await api.articles(params);
    articles.value = data.list;
    total.value = data.pagination.total;
    totalPages.value = data.pagination.totalPages;
  } finally {
    loading.value = false;
  }
}

function selectCat(v: string) {
  activeCat.value = v;
  page.value = 1;
  router.replace({ query: v !== "all" ? { category: v } : {} });
  load();
}

function goPage(p: number) {
  page.value = p;
  router.replace({ query: { ...(activeCat.value !== "all" ? { category: activeCat.value } : {}), page: String(p) } });
  load();
  window.scrollTo({ top: 320, behavior: "smooth" });
}

onMounted(load);

watch(() => route.query, () => {
  page.value = Number(route.query.page || 1);
  activeCat.value = String(route.query.category || "all");
  load();
});
</script>

<template>
  <div>
    <PageHero title="新闻资讯" sub="关注驰耀科技动态，掌握物联网、智能监测、数字化转型等行业前沿技术与资讯" />

    <section class="section">
      <div class="container">
        <Reveal>
          <div class="news-tabs">
            <button
              v-for="c in cats"
              :key="c.value"
              class="news-tab"
              :class="{ 'news-tab--active': activeCat === c.value }"
              @click="selectCat(c.value)"
            >{{ c.label }}</button>
          </div>
        </Reveal>

        <div v-if="loading" class="grid-3">
          <div v-for="i in 6" :key="i" class="skeleton" style="height: 280px"></div>
        </div>

        <div v-else-if="articles.length" class="grid-3">
          <Reveal v-for="(a, i) in articles" :key="a.id" :delay="i % 3">
            <ArticleCard :item="a" />
          </Reveal>
        </div>

        <div v-else class="empty">
          <div class="empty-icon">📰</div>
          <p>暂无相关资讯</p>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button :disabled="page <= 1" @click="goPage(page - 1)">‹</button>
          <button v-for="p in pages()" :key="p" :class="{ active: p === page }" @click="goPage(p)">{{ p }}</button>
          <button :disabled="page >= totalPages" @click="goPage(page + 1)">›</button>
          <span class="page-info">共 {{ total }} 条</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.news-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
  padding: 20px 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
}

.news-tab {
  padding: 9px 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  border: 1.5px solid var(--border-mid);
  background: #fff;
  transition: all var(--duration-fast) var(--ease-out);
  cursor: pointer;
}

.news-tab:hover {
  color: var(--brand-600);
  border-color: var(--brand-400);
  background: rgba(11, 95, 255, 0.04);
  transform: translateY(-1px);
}

.news-tab--active {
  background: var(--grad-brand);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(11, 95, 255, 0.35);
  font-weight: 600;
}

@media (max-width: 600px) {
  .news-tabs {
    flex-wrap: wrap;
    justify-content: center;
    left: 0;
    transform: none;
    width: 100%;
  }
}
</style>