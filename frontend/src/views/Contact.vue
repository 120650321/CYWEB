<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api, type SiteInfo } from "@/api";
import PageHero from "@/components/PageHero.vue";
import Reveal from "@/components/Reveal.vue";
import ContactForm from "@/components/ContactForm.vue";

const site = ref<SiteInfo>({});
const loading = ref(true);

onMounted(async () => {
  try {
    site.value = await api.contact();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <PageHero title="联系我们" sub="无论您是产品咨询、方案设计还是项目实施需求，欢迎随时联系。提供软硬件定制开发、系统集成、平台部署实施与售后技术支持服务" />

    <section class="section">
      <div class="container">
        <!-- 联系方式卡片 -->
        <div class="ct-cards">
          <Reveal v-for="(c, i) in [
            { icon: '📞', title: '服务热线', value: site.site_phone || '0871-6789 0000', extra: '周一至周日 9:00 - 18:00', href: `tel:${(site.site_phone || '').replace(/\s/g, '')}` },
            { icon: '📱', title: '咨询手机', value: site.site_mobile || '138 8888 0000', extra: '7×24 小时服务', href: `tel:${(site.site_mobile || '').replace(/\s/g, '')}` },
            { icon: '✉️', title: '电子邮箱', value: site.site_email || 'info@ynyzzn.com', extra: '邮件回复不超过 24 小时', href: `mailto:${site.site_email || ''}` },
            { icon: '📍', title: '公司地址', value: site.site_address || '', extra: '欢迎莅临参观洽谈', href: '' },
          ]" :key="i" :delay="i % 4" class="ct-cards__item">
            <a class="ct-card" :href="c.href || undefined">
              <div class="ct-card__icon">{{ c.icon }}</div>
              <h3>{{ c.title }}</h3>
              <p class="ct-card__value">{{ c.value }}</p>
              <p class="ct-card__extra">{{ c.extra }}</p>
            </a>
          </Reveal>
        </div>

        <!-- 留言表单 + 信息 -->
        <Reveal>
          <div class="ct-main">
            <div class="ct-form">
              <div class="ct-form__head">
                <span class="sec-tag">LEAVE A MESSAGE</span>
                <h2>在线留言</h2>
                <p>请填写以下信息，我们将尽快与您联系</p>
              </div>
              <ContactForm />
            </div>
            <div class="ct-info">
              <h3>公司信息</h3>
              <ul>
                <li><span class="k">公司全称</span><span>{{ site.site_name || "云南驰耀科技有限公司" }}</span></li>
                <li><span class="k">官方网站</span><span>{{ site.site_domain || "ynyzzn.com" }}</span></li>
                <li><span class="k">服务热线</span><span>{{ site.site_phone || "0871-6789 0000" }}</span></li>
                <li><span class="k">咨询手机</span><span>{{ site.site_mobile || "138 8888 0000" }}</span></li>
                <li><span class="k">电子邮箱</span><span>{{ site.site_email || "info@ynyzzn.com" }}</span></li>
                <li><span class="k">公司地址</span><span>{{ site.site_address || "" }}</span></li>
              </ul>
              <div class="ct-qr">
                <h4>扫码关注</h4>
                <div class="ct-qr__grid">
                  <div class="ct-qr__item">
                    <div class="ct-qr__img">
                      <span class="ct-qr__placeholder">📱</span>
                    </div>
                    <p>微信公众号</p>
                  </div>
                  <div class="ct-qr__item">
                    <div class="ct-qr__img">
                      <span class="ct-qr__placeholder">💬</span>
                    </div>
                    <p>微信客服</p>
                  </div>
                </div>
              </div>
              <div class="ct-info__note">
                <span>💡</span>
                <p>如需获取产品白皮书、方案建议书或项目报价，请直接致电，我们将在 24 小时内响应。</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sec-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--brand-600);
  background: rgba(11, 95, 255, 0.08);
  border: 1px solid rgba(11, 95, 255, 0.18);
  margin-bottom: 14px;
}

.ct-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
  margin-bottom: 40px;
}

.ct-card {
  display: block;
  text-align: center;
  padding: 28px 20px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
  height: 100%;
  position: relative;
  overflow: hidden;
}

.ct-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-brand);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-normal) var(--ease-out);
}

.ct-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11, 95, 255, 0.2);
}

.ct-card:hover::before {
  transform: scaleX(1);
}

.ct-card__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.1), rgba(0, 200, 255, 0.14));
  border: 1px solid rgba(11, 95, 255, 0.14);
  transition: transform var(--duration-normal) var(--ease-spring);
}

.ct-card:hover .ct-card__icon {
  transform: scale(1.08);
}

.ct-card h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}

.ct-card__value {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-600);
  margin-bottom: 6px;
  word-break: break-all;
  transition: color var(--duration-fast);
}

.ct-card:hover .ct-card__value {
  background: var(--grad-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.ct-card__extra {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.ct-main {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 28px;
  align-items: start;
}

.ct-form {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  padding: 0;
  overflow: hidden;
}

.ct-form__head {
  padding: 28px 32px 0;
}

.ct-form__head h2 {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 8px;
  background: linear-gradient(120deg, var(--navy-800), var(--brand-600));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ct-form__head p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 28px;
}

.ct-info {
  background: var(--grad-hero);
  border-radius: var(--radius-xl);
  padding: 32px 32px;
  color: #fff;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}

.ct-info::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(400px 260px at 90% 0%, rgba(0, 200, 255, 0.18), transparent 60%),
    radial-gradient(360px 240px at 0% 100%, rgba(11, 95, 255, 0.35), transparent 60%);
}

.ct-info::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent);
}

.ct-info h3 {
  position: relative;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.ct-info ul {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ct-info li {
  display: flex;
  gap: 14px;
  font-size: 14px;
  line-height: 1.7;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all var(--duration-fast);
}

.ct-info li:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.12);
}

.ct-info .k {
  flex-shrink: 0;
  width: 72px;
  color: rgba(255, 255, 255, 0.6);
}

.ct-info li span:last-child {
  color: rgba(255, 255, 255, 0.92);
  font-weight: 500;
}

.ct-qr {
  position: relative;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.ct-qr h4 {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.9);
}

.ct-qr__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.ct-qr__item {
  text-align: center;
}

.ct-qr__img {
  width: 100%;
  aspect-ratio: 1;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  border: 2px solid rgba(0, 200, 255, 0.25);
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}

.ct-qr__item:hover .ct-qr__img {
  border-color: rgba(0, 200, 255, 0.6);
  box-shadow: 0 0 24px rgba(0, 200, 255, 0.2);
}

.ct-qr__placeholder {
  font-size: 40px;
  opacity: 0.5;
}

.ct-qr__item p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
}

.ct-info__note {
  position: relative;
  display: flex;
  gap: 12px;
  margin-top: 28px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(0,200,255,0.08);
  border: 1px solid rgba(0,200,255,0.18);
  font-size: 13px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
}

@media (max-width: 900px) {
  .ct-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .ct-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .ct-cards {
    grid-template-columns: 1fr;
  }
}
</style>