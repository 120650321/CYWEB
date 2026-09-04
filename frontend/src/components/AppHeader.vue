<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { useRoute } from "vue-router";
import { useSiteStore } from "@/stores/site";

const route = useRoute();
const site = useSiteStore();

const scrolled = ref(false);
const mobileOpen = ref(false);

const navs = [
  { label: "首页", path: "/" },
  { label: "关于我们", path: "/关于我们" },
  { label: "产品中心", path: "/产品中心" },
  { label: "解决方案", path: "/解决方案" },
  { label: "案例展示", path: "/案例展示" },
  { label: "软件资料", path: "/软件资料" },
  { label: "新闻资讯", path: "/新闻资讯" },
  { label: "联系我们", path: "/联系我们" },
];

const activePath = computed(() => route.path);

function onScroll() {
  scrolled.value = window.scrollY > 20;
}

onMounted(() => {
  site.load();
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});

onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));
</script>

<template>
  <header class="app-header" :class="{ 'app-header--scrolled': scrolled }">
    <div class="container app-header__inner">
      <router-link to="/" class="app-header__logo">
        <img src="/logo.png" alt="驰耀科技 LOGO" class="app-header__logo-img" />
        <div class="app-header__logo-text">
          <span class="app-header__logo-name">{{ site.shortName }}</span>
          <span class="app-header__logo-en">{{ site.enName }}</span>
        </div>
      </router-link>

      <nav class="app-header__nav">
        <router-link
          v-for="n in navs"
          :key="n.path"
          :to="n.path"
          class="app-header__link"
          :class="{ 'app-header__link--active': activePath === n.path || (n.path !== '/' && activePath.startsWith(n.path)) }"
        >
          {{ n.label }}
        </router-link>
      </nav>

      <div class="app-header__right">
        <a class="app-header__phone" :href="`tel:${site.phone.replace(/\s/g, '')}`">
          <span class="app-header__phone-icon">☎</span>
          <span class="app-header__phone-text num">{{ site.phone }}</span>
        </a>
        <button class="app-header__burger" :class="{ open: mobileOpen }" @click="mobileOpen = !mobileOpen" aria-label="菜单">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <transition name="drop">
      <nav v-if="mobileOpen" class="app-header__mobile">
        <router-link
          v-for="n in navs"
          :key="n.path"
          :to="n.path"
          class="app-header__m-link"
          :class="{ 'is-active': activePath === n.path || (n.path !== '/' && activePath.startsWith(n.path)) }"
          @click="mobileOpen = false"
        >
          {{ n.label }}
        </router-link>
      </nav>
    </transition>
  </header>
</template>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: var(--header-h);
  padding-top: var(--safe-area-top);
  transition: all var(--duration-normal) var(--ease-out);
}

.app-header--scrolled {
  background: rgba(10, 22, 51, 0.88);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 40px rgba(6, 14, 34, 0.4);
}

.app-header__inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.app-header__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.app-header__logo-img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px;
}

.app-header__logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.app-header__logo-name {
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 2px;
}

.app-header__logo-en {
  font-size: 10px;
  letter-spacing: 1.5px;
  color: var(--cyan-400);
  font-family: var(--font-num);
}

.app-header__nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-header__link {
  position: relative;
  padding: 10px 16px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.82);
  border-radius: 8px;
  transition: all var(--duration-fast);
  font-weight: 500;
}

.app-header__link::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 3px;
  width: 0;
  height: 2.5px;
  transform: translateX(-50%);
  background: var(--grad-cyan);
  border-radius: 2px;
  transition: width var(--duration-normal) var(--ease-spring);
}

.app-header__link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  text-shadow: 0 0 20px rgba(0,200,255,0.3);
}

.app-header__link--active {
  color: #fff;
  font-weight: 600;
}

.app-header__link--active::after {
  width: 65%;
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.app-header__phone {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  padding: 9px 18px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  transition: all var(--duration-fast);
  font-weight: 600;
}

.app-header__phone:hover {
  border-color: var(--cyan-400);
  background: rgba(0, 200, 255, 0.12);
  box-shadow: 0 0 20px rgba(0, 200, 255, 0.2), 0 0 0 4px rgba(0,200,255,0.05);
  transform: translateY(-1px);
}

.app-header__phone-icon {
  color: var(--cyan-400);
  font-size: 14px;
}

.app-header__phone-text {
  font-size: 14px;
  font-weight: 600;
}

.app-header__burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.app-header__burger span {
  display: block;
  height: 2px;
  width: 100%;
  background: #fff;
  border-radius: 2px;
  transition: all 0.3s var(--ease-out);
}

.app-header__burger.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.app-header__burger.open span:nth-child(2) {
  opacity: 0;
}
.app-header__burger.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.app-header__mobile {
  display: none;
  background: rgba(10, 22, 51, 0.97);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 0 16px;
}

.app-header__m-link {
  display: block;
  padding: 13px 28px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  border-left: 3px solid transparent;
  transition: all var(--duration-fast);
}

.app-header__m-link.is-active {
  color: var(--cyan-400);
  border-left-color: var(--cyan-400);
  background: rgba(0, 200, 255, 0.06);
}

.drop-enter-active,
.drop-leave-active {
  transition: all 0.3s var(--ease-out);
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (max-width: 1024px) {
  .app-header__nav {
    display: none;
  }
  .app-header__phone {
    display: none;
  }
  .app-header__burger {
    display: flex;
  }
  .app-header__mobile {
    display: block;
  }
}

@media (max-width: 480px) {
  .app-header__logo-name {
    font-size: 16px;
  }
  .app-header__logo-img {
    width: 36px;
    height: 36px;
  }
  .app-header__inner {
    gap: 12px;
  }
}
</style>