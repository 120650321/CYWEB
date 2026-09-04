<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, type Category, type Product } from "@/api";
import { usePagination } from "@/composables/usePagination";
import PageHero from "@/components/PageHero.vue";
import ProductCard from "@/components/ProductCard.vue";
import Reveal from "@/components/Reveal.vue";

const route = useRoute();
const router = useRouter();

const categories = ref<Category[]>([]);
const products = ref<Product[]>([]);
const total = ref(0);
const { page, totalPages, pages } = usePagination();
page.value = Number(route.query.page || 1);
const keyword = ref(String(route.query.keyword || ""));
const activeCat = ref(Number(route.query.category || 0));
const loading = ref(true);
const searchInput = ref(keyword.value);

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: page.value, size: 9 };
    if (activeCat.value) params.category = activeCat.value;
    if (keyword.value) params.keyword = keyword.value;
    const data = await api.products(params);
    products.value = data.list;
    total.value = data.pagination.total;
    totalPages.value = data.pagination.totalPages;
  } finally {
    loading.value = false;
  }
}

function selectCat(id: number) {
  activeCat.value = id;
  page.value = 1;
  syncRoute();
  load();
}

function doSearch() {
  keyword.value = searchInput.value.trim();
  page.value = 1;
  syncRoute();
  load();
}

function goPage(p: number) {
  page.value = p;
  syncRoute();
  load();
  window.scrollTo({ top: 320, behavior: "smooth" });
}

function syncRoute() {
  const q: Record<string, any> = {};
  if (page.value > 1) q.page = page.value;
  if (activeCat.value) q.category = activeCat.value;
  if (keyword.value) q.keyword = keyword.value;
  router.replace({ query: q });
}

onMounted(async () => {
  categories.value = await api.productCategories();
  await load();
});

watch(() => route.query, () => {
  page.value = Number(route.query.page || 1);
  activeCat.value = Number(route.query.category || 0);
  keyword.value = String(route.query.keyword || "");
  searchInput.value = keyword.value;
  load();
});
</script>

<template>
  <div>
    <PageHero title="产品中心" sub="自主研发物联网平台与智能硬件，支持国产化适配与信创兼容，为各行业数字化提供核心产品支撑" />

    <section class="section">
      <div class="container">
        <!-- 分类筛选 -->
        <Reveal>
          <div class="filter-bar">
            <div class="filter-cats">
              <button
                class="filter-cat"
                :class="{ 'filter-cat--active': activeCat === 0 }"
                @click="selectCat(0)"
              >全部产品</button>
              <button
                v-for="c in categories"
                :key="c.id"
                class="filter-cat"
                :class="{ 'filter-cat--active': activeCat === c.id }"
                @click="selectCat(c.id)"
              >{{ c.name }}</button>
            </div>
            <div class="filter-search">
              <input
                v-model="searchInput"
                type="text"
                placeholder="搜索产品名称 / 型号"
                @keyup.enter="doSearch"
              />
              <button class="filter-search__btn" @click="doSearch">搜索</button>
            </div>
          </div>
        </Reveal>

        <!-- 产品列表 -->
        <div v-if="loading" class="grid-3">
          <div v-for="i in 6" :key="i" class="skeleton" style="height: 380px"></div>
        </div>

        <div v-else-if="products.length" class="grid-3">
          <Reveal v-for="(p, i) in products" :key="p.id" :delay="i % 3">
            <ProductCard :product="p" />
          </Reveal>
        </div>

        <div v-else class="empty">
          <div class="empty-icon">🔍</div>
          <p>未找到相关产品，请尝试其他关键词或分类</p>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <button :disabled="page <= 1" @click="goPage(page - 1)">‹</button>
          <button
            v-for="p in pages()"
            :key="p"
            :class="{ active: p === page }"
            @click="goPage(p)"
          >{{ p }}</button>
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
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 32px;
  padding: 20px 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
}

.filter-cats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
}

.filter-search {
  display: flex;
  gap: 8px;
}

.filter-search input {
  width: 220px;
  padding: 10px 16px;
  border: 1.5px solid var(--border-mid);
  border-radius: 10px;
  outline: none;
  font-size: 14px;
  background: var(--bg-light);
  transition: all var(--duration-fast);
}

.filter-search input:focus {
  border-color: var(--brand-500);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(11, 95, 255, 0.08);
}

.filter-search__btn {
  padding: 10px 20px;
  border-radius: 10px;
  background: var(--grad-brand);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  transition: all var(--duration-fast);
  box-shadow: 0 4px 12px rgba(11, 95, 255, 0.25);
}

.filter-search__btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(11, 95, 255, 0.4);
}

@media (max-width: 600px) {
  .filter-bar {
    padding: 16px;
    gap: 12px;
  }
  .filter-cats {
    width: 100%;
  }
  .filter-cat {
    padding: 7px 14px;
    font-size: 13px;
  }
  .filter-search {
    width: 100%;
  }
  .filter-search input {
    flex: 1;
    width: auto;
  }
}
</style>