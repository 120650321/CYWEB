<script setup lang="ts">
import { useSiteStore } from "@/stores/site";

const site = useSiteStore();

const quickLinks = [
  { label: "产品中心", path: "/产品中心" },
  { label: "解决方案", path: "/解决方案" },
  { label: "案例展示", path: "/案例展示" },
  { label: "软件资料", path: "/软件资料" },
  { label: "新闻资讯", path: "/新闻资讯" },
  { label: "联系我们", path: "/联系我们" },
];

const supportLinks = [
  { label: "关于我们", path: "/关于我们" },
  { label: "产品与服务", path: "/产品中心" },
  { label: "解决方案", path: "/解决方案" },
  { label: "在线留言", path: "/联系我们" },
];
</script>

<template>
  <footer class="app-footer">
    <div class="container app-footer__main">
      <div class="app-footer__brand">
        <div class="app-footer__logo">
          <img src="/logo.png" alt="驰耀科技" />
          <div>
            <p class="app-footer__name">{{ site.name }}</p>
            <p class="app-footer__en">{{ site.enName }}</p>
          </div>
        </div>
        <p class="app-footer__desc">{{ site.site_description || "云南驰耀科技有限公司深耕行业数字化领域，以物联网平台、智能监测系统、智慧化解决方案、安防监控与信息化系统集成为核心业务，提供软硬件一体化全栈技术服务。" }}</p>
        <p class="app-footer__slogan">
          <span class="app-footer__slogan-line"></span>
          {{ site.slogan }}
        </p>
      </div>

      <div class="app-footer__col">
        <h4>快速导航</h4>
        <ul>
          <li v-for="l in quickLinks" :key="l.path">
            <router-link :to="l.path">{{ l.label }}</router-link>
          </li>
        </ul>
      </div>

      <div class="app-footer__col">
        <h4>帮助中心</h4>
        <ul>
          <li v-for="l in supportLinks" :key="l.path">
            <router-link :to="l.path">{{ l.label }}</router-link>
          </li>
        </ul>
      </div>

      <div class="app-footer__col">
        <h4>联系方式</h4>
        <ul class="app-footer__contact">
          <li><span class="ic">☎</span><a :href="`tel:${site.phone.replace(/\s/g, '')}`">{{ site.phone }}</a></li>
          <li><span class="ic">📱</span><a :href="`tel:${site.mobile.replace(/\s/g, '')}`">{{ site.mobile }}</a></li>
          <li><span class="ic">✉</span><a :href="`mailto:${site.email}`">{{ site.email }}</a></li>
          <li><span class="ic">📍</span>{{ site.address }}</li>
        </ul>
      </div>
    </div>

    <div class="app-footer__bottom">
      <div class="container app-footer__bottom-inner">
        <span>Copyright © 2024 {{ site.name }} 版权所有</span>
        <span>
          <a :href="site.site_icp_url || 'https://beian.miit.gov.cn'" target="_blank" rel="noopener" class="icp-link">
            {{ site.icp }}
          </a>
          <span class="dot">·</span>
          {{ site.domain }}
        </span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: var(--navy-900);
  color: rgba(255, 255, 255, 0.72);
  position: relative;
  overflow: hidden;
}

.app-footer::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-600), var(--cyan-500), var(--brand-600));
}

.app-footer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(600px 400px at 80% 0%, rgba(0, 200, 255, 0.04), transparent 60%),
    radial-gradient(500px 350px at 10% 100%, rgba(11, 95, 255, 0.06), transparent 60%);
  pointer-events: none;
}

.app-footer__main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
  gap: 40px;
  padding: 52px 24px 40px;
}

.app-footer__brand {
  position: relative;
}

.app-footer__brand::before {
  content: "";
  position: absolute;
  top: -20px;
  left: -20px;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(0,200,255,0.08), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.app-footer__logo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.app-footer__logo img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 5px;
}

.app-footer__name {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
}

.app-footer__en {
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--cyan-400);
  font-family: var(--font-num);
  margin-top: 2px;
}

.app-footer__desc {
  font-size: 14px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 18px;
}

.app-footer__slogan {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--cyan-400);
  font-weight: 600;
}

.app-footer__slogan-line {
  width: 32px;
  height: 2px;
  background: var(--grad-cyan);
  border-radius: 2px;
}

.app-footer__col h4 {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 22px;
  position: relative;
  padding-bottom: 12px;
}

.app-footer__col h4::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 28px;
  height: 2px;
  background: var(--grad-cyan);
  border-radius: 2px;
}

.app-footer__col ul {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-footer__col li a {
  color: rgba(255, 255, 255, 0.62);
  font-size: 14px;
  transition: color var(--duration-fast);
  position: relative;
  display: inline-block;
}

.app-footer__col li a::before {
  content: "→";
  position: absolute;
  left: -16px;
  opacity: 0;
  transition: all var(--duration-fast);
  color: var(--cyan-400);
}

.app-footer__col li a:hover {
  color: var(--cyan-400);
  padding-left: 0;
}

.app-footer__col li a:hover::before {
  opacity: 1;
  left: -14px;
}

.app-footer__contact li {
  display: flex;
  gap: 10px;
  font-size: 14px;
  line-height: 1.7;
}

.app-footer__contact .ic {
  color: var(--cyan-400);
  flex-shrink: 0;
}

.app-footer__contact a:hover {
  color: var(--cyan-400);
}

.app-footer__bottom {
  position: relative;
  z-index: 1;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 18px 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.38);
  background: rgba(0,0,0,0.2);
}

.app-footer__bottom-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.icp-link:hover {
  color: var(--cyan-400);
}

.dot {
  margin: 0 8px;
  opacity: 0.5;
}

@media (max-width: 900px) {
  .app-footer__main {
    grid-template-columns: 1fr 1fr;
    gap: 36px;
  }
}

@media (max-width: 560px) {
  .app-footer__main {
    grid-template-columns: 1fr;
  }
}
</style>