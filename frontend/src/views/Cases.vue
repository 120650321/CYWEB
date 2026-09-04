<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, type Category, type CaseItem } from "@/api";
import { usePagination } from "@/composables/usePagination";
import PageHero from "@/components/PageHero.vue";
import CaseCard from "@/components/CaseCard.vue";
import Reveal from "@/components/Reveal.vue";

const route = useRoute();
const router = useRouter();

const categories = ref<Category[]>([]);
const cases = ref<CaseItem[]>([]);
const total = ref(0);
const { page, totalPages, pages } = usePagination();
page.value = Number(route.query.page || 1);
const activeCat = ref(Number(route.query.category || 0));
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: page.value, size: 9 };
    if (activeCat.value) params.category = activeCat.value;
    const data = await api.cases(params);
    cases.value = data.list;
    total.value = data.pagination.total;
    totalPages.value = data.pagination.totalPages;
  } finally {
    loading.value = false;
  }
}

function selectCat(id: number) {
  activeCat.value = id;
  page.value = 1;
  router.replace({ query: activeCat.value ? { category: String(activeCat.value) } : {} });
  load();
}

function goPage(p: number) {
  page.value = p;
  router.replace({ query: { ...(activeCat.value ? { category: String(activeCat.value) } : {}), page: String(p) } });
  load();
  window.scrollTo({ top: 320, behavior: "smooth" });
}

onMounted(async () => {
  categories.value = await api.caseCategories();
  await load();
});

watch(() => route.query, () => {
  page.value = Number(route.query.page || 1);
  activeCat.value = Number(route.query.category || 0);
  load();
});
</script>

<template>
  <div>
    <PageHero title="案例展示" sub="深耕行业场景，用真实交付案例验证方案价值，项目全流程实施交付" />

    <section class="section">
      <div class="container">
        <Reveal>
          <div class="filter-bar">
            <button
              class="filter-cat"
              :class="{ 'filter-cat--active': activeCat === 0 }"
              @click="selectCat(0)"
            >全部案例</button>
            <button
              v-for="c in categories"
              :key="c.id"
              class="filter-cat"
              :class="{ 'filter-cat--active': activeCat === c.id }"
              @click="selectCat(c.id)"
            >{{ c.name }}</button>
          </div>
        </Reveal>

        <div v-if="loading" class="grid-3">
          <div v-for="i in 6" :key="i" class="skeleton" style="height: 360px"></div>
        </div>

        <div v-else-if="cases.length" class="grid-3">
          <Reveal v-for="(c, i) in cases" :key="c.id" :delay="i % 3">
            <CaseCard :item="c" />
          </Reveal>
        </div>

        <div v-else class="empty">
          <div class="empty-icon">📂</div>
          <p>暂无相关案例</p>
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
.filter-bar {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
  padding: 20px 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
}

.filter-cat {
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

.filter-cat:hover {
  color: var(--brand-600);
  border-color: var(--brand-400);
  background: rgba(11, 95, 255, 0.04);
  transform: translateY(-1px);
}

.filter-cat--active {
  background: var(--grad-brand);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(11, 95, 255, 0.35);
  font-weight: 600;
}

@media (max-width: 600px) {
  .filter-bar {
    flex-wrap: wrap;
    justify-content: center;
    left: 0;
    transform: none;
    width: 100%;
  }
}
</style>