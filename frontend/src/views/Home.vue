<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { api, type HomeData } from "@/api";
import Reveal from "@/components/Reveal.vue";
import Counter from "@/components/Counter.vue";
import SectionTitle from "@/components/SectionTitle.vue";
import ProductCard from "@/components/ProductCard.vue";
import CaseCard from "@/components/CaseCard.vue";
import ArticleCard from "@/components/ArticleCard.vue";
import ContactForm from "@/components/ContactForm.vue";
import { useSiteStore } from "@/stores/site";
import { normalizeRoutePath } from "@/router";

const site = useSiteStore();
const home = ref<HomeData | null>(null);
const loading = ref(true);

const bannerIndex = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const currentBanner = computed(() => home.value?.banners?.[bannerIndex.value]);

function resolveBannerButtonText(raw?: string, path?: string) {
  const value = (raw || "").trim();
  const routeMap: Record<string, string> = {
    "/about": "关于我们", "/关于我们": "关于我们",
    "/products": "了解产品", "/产品中心": "了解产品",
    "/solutions": "解决方案", "/解决方案": "解决方案",
    "/cases": "查看案例", "/案例展示": "查看案例",
    "/downloads": "下载资料", "/软件资料": "下载资料",
    "/news": "了解资讯", "/新闻资讯": "了解资讯",
    "/contact": "在线咨询", "/联系我们": "在线咨询",
  };
  if (!value) return routeMap[normalizeRoutePath(path || "/产品中心", "/产品中心")] || "了解更多";
  if (routeMap[value]) return routeMap[value];
  if (value.startsWith("/")) return routeMap[normalizeRoutePath(value, path || "/产品中心")] || "了解更多";
  return value;
}

function toBannerRoute(path?: string) {
  return normalizeRoutePath(path || "/产品中心", "/产品中心");
}

function nextBanner() {
  const total = home.value?.banners?.length || 0;
  if (total > 1) bannerIndex.value = (bannerIndex.value + 1) % total;
}

function startAuto() { stopAuto(); timer = setInterval(nextBanner, 4000); }
function stopAuto() { if (timer) clearInterval(timer); timer = null; }

onMounted(async () => {
  try { home.value = await api.home(); } finally { loading.value = false; }
  startAuto();
});

onBeforeUnmount(stopAuto);
</script>

<template>
  <div class="home">
    <!-- ======= Hero Banner ======= -->
    <section class="hero" @mouseenter="stopAuto" @mouseleave="startAuto">
      <div class="hero__bg">
        <template v-for="(b, i) in home?.banners || []" :key="i">
          <div class="hero__slide" :class="{ 'hero__slide--active': i === bannerIndex }" :style="{ background: b.bg_color || 'var(--grad-hero)' }">
            <div class="hero__grid"></div>
            <div class="hero__glow hero__glow--1"></div>
            <div class="hero__glow hero__glow--2"></div>
            <div class="hero__orb hero__orb--1"></div>
            <div class="hero__orb hero__orb--2"></div>
          </div>
        </template>
      </div>

      <div class="container hero__content">
        <template v-if="currentBanner">
          <Reveal>
            <span class="hero__slogan">{{ currentBanner.slogan || site.slogan }}</span>
          </Reveal>
          <Reveal delay="1">
            <h1 class="hero__title">{{ currentBanner.title }}</h1>
          </Reveal>
          <Reveal delay="2">
            <p class="hero__sub">{{ currentBanner.subtitle }}</p>
          </Reveal>
          <Reveal delay="3">
            <div class="hero__actions">
              <router-link :to="toBannerRoute(currentBanner.link)" class="btn btn--primary btn--lg">
                {{ resolveBannerButtonText(currentBanner.button_text, currentBanner.link) }} <span class="hero__arrow">→</span>
              </router-link>
              <router-link to="/联系我们" class="btn btn--ghost btn--lg">在线咨询</router-link>
            </div>
          </Reveal>
        </template>

        <div v-if="(home?.banners?.length || 0) > 1" class="hero__dots">
          <button v-for="(b, i) in home!.banners" :key="i" class="hero__dot" :class="{ 'hero__dot--active': i === bannerIndex }" @click="bannerIndex = i" :aria-label="`第 ${i + 1} 张`"></button>
        </div>
      </div>

      <div class="hero__scroll" @click="() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })">
        <span>SCROLL</span>
        <i></i>
      </div>
    </section>

    <!-- ======= 核心能力 ======= -->
    <section id="capabilities" class="section">
      <div class="container">
        <Reveal>
          <SectionTitle tag="CORE STRENGTH" title="核心能力" :desc="home ? '' : '从产品研发到方案落地，构建端到端的智慧化服务能力'" />
        </Reveal>
        <div class="caps">
          <Reveal v-for="(c, i) in (home?.capabilities || []).slice(0, 4)" :key="i" :delay="i % 4" class="caps__item">
            <div class="cap-card">
              <div class="cap-card__icon"><span>{{ ["🖥️", "🗂️", "🛠️", "🎧"][i] || "◆" }}</span></div>
              <h3>{{ c.title }}</h3>
              <p>{{ c.desc }}</p>
              <div class="cap-card__stat">
                <span class="cap-card__num num"><Counter :value="c.num || 0" />{{ c.suffix || "+" }}</span>
                <span class="cap-card__label">{{ c.label }}</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>

    <!-- ======= 产品速览 ======= -->
    <section class="section section--light">
      <div class="container">
        <Reveal>
          <SectionTitle tag="PRODUCTS" title="产品中心" desc="自主研发物联网平台与智能硬件，为各行业数字化提供核心产品支撑" />
        </Reveal>
        <div class="grid-4">
          <Reveal v-for="(p, i) in (home?.products || []).slice(0, 4)" :key="p.id" :delay="i % 4">
            <ProductCard :product="p" />
          </Reveal>
        </div>
        <Reveal class="home__more">
          <router-link to="/产品中心" class="btn btn--outline">查看全部产品 →</router-link>
        </Reveal>
      </div>
    </section>

    <!-- ======= 解决方案 ======= -->
    <section class="section section--dark">
      <div class="container">
        <Reveal>
          <SectionTitle tag="SOLUTIONS" title="行业解决方案" desc="面向行业场景深度定制的智慧化整体方案" dark />
        </Reveal>
        <div class="grid-3">
          <Reveal v-for="(s, i) in (home?.solutions || []).slice(0, 3)" :key="s.id" :delay="i % 3">
            <div class="glass-card sol-card">
              <span class="sol-card__num num">{{ String(i + 1).padStart(2, "0") }}</span>
              <span class="sol-card__ind">{{ s.industry }}</span>
              <h3>{{ s.name }}</h3>
              <p>{{ s.intro }}</p>
              <ul class="sol-card__points">
                <li v-for="(v, vi) in (s.value_points || []).slice(0, 3)" :key="vi">{{ v }}</li>
              </ul>
              <router-link :to="`/解决方案/${s.id}`" class="sol-card__link">查看方案详情 →</router-link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>

    <!-- ======= 数据统计 ======= -->
    <section class="stats">
      <div class="container stats__inner">
        <div class="stat-item"><span class="num stat-item__num"><Counter :value="8" /></span><span class="stat-item__label">年行业深耕</span></div>
        <div class="stat-item"><span class="num stat-item__num"><Counter :value="120" />+</span><span class="stat-item__label">交付项目案例</span></div>
        <div class="stat-item"><span class="num stat-item__num"><Counter :value="30" />+</span><span class="stat-item__label">自研产品技术</span></div>
        <div class="stat-item"><span class="num stat-item__num"><Counter :value="24" />h</span><span class="stat-item__label">7×24 服务响应</span></div>
      </div>
    </section>

    <!-- ======= 案例展示 ======= -->
    <section class="section">
      <div class="container">
        <Reveal>
          <SectionTitle tag="CASES" title="典型案例" desc="深耕行业场景，用真实交付案例验证方案价值" />
        </Reveal>
        <div class="grid-3">
          <Reveal v-for="(c, i) in (home?.cases || []).slice(0, 3)" :key="c.id" :delay="i % 3">
            <CaseCard :item="c" />
          </Reveal>
        </div>
        <Reveal class="home__more">
          <router-link to="/案例展示" class="btn btn--outline">查看全部案例 →</router-link>
        </Reveal>
      </div>
    </section>

    <!-- ======= 新闻资讯 ======= -->
    <section class="section section--light">
      <div class="container">
        <Reveal>
          <SectionTitle tag="NEWS" title="新闻资讯" desc="关注驰耀动态，掌握行业前沿技术与资讯" />
        </Reveal>
        <div class="grid-4">
          <Reveal v-for="(a, i) in (home?.articles || []).slice(0, 4)" :key="a.id" :delay="i % 4">
            <ArticleCard :item="a" />
          </Reveal>
        </div>
      </div>
    </section>

    <!-- ======= 合作伙伴 ======= -->
    <section class="section partners-sec">
      <div class="container">
        <Reveal>
          <SectionTitle tag="PARTNERS" title="合作伙伴" desc="携手行业伙伴，共建智慧物联生态" />
        </Reveal>
        <div class="partners">
          <Reveal v-for="(p, i) in (home?.partners || []).slice(0, 6)" :key="i" :delay="i % 6" class="partners__item">
            <div class="partner-chip">
              <span class="partner-chip__icon">{{ ["🛡️", "☁️", "📷", "☁️", "👁️", "📡"][i] || "◆" }}</span>
              <span class="partner-chip__name">{{ p.name }}</span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>

    <!-- ======= 联系 CTA ======= -->
    <section class="section cta-sec">
      <div class="container">
        <Reveal>
          <div class="cta-banner">
            <div class="cta-banner__info">
              <span class="cta-banner__tag">CONTACT US</span>
              <h2>{{ "开启智慧物联合作" }}</h2>
              <p>{{ "无论您是产品咨询、方案设计还是项目实施需求，欢迎随时与我们联系，我们将在 24 小时内响应。" }}</p>
              <div class="cta-banner__contacts">
                <a class="cta-chip" :href="`tel:${site.phone.replace(/\s/g, '')}`"><span>📞</span> {{ site.phone }}</a>
                <a class="cta-chip" :href="`mailto:${site.email}`"><span>✉️</span> {{ site.email }}</a>
              </div>
            </div>
            <div class="cta-banner__form">
              <ContactForm />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ========== Hero ========== */
.hero{position:relative;min-height:92vh;display:flex;align-items:center;overflow:hidden;color:#fff}
.hero__bg{position:absolute;inset:0}
.hero__slide{position:absolute;inset:0;opacity:0;transform:scale(1.08);transition:opacity 1.2s ease,transform 7s ease}
.hero__slide--active{opacity:1;transform:scale(1)}
.hero__grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.055) 1px,transparent 1px);background-size:52px 52px;mask-image:linear-gradient(to bottom,rgba(0,0,0,0.9),transparent 92%);-webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,0.9),transparent 92%)}
.hero__glow{position:absolute;border-radius:50%;filter:blur(90px);opacity:0.5}
.hero__glow--1{width:520px;height:520px;background:rgba(11,95,255,0.55);top:-140px;right:-80px}
.hero__glow--2{width:420px;height:420px;background:rgba(0,200,255,0.35);bottom:-120px;left:12%}
.hero__orb{position:absolute;border:1px solid rgba(0,200,255,0.25);border-radius:50%}
.hero__orb--1{width:420px;height:420px;right:12%;top:18%;animation:spin 36s linear infinite}
.hero__orb--2{width:620px;height:620px;right:7%;top:6%;border-color:rgba(255,255,255,0.07);animation:spin 52s linear infinite reverse}
.hero__orb::before,.hero__orb::after{content:"";position:absolute;width:8px;height:8px;border-radius:50%}
.hero__orb::before{background:var(--cyan-400);box-shadow:0 0 16px var(--cyan-400);top:8%;left:12%}
.hero__orb::after{top:auto;bottom:14%;left:auto;right:6%;background:var(--brand-500);box-shadow:0 0 16px var(--brand-500)}
@keyframes spin{to{transform:rotate(360deg)}}
.hero__content{position:relative;z-index:2;padding-top:40px}
.hero__content>*{position:relative;z-index:2}
.hero__slogan{display:inline-flex;align-items:center;gap:10px;font-size:14px;letter-spacing:3px;color:var(--cyan-400);padding:8px 20px;border:1px solid rgba(0,200,255,0.35);border-radius:999px;background:rgba(0,200,255,0.08);backdrop-filter:blur(8px);margin-bottom:26px}
.hero__slogan::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--cyan-400);box-shadow:0 0 10px var(--cyan-400)}
.hero__title{font-size:clamp(36px,5vw,58px);font-weight:800;line-height:1.18;letter-spacing:3px;margin-bottom:20px;text-shadow:0 4px 32px rgba(0,0,0,0.3);max-width:720px}
.hero__sub{font-size:17px;line-height:1.9;color:rgba(255,255,255,0.82);max-width:620px;margin-bottom:30px;text-shadow:0 4px 24px rgba(0,0,0,0.2)}
.hero__actions{display:flex;gap:16px;flex-wrap:wrap}
.hero__arrow{transition:transform var(--duration-fast)}
.hero__actions .btn:hover .hero__arrow{transform:translateX(4px)}
.hero__dots{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:3}
.hero__dot{width:10px;height:10px;border-radius:999px;background:rgba(255,255,255,0.35);transition:all var(--duration-normal) var(--ease-out)}
.hero__dot--active{width:32px;background:var(--grad-cyan);box-shadow:0 0 12px rgba(0,200,255,0.6)}
.hero__scroll{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;z-index:3}
.hero__scroll span{font-size:11px;letter-spacing:4px;color:rgba(255,255,255,0.5);font-family:var(--font-num)}
.hero__scroll i{width:2px;height:40px;border-radius:2px;background:linear-gradient(to bottom,var(--cyan-400),transparent);animation:scrollHint 1.8s ease-in-out infinite}
@keyframes scrollHint{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}

/* ========== 核心能力 ========== */
.caps{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.cap-card{position:relative;background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--border-light);padding:24px 24px;height:100%;overflow:hidden;transition:transform var(--duration-normal) var(--ease-out),box-shadow var(--duration-normal) var(--ease-out)}
.cap-card::after{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:var(--grad-brand);transform:scaleX(0);transform-origin:left;transition:transform var(--duration-normal) var(--ease-out)}
.cap-card:hover{transform:translateY(-6px);box-shadow:var(--shadow-lg)}
.cap-card:hover::after{transform:scaleX(1)}
.cap-card__icon{width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;background:linear-gradient(135deg,rgba(11,95,255,0.1),rgba(0,200,255,0.14));border:1px solid rgba(11,95,255,0.14);margin-bottom:16px}
.cap-card h3{font-size:19px;font-weight:700;margin-bottom:10px}
.cap-card p{font-size:14px;color:var(--text-secondary);line-height:1.8;margin-bottom:14px}
.cap-card__stat{display:flex;align-items:baseline;gap:8px;padding-top:14px;border-top:1px dashed var(--border-mid)}
.cap-card__num{font-size:28px;font-weight:800;background:linear-gradient(120deg,var(--brand-600),var(--cyan-500));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.cap-card__label{font-size:12.5px;color:var(--text-tertiary)}

.home__more{text-align:center;margin-top:36px}

/* ========== 解决方案 ========== */
.sol-card{padding:24px 26px;height:100%;position:relative;overflow:hidden;transition:transform var(--duration-normal) var(--ease-out),background var(--duration-normal)}
.sol-card:hover{transform:translateY(-8px);background:rgba(255,255,255,0.13)}
.sol-card__num{position:absolute;top:10px;right:20px;font-size:64px;font-weight:800;color:rgba(255,255,255,0.08);line-height:1}
.sol-card__ind{display:inline-block;font-size:12px;color:var(--cyan-400);border:1px solid rgba(0,200,255,0.3);padding:3px 12px;border-radius:999px;letter-spacing:1px;margin-bottom:16px}
.sol-card h3{font-size:20px;font-weight:700;color:#fff;margin-bottom:12px}
.sol-card p{font-size:14px;color:rgba(255,255,255,0.72);line-height:1.8;margin-bottom:14px}
.sol-card__points{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
.sol-card__points li{font-size:13.5px;color:rgba(255,255,255,0.85);display:flex;gap:8px}
.sol-card__points li::before{content:"✓";color:var(--cyan-400);font-weight:700}
.sol-card__link{font-size:14px;font-weight:600;color:var(--cyan-400);transition:letter-spacing var(--duration-fast)}
.sol-card__link:hover{letter-spacing:0.5px}

/* ========== 统计 ========== */
.stats{background:var(--grad-hero);position:relative;overflow:hidden;padding:0}
.stats::before{content:"";position:absolute;inset:0;background:radial-gradient(600px 300px at 20% 0%,rgba(0,200,255,0.12),transparent 60%),radial-gradient(600px 300px at 85% 100%,rgba(11,95,255,0.25),transparent 60%)}
.stats__inner{position:relative;display:grid;grid-template-columns:repeat(4,1fr);padding:44px 24px}
.stat-item{text-align:center;color:#fff;position:relative}
.stat-item:not(:last-child)::after{content:"";position:absolute;right:0;top:50%;transform:translateY(-50%);width:1px;height:52px;background:rgba(255,255,255,0.12)}
.stat-item__num{display:block;font-size:46px;font-weight:800;background:linear-gradient(120deg,#fff,var(--cyan-400));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;line-height:1.2;margin-bottom:8px}
.stat-item__label{font-size:14px;color:rgba(255,255,255,0.68);letter-spacing:1px}

/* ========== 合作伙伴 ========== */
.partners{display:grid;grid-template-columns:repeat(6,1fr);gap:18px}
.partner-chip{display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 12px;border-radius:var(--radius-md);border:1px solid var(--border-light);background:var(--bg-card);transition:all var(--duration-normal) var(--ease-out)}
.partner-chip:hover{transform:translateY(-5px);box-shadow:var(--shadow-md);border-color:rgba(11,95,255,0.25)}
.partner-chip__icon{font-size:26px;opacity:0.85}
.partner-chip__name{font-size:14px;font-weight:600;color:var(--text-primary)}

/* ========== CTA ========== */
.cta-sec{background:var(--bg-light)}
.cta-banner{display:grid;grid-template-columns:1.1fr 1fr;gap:0;border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-lg);border:1px solid var(--border-light)}
.cta-banner__info{background:var(--grad-hero);position:relative;overflow:hidden;padding:44px 40px;color:#fff}
.cta-banner__info::before{content:"";position:absolute;inset:0;background:radial-gradient(500px 300px at 10% 0%,rgba(0,200,255,0.15),transparent 60%),radial-gradient(420px 280px at 95% 100%,rgba(11,95,255,0.3),transparent 60%)}
.cta-banner__tag{display:inline-block;font-size:13px;letter-spacing:2px;color:var(--cyan-400);margin-bottom:18px}
.cta-banner__info h2{font-size:30px;font-weight:800;letter-spacing:1px;margin-bottom:16px;position:relative}
.cta-banner__info p{font-size:15px;color:rgba(255,255,255,0.78);line-height:1.9;margin-bottom:24px;position:relative}
.cta-banner__contacts{display:flex;gap:14px;flex-wrap:wrap;position:relative}
.cta-chip{display:inline-flex;align-items:center;gap:10px;padding:12px 20px;border-radius:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);backdrop-filter:blur(8px);color:#fff;font-size:14px;font-weight:600;transition:all var(--duration-fast)}
.cta-chip:hover{background:rgba(0,200,255,0.16);border-color:rgba(0,200,255,0.4);transform:translateY(-2px)}
.cta-banner__form{background:var(--bg-card);padding:36px 36px}

@media(max-width:1024px){.caps{grid-template-columns:repeat(2,1fr)}.partners{grid-template-columns:repeat(3,1fr)}.cta-banner{grid-template-columns:1fr}}
@media(max-width:640px){.caps{grid-template-columns:1fr}.stats__inner{grid-template-columns:repeat(2,1fr);gap:28px 12px}.stat-item:nth-child(2)::after{display:none}.stat-item__num{font-size:34px}.partners{grid-template-columns:repeat(2,1fr)}.hero{min-height:88vh}}
</style>