<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api, type Category, type Download } from "@/api";
import { usePagination } from "@/composables/usePagination";
import PageHero from "@/components/PageHero.vue";
import DownloadCard from "@/components/DownloadCard.vue";
import Reveal from "@/components/Reveal.vue";

const route = useRoute();
const router = useRouter();

const categories = ref<Category[]>([]);
const downloads = ref<Download[]>([]);
const total = ref(0);
const { page, totalPages, pages } = usePagination();
page.value = Number(route.query.page || 1);
const activeCat = ref(Number(route.query.category || 0));
const keyword = ref(String(route.query.keyword || ""));
const searchInput = ref(keyword.value);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = { page: page.value, size: 10 };
    if (activeCat.value) params.category = activeCat.value;
    if (keyword.value) params.keyword = keyword.value;
    const data = await api.downloads(params);
    downloads.value = data.list;
    total.value = data.pagination.total;
    totalPages.value = data.pagination.totalPages;
  } finally {
    loading.value = false;
  }
}

function selectCat(id: number) {
  activeCat.value = id;
  page.value = 1;
  load();
}

function doSearch() {
  keyword.value = searchInput.value.trim();
  page.value = 1;
  load();
}

function goPage(p: number) {
  page.value = p;
  load();
  window.scrollTo({ top: 340, behavior: "smooth" });
}

onMounted(async () => {
  categories.value = await api.downloadCategories();
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
    <PageHero title="软件资料" sub="提供产品驱动、固件升级、使用手册、SDK 开发包与技术支持文档下载" />

    <section class="section">
      <div class="container">
        <Reveal>
          <div class="dl-bar">
            <div class="dl-cats">
              <button class="dl-cat" :class="{ 'dl-cat--active': activeCat === 0 }" @click="selectCat(0)">全部资料</button>
              <button
                v-for="c in categories"
                :key="c.id"
                class="dl-cat"
                :class="{ 'dl-cat--active': activeCat === c.id }"
                @click="selectCat(c.id)"
              >{{ c.name }}</button>
            </div>
            <div class="dl-search">
              <input v-model="searchInput" type="text" placeholder="搜索资料名称" @keyup.enter="doSearch" />
              <button @click="doSearch">搜索</button>
            </div>
          </div>
        </Reveal>

        <div v-if="loading" class="dl-list">
          <div v-for="i in 5" :key="i" class="skeleton" style="height: 110px"></div>
        </div>

        <div v-else-if="downloads.length" class="dl-list">
          <Reveal v-for="d in downloads" :key="d.id">
            <DownloadCard :item="d" />
          </Reveal>
        </div>

        <div v-else class="empty">
          <div class="empty-icon">📦</div>
          <p>暂无相关资料</p>
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
.dl-bar {
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

.dl-cats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dl-cat {
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

.dl-cat:hover {
  color: var(--brand-600);
  border-color: var(--brand-400);
  background: rgba(11, 95, 255, 0.04);
  transform: translateY(-1px);
}

.dl-cat--active {
  background: var(--grad-brand);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 18px rgba(11, 95, 255, 0.35);
}

.dl-search {
  display: flex;
  gap: 8px;
}

.dl-search input {
  width: 220px;
  padding: 10px 16px;
  border: 1.5px solid var(--border-mid);
  border-radius: 10px;
  outline: none;
  font-size: 14px;
  background: var(--bg-light);
  transition: all var(--duration-fast);
}

.dl-search input:focus {
  border-color: var(--brand-500);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(11, 95, 255, 0.08);
}

.dl-search button {
  padding: 10px 20px;
  border-radius: 10px;
  background: var(--grad-brand);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  transition: all var(--duration-fast);
  box-shadow: 0 4px 12px rgba(11, 95, 255, 0.25);
}

.dl-search button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(11, 95, 255, 0.4);
}

.dl-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 600px) {
  .dl-search {
    width: 100%;
  }
  .dl-search input {
    flex: 1;
    width: auto;
  }
}
</style>