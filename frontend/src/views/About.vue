<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "@/api";
import PageHero from "@/components/PageHero.vue";
import Reveal from "@/components/Reveal.vue";
import SectionTitle from "@/components/SectionTitle.vue";
import PlaceholderImage from "@/components/PlaceholderImage.vue";

const about = ref<any>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    about.value = await api.about();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <PageHero title="关于我们" sub="深耕行业数字化领域，专注智能化建设，技术为本、服务落地，具备完整项目实施经验" />

    <!-- 公司简介 -->
    <section class="section">
      <div class="container about-intro">
        <Reveal class="about-intro__media">
          <PlaceholderImage src="" icon="shield" height="100%" type="default" class="about-intro__img" />
          <div class="about-intro__badge">
            <span class="num">2019</span>
            <span>年成立于昆明</span>
          </div>
        </Reveal>
        <Reveal delay="1" class="about-intro__text">
          <span class="sec-tag">ABOUT US</span>
          <h2>{{ about?.title || "关于我们" }}</h2>
          <p class="about-intro__lead">{{ about?.intro }}</p>
          <div class="about-intro__content" v-html="(about?.content || '').replace(/\n/g, '<br/>')"></div>
          <router-link to="/联系我们" class="btn btn--primary">联系我们 →</router-link>
        </Reveal>
      </div>
    </section>

    <!-- 发展历程 -->
    <section class="section section--dark">
      <div class="container">
        <Reveal>
          <SectionTitle tag="MILESTONE" title="发展历程" desc="一步一个脚印，与客户共同成长" dark />
        </Reveal>
        <div class="timeline">
          <Reveal v-for="(h, i) in (about?.history || [])" :key="i" class="timeline__item" :class="{ 'timeline__item--right': i % 2 === 1 }">
            <div class="timeline__dot"></div>
            <div class="timeline__card glass-card">
              <span class="timeline__year num">{{ h.year }}</span>
              <h3>{{ h.title }}</h3>
              <p>{{ h.desc }}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>

    <!-- 荣誉资质 -->
    <section class="section">
      <div class="container">
        <Reveal>
          <SectionTitle tag="HONORS" title="荣誉资质" desc="权威认证，品质保障" />
        </Reveal>
        <div class="honors">
          <Reveal v-for="(h, i) in (about?.honors || []).slice(0, 4)" :key="i" :delay="i % 4" class="honor-card">
            <div class="honor-card__icon">{{ ["🏆", "🏅", "🛡️", "📜"][i] || "★" }}</div>
            <h3>{{ h.name }}</h3>
            <p>{{ h.desc }}</p>
          </Reveal>
        </div>
      </div>
    </section>

    <!-- 团队与服务 -->
    <section class="section section--light">
      <div class="container">
        <Reveal>
          <SectionTitle tag="TEAM" title="我们的团队" desc="专业团队，可定制化、可扩展、易运维，为客户提供端到端的智慧化服务" />
        </Reveal>
        <div class="team">
          <Reveal v-for="(t, i) in (about?.team || [])" :key="i" :delay="i % 3" class="team-card">
            <div class="team-card__icon">{{ ["🖥️", "🛠️", "🎧"][i] || "◆" }}</div>
            <h3>{{ t.name }}</h3>
            <p>{{ t.desc }}</p>
          </Reveal>
        </div>
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
  margin-bottom: 16px;
}

.about-intro {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 60px;
  align-items: center;
}

.about-intro__media {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  min-height: 420px;
}

.about-intro__badge {
  position: absolute;
  right: 22px;
  bottom: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 22px;
  border-radius: 14px;
  background: rgba(10, 22, 51, 0.85);
  backdrop-filter: blur(12px);
  color: #fff;
  font-size: 14px;
}

.about-intro__badge .num {
  font-size: 28px;
  font-weight: 800;
  color: var(--cyan-400);
}

.about-intro__text h2 {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 18px;
  background: linear-gradient(120deg, var(--navy-800), var(--brand-600));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.about-intro__lead {
  font-size: 16px;
  color: var(--brand-600);
  font-weight: 600;
  line-height: 1.9;
  margin-bottom: 16px;
}

.about-intro__content {
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 2;
  margin-bottom: 24px;
}

/* 时间线 */
.timeline {
  position: relative;
  padding: 20px 0;
}

.timeline::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, transparent, rgba(0, 200, 255, 0.5), rgba(0, 200, 255, 0.2), transparent);
}

.timeline__item {
  position: relative;
  width: 50%;
  padding: 0 44px 36px;
}

.timeline__item--right {
  margin-left: 50%;
}

.timeline__dot {
  position: absolute;
  top: 10px;
  right: -7px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--cyan-400);
  box-shadow: 0 0 0 6px rgba(0, 200, 255, 0.2), 0 0 20px var(--cyan-400);
  z-index: 1;
}

.timeline__item--right .timeline__dot {
  right: auto;
  left: -7px;
}

.timeline__card {
  padding: 24px 28px;
  color: #fff;
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(16px);
  transition: all var(--duration-normal) var(--ease-out);
}

.timeline__card:hover {
  background: rgba(255,255,255,0.13);
  border-color: rgba(0,200,255,0.3);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.25);
}

.timeline__year {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(120deg, var(--cyan-400), #fff);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: block;
  margin-bottom: 8px;
}

.timeline__card h3 {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
}

.timeline__card p {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.8;
}

/* 荣誉 */
.honors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.honor-card {
  text-align: center;
  padding: 30px 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.honor-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-cyan);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-normal) var(--ease-out);
}

.honor-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11, 95, 255, 0.15);
}

.honor-card:hover::before {
  transform: scaleX(1);
}

.honor-card__icon {
  width: 68px;
  height: 68px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.1), rgba(0, 200, 255, 0.14));
  border: 1px solid rgba(11, 95, 255, 0.14);
  transition: transform var(--duration-normal) var(--ease-spring);
}

.honor-card:hover .honor-card__icon {
  transform: scale(1.1);
}

.honor-card h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}

.honor-card p {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 团队 */
.team {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.team-card {
  text-align: center;
  padding: 32px 24px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.team-card::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-brand);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform var(--duration-normal) var(--ease-out);
}

.team-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-card-hover);
  border-color: rgba(11, 95, 255, 0.15);
}

.team-card:hover::after {
  transform: scaleX(1);
}

.team-card__icon {
  width: 76px;
  height: 76px;
  margin: 0 auto 18px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  background: var(--grad-brand);
  box-shadow: 0 12px 32px rgba(11, 95, 255, 0.35);
  transition: transform var(--duration-normal) var(--ease-spring);
}

.team-card:hover .team-card__icon {
  transform: scale(1.08) rotate(-5deg);
}

.team-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;
}

.team-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
}

@media (max-width: 900px) {
  .about-intro {
    grid-template-columns: 1fr;
    gap: 36px;
  }
  .about-intro__media {
    min-height: 280px;
  }
  .honors {
    grid-template-columns: repeat(2, 1fr);
  }
  .team {
    grid-template-columns: 1fr;
  }
  .timeline::before {
    left: 8px;
  }
  .timeline__item {
    width: 100%;
    padding: 0 0 32px 36px;
  }
  .timeline__item--right {
    margin-left: 0;
  }
  .timeline__dot,
  .timeline__item--right .timeline__dot {
    left: 2px;
    right: auto;
  }
}

@media (max-width: 560px) {
  .about-intro__text h2 {
    font-size: 24px;
  }
  .honors {
    grid-template-columns: 1fr;
  }
  .about-intro__badge {
    padding: 10px 16px;
    font-size: 12px;
  }
  .about-intro__badge .num {
    font-size: 22px;
  }
}
</style>