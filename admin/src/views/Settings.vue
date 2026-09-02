<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";

const activeTab = ref("site");
const loading = ref(false);
const saving = ref(false);

// ---------- 站点设置 ----------
const site = reactive<Record<string, string>>({});
const siteFields = [
  { key: "site_name", label: "公司全称" },
  { key: "site_short_name", label: "公司简称" },
  { key: "site_en_name", label: "英文名称" },
  { key: "site_domain", label: "官网域名" },
  { key: "site_icp", label: "ICP 备案号" },
  { key: "site_icp_url", label: "备案链接" },
  { key: "site_phone", label: "固定电话" },
  { key: "site_mobile", label: "移动电话" },
  { key: "site_email", label: "电子邮箱" },
  { key: "site_address", label: "公司地址" },
  { key: "site_slogan", label: "品牌口号" },
  { key: "site_description", label: "公司简介" },
  { key: "seo_title", label: "SEO 标题" },
  { key: "seo_keywords", label: "SEO 关键词" },
  { key: "seo_description", label: "SEO 描述" },
];

// ---------- 关于我们 ----------
const about = reactive<any>({
  title: "",
  intro: "",
  content: "",
  history: [] as { year: string; text: string }[],
  honors: [] as { name: string; year: string }[],
  team: [] as { name: string; role: string; desc: string }[],
});

// ---------- 首页设置 ----------
const homepage = reactive<any>({
  capability_title: "",
  capability_desc: "",
  capabilities: [] as { title: string; desc: string; icon: string; num: number; suffix: string; label: string }[],
  partners: [] as { name: string; icon: string }[],
  contact_banner_title: "",
  contact_banner_desc: "",
});

async function load() {
  loading.value = true;
  try {
    const [s, a, h] = await Promise.all([api.settings.get(), api.about.get(), api.homepage.get()]);
    Object.assign(site, s || {});
    if (a) {
      Object.assign(about, {
        title: a.title || "",
        intro: a.intro || "",
        content: a.content || "",
        history: Array.isArray(a.history) ? a.history.map((x: any) => ({ ...x })) : [],
        honors: Array.isArray(a.honors) ? a.honors.map((x: any) => ({ ...x })) : [],
        team: Array.isArray(a.team) ? a.team.map((x: any) => ({ ...x })) : [],
      });
    }
    if (h) {
      Object.assign(homepage, {
        capability_title: h.capability_title || "",
        capability_desc: h.capability_desc || "",
        capabilities: Array.isArray(h.capabilities) ? h.capabilities.map((x: any) => ({ ...x })) : [],
        partners: Array.isArray(h.partners) ? h.partners.map((x: any) => ({ ...x })) : [],
        contact_banner_title: h.contact_banner_title || "",
        contact_banner_desc: h.contact_banner_desc || "",
      });
    }
  } finally {
    loading.value = false;
  }
}

async function saveSite() {
  saving.value = true;
  try {
    await api.settings.save({ ...site });
    ElMessage.success("站点设置已保存");
  } finally {
    saving.value = false;
  }
}

async function saveAbout() {
  saving.value = true;
  try {
    await api.about.save({
      title: about.title,
      intro: about.intro,
      content: about.content,
      history: about.history,
      honors: about.honors,
      team: about.team,
    });
    ElMessage.success("关于我们已保存");
  } finally {
    saving.value = false;
  }
}

async function saveHomepage() {
  saving.value = true;
  try {
    await api.homepage.save({ ...homepage });
    ElMessage.success("首页设置已保存");
  } finally {
    saving.value = false;
  }
}

function addHistory() {
  about.history.push({ year: "", text: "" });
}
function addHonor() {
  about.honors.push({ name: "", year: "" });
}
function addTeam() {
  about.team.push({ name: "", role: "", desc: "" });
}
function addCapability() {
  homepage.capabilities.push({ title: "", desc: "", icon: "", num: 0, suffix: "", label: "" });
}
function addPartner() {
  homepage.partners.push({ name: "", icon: "" });
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">系统设置</div>
    </div>

    <el-card shadow="never" v-loading="loading">
      <el-tabs v-model="activeTab">
        <!-- 站点设置 -->
        <el-tab-pane label="站点设置" name="site">
          <div class="settings-grid">
            <div v-for="f in siteFields" :key="f.key" class="settings-item">
              <label class="settings-item__label">{{ f.label }}</label>
              <el-input
                v-if="['site_description', 'seo_description'].includes(f.key)"
                v-model="site[f.key]"
                type="textarea"
                :rows="3"
              />
              <el-input v-else v-model="site[f.key]" />
            </div>
          </div>
          <div class="settings-actions">
            <el-button type="primary" :loading="saving" @click="saveSite">保存站点设置</el-button>
          </div>
        </el-tab-pane>

        <!-- 关于我们 -->
        <el-tab-pane label="关于我们" name="about">
          <div class="form-block">
            <div class="form-block__title">基础信息</div>
            <div class="form-block__row">
              <label>标题</label>
              <el-input v-model="about.title" style="max-width: 480px" />
            </div>
            <div class="form-block__row">
              <label>简介</label>
              <el-input v-model="about.intro" type="textarea" :rows="3" />
            </div>
            <div class="form-block__row">
              <label>详细介绍</label>
              <el-input v-model="about.content" type="textarea" :rows="8" placeholder="支持多行文本，可在内容中适当分段" />
            </div>
          </div>

          <div class="form-block">
            <div class="form-block__title">
              发展历程
              <el-button size="small" type="primary" plain @click="addHistory">
                <el-icon><Plus /></el-icon>添加节点
              </el-button>
            </div>
            <div v-for="(h, i) in about.history" :key="i" class="form-block__row">
              <label>年份</label>
              <el-input v-model="h.year" placeholder="如 2020" style="max-width: 120px" />
              <el-input v-model="h.text" placeholder="事件描述" style="max-width: 420px" />
              <el-button link type="danger" @click="about.history.splice(i, 1)">删除</el-button>
            </div>
            <div v-if="!about.history.length" class="form-block__empty">暂无历程节点</div>
          </div>

          <div class="form-block">
            <div class="form-block__title">
              资质荣誉
              <el-button size="small" type="primary" plain @click="addHonor">
                <el-icon><Plus /></el-icon>添加荣誉
              </el-button>
            </div>
            <div v-for="(h, i) in about.honors" :key="i" class="form-block__row">
              <label>荣誉名称</label>
              <el-input v-model="h.name" placeholder="如 高新技术企业认证" style="max-width: 320px" />
              <el-input v-model="h.year" placeholder="年份" style="max-width: 120px" />
              <el-button link type="danger" @click="about.honors.splice(i, 1)">删除</el-button>
            </div>
            <div v-if="!about.honors.length" class="form-block__empty">暂无荣誉</div>
          </div>

          <div class="form-block">
            <div class="form-block__title">
              核心团队
              <el-button size="small" type="primary" plain @click="addTeam">
                <el-icon><Plus /></el-icon>添加成员
              </el-button>
            </div>
            <div v-for="(t, i) in about.team" :key="i" class="form-block__row">
              <label>成员</label>
              <el-input v-model="t.name" placeholder="姓名" style="max-width: 140px" />
              <el-input v-model="t.role" placeholder="职位" style="max-width: 160px" />
              <el-input v-model="t.desc" placeholder="简介" style="max-width: 260px" />
              <el-button link type="danger" @click="about.team.splice(i, 1)">删除</el-button>
            </div>
            <div v-if="!about.team.length" class="form-block__empty">暂无成员</div>
          </div>

          <div class="settings-actions">
            <el-button type="primary" :loading="saving" @click="saveAbout">保存关于我们</el-button>
          </div>
        </el-tab-pane>

        <!-- 首页设置 -->
        <el-tab-pane label="首页设置" name="homepage">
          <div class="form-block">
            <div class="form-block__title">核心能力区</div>
            <div class="form-block__row">
              <label>标题</label>
              <el-input v-model="homepage.capability_title" style="max-width: 480px" />
            </div>
            <div class="form-block__row">
              <label>副标题</label>
              <el-input v-model="homepage.capability_desc" type="textarea" :rows="2" style="max-width: 640px" />
            </div>
            <div class="form-block__row">
              <label style="align-self: flex-start">能力列表</label>
              <div class="cap-list">
                <div v-for="(c, i) in homepage.capabilities" :key="i" class="cap-item">
                  <div class="cap-item__row">
                    <el-input v-model="c.title" placeholder="能力名称" style="width: 160px" />
                    <el-input v-model="c.desc" placeholder="能力描述" style="width: 260px" />
                    <el-input v-model="c.icon" placeholder="图标名" style="width: 100px" />
                    <el-button link type="danger" @click="homepage.capabilities.splice(i, 1)">删除</el-button>
                  </div>
                  <div class="cap-item__row">
                    <span class="cap-item__tag">数据</span>
                    <el-input-number v-model="c.num" :min="0" style="width: 120px" />
                    <el-input v-model="c.suffix" placeholder="后缀 如 +" style="width: 80px" />
                    <el-input v-model="c.label" placeholder="指标说明" style="width: 200px" />
                  </div>
                </div>
                <el-button type="primary" plain @click="addCapability">
                  <el-icon><Plus /></el-icon>添加能力
                </el-button>
              </div>
            </div>
          </div>

          <div class="form-block">
            <div class="form-block__title">
              合作伙伴
              <el-button size="small" type="primary" plain @click="addPartner">
                <el-icon><Plus /></el-icon>添加伙伴
              </el-button>
            </div>
            <div v-for="(p, i) in homepage.partners" :key="i" class="form-block__row">
              <label>名称</label>
              <el-input v-model="p.name" placeholder="企业名称" style="max-width: 260px" />
              <el-input v-model="p.icon" placeholder="图标文字（1-4 字）" style="max-width: 140px" />
              <el-button link type="danger" @click="homepage.partners.splice(i, 1)">删除</el-button>
            </div>
            <div v-if="!homepage.partners.length" class="form-block__empty">暂无合作伙伴</div>
          </div>

          <div class="form-block">
            <div class="form-block__title">联系横幅</div>
            <div class="form-block__row">
              <label>标题</label>
              <el-input v-model="homepage.contact_banner_title" style="max-width: 480px" />
            </div>
            <div class="form-block__row">
              <label>描述</label>
              <el-input v-model="homepage.contact_banner_desc" type="textarea" :rows="2" style="max-width: 640px" />
            </div>
          </div>

          <div class="settings-actions">
            <el-button type="primary" :loading="saving" @click="saveHomepage">保存首页设置</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 16px 24px;
}
.settings-item__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.settings-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
.form-block {
  margin-bottom: 24px;
  padding: 16px 18px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
}
.form-block__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.form-block__row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.form-block__row > label {
  width: 88px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
}
.form-block__empty {
  font-size: 13px;
  color: #a0a8b8;
  padding: 8px 0;
}
.cap-list {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cap-item {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--bg-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cap-item__row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.cap-item__tag {
  font-size: 12px;
  color: var(--text-secondary);
  background: #fff;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 2px 8px;
}
</style>
