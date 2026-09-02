<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";

const showTop = ref(false);
const onScroll = () => (showTop.value = window.scrollY > 600);
const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

onMounted(() => window.addEventListener("scroll", onScroll, { passive: true }));
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <AppHeader />
  <main>
    <RouterView />
  </main>
  <AppFooter />

  <transition name="fade">
    <button v-if="showTop" class="back-top" @click="toTop" aria-label="返回顶部">↑</button>
  </transition>
</template>

<style scoped>
.back-top {
  position: fixed;
  right: 28px;
  bottom: 32px;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--grad-brand);
  color: #fff;
  font-size: 20px;
  box-shadow: 0 10px 28px rgba(11, 95, 255, 0.45);
  z-index: 90;
  transition: transform var(--duration-normal) var(--ease-out);
}

.back-top:hover {
  transform: translateY(-4px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
