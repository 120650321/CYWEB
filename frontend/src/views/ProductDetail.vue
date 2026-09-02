<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { api, type Product } from "@/api";
import { useDetailPage } from "@/composables/useDetailPage";
import PageHero from "@/components/PageHero.vue";
import SectionTitle from "@/components/SectionTitle.vue";
import Reveal from "@/components/Reveal.vue";
import ProductCard from "@/components/ProductCard.vue";
import PlaceholderImage from "@/components/PlaceholderImage.vue";

const { data: product, loading, notFound } = useDetailPage<(Product & { related?: Product[] })>(
  (id) => api.product(id)
);

const allProducts = ref<Product[]>([]);
const currentImg = ref(0);
const lightboxVisible = ref(false);

// 图片缩放
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const panStart = ref({ x: 0, y: 0 });

const allImages = computed(() => {
  if (!product.value) return [];
  const list: string[] = [];
  if (product.value.cover) list.push(product.value.cover);
  for (const img of product.value.images || []) {
    if (img && img !== product.value.cover) list.push(img);
  }
  return list;
});

const hasMultipleImages = computed(() => allImages.value.length > 1);

function prevImage() {
  currentImg.value = (currentImg.value - 1 + allImages.value.length) % allImages.value.length;
}
function nextImage() {
  currentImg.value = (currentImg.value + 1) % allImages.value.length;
}
function goToImage(index: number) {
  currentImg.value = index;
}
function openLightbox() {
  resetZoom();
  lightboxVisible.value = true;
}
function closeLightbox() {
  lightboxVisible.value = false;
  resetZoom();
}

function resetZoom() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.15 : 0.15;
  const newZoom = Math.min(Math.max(zoom.value + delta, 0.3), 5);
  // 以鼠标位置为中心缩放
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const mx = e.clientX - rect.left - rect.width / 2;
  const my = e.clientY - rect.top - rect.height / 2;
  const ratio = newZoom / zoom.value;
  panX.value = panX.value * ratio + mx * (1 - ratio);
  panY.value = panY.value * ratio + my * (1 - ratio);
  zoom.value = newZoom;
}

function onDblClick() {
  if (zoom.value > 1.01) {
    resetZoom();
  } else {
    zoom.value = 2.5;
    panX.value = 0;
    panY.value = 0;
  }
}

function onMouseDown(e: MouseEvent) {
  if (zoom.value <= 1) return;
  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY };
  panStart.value = { x: panX.value, y: panY.value };
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  panX.value = panStart.value.x + (e.clientX - dragStart.value.x);
  panY.value = panStart.value.y + (e.clientY - dragStart.value.y);
}

function onMouseUp() {
  isDragging.value = false;
}

function prevLightbox() {
  currentImg.value = (currentImg.value - 1 + allImages.value.length) % allImages.value.length;
  resetZoom();
}
function nextLightbox() {
  currentImg.value = (currentImg.value + 1) % allImages.value.length;
  resetZoom();
}
function onLightboxKey(e: KeyboardEvent) {
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") prevLightbox();
  if (e.key === "ArrowRight") nextLightbox();
}

onMounted(async () => {
  try {
    const data = await api.products({ page: 1, size: 12 });
    allProducts.value = data.list;
  } catch {
    // 静默失败
  }
});

function onContact() {
  const el = document.getElementById("contact-form");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <div>
    <PageHero :title="product?.name || '产品详情'" :sub="product?.intro" />

    <section class="section">
      <div class="container">
        <div v-if="loading" class="pd-loading">
          <div class="skeleton" style="height: 300px"></div>
          <div class="skeleton" style="height: 200px; margin-top: 24px"></div>
        </div>

        <div v-else-if="notFound" class="empty">
          <div class="empty-icon">⚠️</div>
          <p>产品不存在或已下架</p>
        </div>

        <template v-else-if="product">
          <!-- 产品主信息 -->
          <div class="pd-main">
            <Reveal class="pd-media">
              <div class="pd-carousel" @click="openLightbox">
                <div class="pd-carousel__stage">
                  <img
                    v-if="allImages.length"
                    :src="allImages[currentImg]"
                    :alt="product.name"
                    class="pd-carousel__img"
                  />
                  <PlaceholderImage
                    v-else
                    :src="product.cover || ''"
                    icon="link"
                    height="100%"
                    type="product"
                    class="pd-media__img"
                  />
                </div>
                <template v-if="hasMultipleImages">
                  <button class="pd-carousel__btn pd-carousel__btn--prev" @click.stop="prevImage">◂</button>
                  <button class="pd-carousel__btn pd-carousel__btn--next" @click.stop="nextImage">▸</button>
                  <div class="pd-carousel__dots">
                    <button
                      v-for="(img, i) in allImages"
                      :key="i"
                      class="pd-carousel__dot"
                      :class="{ 'pd-carousel__dot--active': i === currentImg }"
                      @click.stop="goToImage(i)"
                    ></button>
                  </div>
                  <div class="pd-carousel__hint">点击图片放大查看</div>
                </template>
              </div>
            </Reveal>
            <Reveal delay="1" class="pd-info">
              <div class="pd-info__cats">
                <span class="tag">{{ product.category_name }}</span>
                <span v-if="product.model" class="tag tag--model">{{ product.model }}</span>
              </div>
              <h1>{{ product.name }}</h1>
              <p class="pd-info__intro">{{ product.intro }}</p>

              <div class="pd-info__params">
                <div v-for="([k, v], i) in (product.params || []).slice(0, 5)" :key="i" class="pd-info__param">
                  <span class="pd-info__k">{{ k }}</span>
                  <span class="pd-info__v">{{ v }}</span>
                </div>
              </div>

              <div class="pd-info__actions">
                <button class="btn btn--primary" @click="onContact">咨询此产品</button>
                <router-link to="/联系我们" class="btn btn--outline">获取报价</router-link>
              </div>
            </Reveal>
          </div>

          <!-- 详细内容 -->
          <div class="pd-detail">
            <Reveal>
              <div class="pd-detail__panel">
                <h2 class="pd-detail__title">产品介绍</h2>
                <div class="pd-detail__content" v-html="(product.detail || '').replace(/\n/g, '<br/>')"></div>
              </div>
            </Reveal>

            <Reveal v-if="product.params && product.params.length" delay="1">
              <div class="pd-detail__panel">
                <h2 class="pd-detail__title">产品参数</h2>
                <table class="pd-table">
                  <tbody>
                    <tr v-for="([k, v], i) in product.params" :key="i">
                      <td class="pd-table__k">{{ k }}</td>
                      <td>{{ v }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>

          <!-- 相关产品 -->
          <Reveal v-if="product.related && product.related.length">
            <h2 class="pd-related__title">相关产品</h2>
            <div class="grid-3">
              <ProductCard v-for="r in product.related.slice(0, 3)" :key="r.id" :product="r" />
            </div>
          </Reveal>
        </template>
      </div>
    </section>

    <!-- 咨询表单锚点 -->
    <div id="contact-form" class="pd-form-anchor"></div>

    <!-- 更多产品滚动 -->
    <section v-if="allProducts.length" class="section section--alt">
      <div class="container">
        <SectionTitle title="更多产品" sub="自主研发核心产品，为各行业数字化提供支撑" />
        <div class="product-scroll">
          <div class="product-scroll__track">
            <div v-for="(p, i) in [...allProducts, ...allProducts]" :key="i" class="product-scroll__item">
              <router-link :to="`/产品中心/${p.id}`" class="product-scroll__card">
                <PlaceholderImage :src="p.cover" icon="link" height="180px" type="product" />
                <div class="product-scroll__info">
                  <span class="product-scroll__cat">{{ p.category_name }}</span>
                  <h4>{{ p.name }}</h4>
                  <p>{{ p.model }}</p>
                </div>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="lightboxVisible"
          class="lb-overlay"
          @click="closeLightbox"
          @keydown="onLightboxKey"
          tabindex="0"
          ref="lbRef"
        >
          <button class="lb-close" @click="closeLightbox">✕</button>
          <button v-if="hasMultipleImages" class="lb-nav lb-nav--prev" @click.stop="prevLightbox">◂</button>
          <div class="lb-stage"
            @wheel="onWheel"
            @dblclick="onDblClick"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
          >
            <img
              :src="allImages[currentImg]"
              :alt="product?.name"
              class="lb-img"
              :class="{ 'lb-img--dragging': isDragging }"
              :style="{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }"
            />
          </div>
          <button v-if="hasMultipleImages" class="lb-nav lb-nav--next" @click.stop="nextLightbox">▸</button>
          <div v-if="hasMultipleImages" class="lb-counter">{{ currentImg + 1 }} / {{ allImages.length }}</div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.pd-main {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 28px;
  margin-bottom: 44px;
}

.pd-media {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  min-height: 420px;
}

.pd-info__cats {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.tag--model {
  background: rgba(0, 200, 255, 0.1);
  color: #0098c8;
  font-family: var(--font-num);
}

.pd-info h1 {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
  line-height: 1.4;
}

.pd-info__intro {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 2;
  margin-bottom: 26px;
}

.pd-info__params {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 30px;
}

.pd-info__param {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg-light);
  border: 1px solid var(--border-light);
  transition: all var(--duration-fast);
}

.pd-info__param:hover {
  background: #fff;
  border-color: rgba(11, 95, 255, 0.15);
  box-shadow: 0 2px 12px rgba(11, 95, 255, 0.06);
}

.pd-info__k {
  font-size: 13px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.pd-info__v {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.pd-info__actions {
  display: flex;
  gap: 14px;
}

.pd-detail {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 28px;
  margin-bottom: 44px;
}

.pd-detail__panel {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 24px;
}

.pd-detail__title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--grad-brand);
  border-image: linear-gradient(90deg, var(--brand-500), transparent) 1;
  border-bottom-style: solid;
  border-bottom-width: 2px;
  border-image-slice: 1;
  position: relative;
}

.pd-detail__title::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 52px;
  height: 2px;
  background: var(--grad-cyan);
}

.pd-detail__content {
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 2.1;
}

.pd-table {
  width: 100%;
  border-collapse: collapse;
}

.pd-table td {
  padding: 13px 16px;
  font-size: 14px;
  border-bottom: 1px solid var(--border-light);
}

.pd-table tr:nth-child(odd) {
  background: var(--bg-light);
}

.pd-table__k {
  width: 140px;
  font-weight: 600;
  color: var(--text-primary);
}

.pd-related__title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 24px;
  padding-left: 14px;
  border-left: 4px solid var(--brand-500);
}

.pd-form-anchor {
  scroll-margin-top: 90px;
}

@media (max-width: 900px) {
  .pd-main {
    grid-template-columns: 1fr;
  }
  .pd-detail {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .pd-info__params {
    grid-template-columns: 1fr;
  }
}

/* ========== 产品滚动 ========== */
.section--alt {
  background: var(--bg-light);
}

.product-scroll {
  overflow: hidden;
  mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
}

.product-scroll__track {
  display: flex;
  gap: 22px;
  animation: productScroll 40s linear infinite;
  width: max-content;
}

.product-scroll__track:hover {
  animation-play-state: paused;
}

@keyframes productScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.product-scroll__item {
  flex-shrink: 0;
  width: 300px;
}

.product-scroll__card {
  display: block;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
}

.product-scroll__card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11, 95, 255, 0.15);
}

.product-scroll__card :deep(.ph) {
  height: 180px;
  overflow: hidden;
}

.product-scroll__card :deep(.ph img) {
  transition: transform var(--duration-normal) var(--ease-out);
}

.product-scroll__card:hover :deep(.ph img) {
  transform: scale(1.05);
}

.product-scroll__info {
  padding: 16px 18px;
}

.product-scroll__cat {
  display: inline-block;
  font-size: 12px;
  color: var(--brand-600);
  background: rgba(11, 95, 255, 0.08);
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.product-scroll__info h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
  margin-bottom: 4px;
}

.product-scroll__info p {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-num);
}

/* ========== 产品图片轮播 ========== */
.pd-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  max-height: 500px;
  cursor: pointer;
  background: var(--bg-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.pd-carousel__stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pd-carousel__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s var(--ease-out);
}

.pd-carousel__btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border-light);
  color: var(--text-primary);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out);
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.pd-carousel:hover .pd-carousel__btn {
  opacity: 1;
}

.pd-carousel__btn:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.14);
  color: var(--brand-600);
}

.pd-carousel__btn--prev {
  left: 12px;
}

.pd-carousel__btn--next {
  right: 12px;
}

.pd-carousel__dots {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}

.pd-carousel__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.25s var(--ease-out);
  padding: 0;
}

.pd-carousel__dot--active {
  background: var(--brand-500);
  border-color: var(--brand-500);
  transform: scale(1.3);
}

.pd-carousel__hint {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(6, 14, 34, 0.55);
  backdrop-filter: blur(8px);
  padding: 5px 12px;
  border-radius: 999px;
  z-index: 2;
  pointer-events: none;
}

/* ========== 图片放大灯箱 ========== */
.lb-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(6, 14, 34, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
}

.lb-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.25s var(--ease-out);
}

.lb-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.08);
}

.lb-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90vw;
  height: 85vh;
  overflow: hidden;
  cursor: default;
}

.lb-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-md);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 0.08s linear;
  transform-origin: center center;
}

.lb-img--dragging {
  transition: none;
}

.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.25s var(--ease-out);
}

.lb-nav:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-50%) scale(1.08);
}

.lb-nav--prev {
  left: 24px;
}

.lb-nav--next {
  right: 24px;
}

.lb-counter {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-num);
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 18px;
  border-radius: 999px;
  z-index: 10;
}

/* lightbox 过渡 */
.lightbox-enter-active {
  transition: opacity 0.3s var(--ease-out);
}
.lightbox-enter-active .lb-img {
  transition: transform 0.35s var(--ease-spring), opacity 0.3s var(--ease-out);
}
.lightbox-leave-active {
  transition: opacity 0.2s var(--ease-out);
}
.lightbox-enter-from {
  opacity: 0;
}
.lightbox-enter-from .lb-img {
  transform: scale(0.9);
  opacity: 0;
}
.lightbox-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .lb-nav {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
  .lb-nav--prev {
    left: 10px;
  }
  .lb-nav--next {
    right: 10px;
  }
  .lb-close {
    top: 12px;
    right: 12px;
    width: 38px;
    height: 38px;
  }
}
</style>