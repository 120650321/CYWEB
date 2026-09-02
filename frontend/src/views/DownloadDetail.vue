<script setup lang="ts">
import { ref, computed } from "vue";
import { api, type Download } from "@/api";
import { useDetailPage } from "@/composables/useDetailPage";
import PageHero from "@/components/PageHero.vue";
import Reveal from "@/components/Reveal.vue";
import DownloadCard from "@/components/DownloadCard.vue";
import PlaceholderImage from "@/components/PlaceholderImage.vue";

const { data: item, loading, notFound } = useDetailPage<Download>(
  (id) => api.download(id)
);
const downloading = ref(false);
const showModal = ref(false);

const iconMap: Record<string, string> = {
  doc: "📄",
  camera: "📷",
  chip: "🔲",
  code: "💻",
  default: "📦",
};

function getFileName(f: any) {
  return Array.isArray(f) ? f[0] : f.name;
}
function getFileFormat(f: any) {
  return Array.isArray(f) ? f[2] : f.format;
}
function getFileSize(f: any) {
  return Array.isArray(f) ? f[1] : f.size;
}
function getFileUrl(f: any) {
  return Array.isArray(f) ? f[3] : f.url;
}

const pendingFile = computed(() => {
  const file = item.value?.files?.[0];
  if (!file) return null;
  return {
    name: getFileName(file),
    format: getFileFormat(file),
    size: getFileSize(file),
    url: getFileUrl(file),
  };
});

function openModal() {
  if (!pendingFile.value) return;
  showModal.value = true;
}

function cancelDownload() {
  showModal.value = false;
}

async function confirmDownload() {
  if (!pendingFile.value || downloading.value) return;
  showModal.value = false;
  downloading.value = true;
  try {
    await api.downloadCount(item.value!.id);
    const url = pendingFile.value.url;
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = pendingFile.value.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    if (pendingFile.value) {
      window.open(pendingFile.value.url, "_blank");
    }
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <div>
    <PageHero :title="item?.name || '软件资料'" :sub="item?.intro" />

    <section class="section">
      <div class="container">
        <div v-if="loading" class="dd-loading">
          <div class="skeleton" style="height: 200px"></div>
          <div class="skeleton" style="height: 160px; margin-top: 24px"></div>
        </div>

        <div v-else-if="notFound" class="empty">
          <div class="empty-icon">⚠️</div>
          <p>软件资料不存在</p>
        </div>

        <template v-else-if="item">
          <div class="dd-layout">
            <div class="dd-main">
              <Reveal>
                <PlaceholderImage :src="item.cover" icon="doc" height="280px" type="download" class="dd-cover" />
              </Reveal>
              <Reveal>
                <div class="dd-card">
                  <div class="dd-card__head">
                    <div class="dd-card__icon">{{ iconMap[item.icon] || iconMap.default }}</div>
                    <div class="dd-card__info">
                      <div class="dd-card__tags">
                        <span class="tag">{{ item.category_name }}</span>
                        <span class="dd-card__ver">版本 v{{ item.version }}</span>
                      </div>
                      <h1>{{ item.name }}</h1>
                      <p>{{ item.intro }}</p>
                    </div>
                  </div>
                  <button class="btn btn--primary btn--lg dd-card__btn" :disabled="downloading" @click="openModal">
                    {{ downloading ? "准备中..." : "立即下载" }} <span>↓</span>
                  </button>
                  <div class="dd-card__meta">
                    <span>📦 文件大小：{{ item.size }}</span>
                    <span class="num">👁 下载次数：{{ item.download_count }}</span>
                  </div>
                </div>
              </Reveal>

              <Reveal v-if="item.detail">
                <div class="dd-block">
                  <h2>资料说明</h2>
                  <div class="dd-text" v-html="(item.detail || '').replace(/\n/g, '<br/>')"></div>
                </div>
              </Reveal>

              <Reveal v-if="item.files && item.files.length">
                <div class="dd-block">
                  <h2>文件清单</h2>
                  <div class="dd-files">
                    <div v-for="(f, i) in item.files" :key="i" class="dd-file">
                      <span class="dd-file__icon">📄</span>
                      <div class="dd-file__info">
                        <span class="dd-file__name">{{ getFileName(f) }}</span>
                        <span class="dd-file__size">{{ getFileSize(f) }} · {{ getFileFormat(f) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal v-if="item.update_log">
                <div class="dd-block">
                  <h2>更新日志</h2>
                  <p class="dd-text">{{ item.update_log }}</p>
                </div>
              </Reveal>

              <Reveal v-if="item.system_require">
                <div class="dd-block">
                  <h2>系统要求</h2>
                  <p class="dd-text">{{ item.system_require }}</p>
                </div>
              </Reveal>
            </div>

            <aside class="dd-side">
              <Reveal delay="1">
                <div class="dd-block">
                  <h2>下载须知</h2>
                  <ul class="dd-notes">
                    <li>下载前请阅读资料说明与系统要求</li>
                    <li>固件升级前请务必备份配置文件</li>
                    <li>如遇下载问题请联系技术支持</li>
                  </ul>
                </div>
              </Reveal>

              <Reveal v-if="item.related && item.related.length" delay="1">
                <h2 class="dd-side__title">相关推荐</h2>
                <div class="dd-related">
                  <DownloadCard v-for="r in item.related.slice(0, 2)" :key="r.id" :item="r" />
                </div>
              </Reveal>
            </aside>
          </div>
        </template>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="cancelDownload">
          <div class="modal-card">
            <div class="modal-card__icon">
              <span>📦</span>
            </div>
            <h3 class="modal-card__title">确认下载</h3>
            <div class="modal-card__file">
              <span class="modal-card__name">{{ pendingFile?.name }}</span>
              <div class="modal-card__meta">
                <span class="modal-card__tag">{{ pendingFile?.format }}</span>
                <span class="modal-card__size">{{ pendingFile?.size }}</span>
              </div>
            </div>
            <p class="modal-card__tip">⚠️ 请注意网络安全，不要打开来源不明的文件</p>
            <div class="modal-card__actions">
              <button class="btn btn--outline modal-card__btn" @click="cancelDownload">取消</button>
              <button class="btn btn--primary modal-card__btn" @click="confirmDownload">确认下载</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dd-layout {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 28px;
  align-items: start;
}

.dd-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  padding: 28px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.dd-cover {
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 20px;
}

.dd-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-brand);
  opacity: 0.5;
}

.dd-card__head {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.dd-card__icon {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.1), rgba(0, 200, 255, 0.14));
  border: 1px solid rgba(11, 95, 255, 0.14);
  transition: transform var(--duration-normal) var(--ease-spring);
}

.dd-card:hover .dd-card__icon {
  transform: scale(1.05);
}

.dd-card__tags {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dd-card__ver {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-num);
}

.dd-card h1 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 10px;
}

.dd-card__info p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.9;
}

.dd-card__btn {
  width: 100%;
  margin-bottom: 16px;
}

.dd-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-tertiary);
}

.dd-block {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  padding: 24px;
  margin-bottom: 20px;
}

.dd-block h2 {
  font-size: 19px;
  font-weight: 700;
  margin-bottom: 16px;
  padding-left: 14px;
  border-left: 4px solid var(--brand-500);
}

.dd-text {
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 2.1;
}

.dd-files {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dd-file {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-light);
  border: 1px solid var(--border-light);
  transition: all var(--duration-fast);
}

.dd-file:hover {
  background: #fff;
  border-color: rgba(11, 95, 255, 0.15);
  box-shadow: 0 2px 12px rgba(11, 95, 255, 0.06);
  transform: translateX(4px);
}

.dd-file__icon {
  font-size: 22px;
}

.dd-file__info {
  display: flex;
  flex-direction: column;
}

.dd-file__name {
  font-size: 14px;
  font-weight: 600;
}

.dd-file__size {
  font-size: 12.5px;
  color: var(--text-tertiary);
  font-family: var(--font-num);
}

.dd-notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: var(--text-secondary);
}

.dd-notes li {
  display: flex;
  gap: 8px;
}

.dd-notes li::before {
  content: "•";
  color: var(--brand-500);
  font-weight: 700;
}

.dd-side__title {
  font-size: 19px;
  font-weight: 700;
  margin-bottom: 16px;
  padding-left: 14px;
  border-left: 4px solid var(--brand-500);
}

.dd-related {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 900px) {
  .dd-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .dd-card__head {
    flex-direction: column;
  }
}

/* ========== 下载确认弹窗 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 24px;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 36px 32px 28px;
  text-align: center;
  box-shadow: var(--shadow-xl), 0 0 0 1px rgba(11, 95, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.modal-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--grad-brand);
}

.modal-card__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.08), rgba(0, 200, 255, 0.1));
  border: 1px solid rgba(11, 95, 255, 0.12);
}

.modal-card__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.modal-card__file {
  background: var(--bg-light);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid var(--border-light);
}

.modal-card__name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-all;
  margin-bottom: 10px;
  line-height: 1.5;
}

.modal-card__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.modal-card__tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(11, 95, 255, 0.08);
  color: var(--brand-600);
  letter-spacing: 0.5px;
}

.modal-card__size {
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-num);
}

.modal-card__tip {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 24px;
  line-height: 1.6;
}

.modal-card__actions {
  display: flex;
  gap: 12px;
}

.modal-card__btn {
  flex: 1;
}

/* 过渡动画 */
.modal-enter-active {
  transition: opacity 0.25s var(--ease-out);
}
.modal-enter-active .modal-card {
  transition: transform 0.3s var(--ease-spring), opacity 0.25s var(--ease-out);
}
.modal-leave-active {
  transition: opacity 0.2s var(--ease-out);
}
.modal-leave-active .modal-card {
  transition: transform 0.2s var(--ease-out), opacity 0.2s var(--ease-out);
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .modal-card {
  transform: scale(0.92) translateY(20px);
  opacity: 0;
}
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to .modal-card {
  transform: scale(0.95);
  opacity: 0;
}

@media (max-width: 480px) {
  .modal-card {
    padding: 28px 20px 22px;
  }
  .modal-card__actions {
    flex-direction: column;
  }
}
</style>