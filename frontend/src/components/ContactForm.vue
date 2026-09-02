<script setup lang="ts">
import { ref } from "vue";
import { api } from "@/api";

const form = ref({ name: "", phone: "", email: "", subject: "", content: "" });
const loading = ref(false);
const success = ref(false);
const error = ref("");

const subjects = ["产品咨询", "方案咨询", "项目合作", "售后服务", "其他"];

async function submit() {
  error.value = "";
  success.value = false;
  if (!form.value.name.trim()) return (error.value = "请填写您的姓名");
  if (!form.value.phone.trim()) return (error.value = "请填写联系电话");
  if (form.value.content.trim().length < 5) return (error.value = "请填写留言内容（不少于5个字）");
  loading.value = true;
  try {
    await api.submitMessage({ ...form.value, subject: form.value.subject || "产品咨询" });
    success.value = true;
    form.value = { name: "", phone: "", email: "", subject: "", content: "" };
  } catch (e: any) {
    error.value = e.message || "提交失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="cf">
    <div v-if="success" class="cf__success">
      <div class="cf__success-icon">✓</div>
      <h3>留言提交成功</h3>
      <p>感谢您的信任，我们将在 24 小时内与您联系。</p>
      <button class="btn btn--primary" @click="success = false">继续留言</button>
    </div>

    <form v-else class="cf__form" @submit.prevent="submit">
      <div class="cf__row">
        <div class="cf__field">
          <label>您的姓名 <i>*</i></label>
          <input v-model="form.name" type="text" placeholder="请输入姓名" maxlength="30" />
        </div>
        <div class="cf__field">
          <label>联系电话 <i>*</i></label>
          <input v-model="form.phone" type="tel" placeholder="请输入手机号或座机" maxlength="20" />
        </div>
      </div>

      <div class="cf__row">
        <div class="cf__field">
          <label>电子邮箱</label>
          <input v-model="form.email" type="email" placeholder="请输入邮箱（选填）" maxlength="60" />
        </div>
        <div class="cf__field">
          <label>咨询主题</label>
          <select v-model="form.subject">
            <option value="" disabled>请选择主题</option>
            <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <div class="cf__field">
        <label>留言内容 <i>*</i></label>
        <textarea v-model="form.content" rows="4" placeholder="请描述您的需求，我们将尽快与您联系..." maxlength="500"></textarea>
      </div>

      <p v-if="error" class="cf__error">{{ error }}</p>

      <button class="btn btn--primary btn--lg cf__submit" type="submit" :disabled="loading">
        {{ loading ? "提交中..." : "提交留言" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.cf {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: 40px;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.cf::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-brand);
  opacity: 0.6;
}

.cf__success {
  text-align: center;
  padding: 48px 24px;
  animation: cfFadeIn 0.5s var(--ease-out);
}

@keyframes cfFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.cf__success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: var(--grad-brand);
  color: #fff;
  font-size: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16px 40px rgba(11, 95, 255, 0.4), 0 0 0 8px rgba(11, 95, 255, 0.08);
  animation: cfPulse 2s var(--ease-in-out) infinite;
}

@keyframes cfPulse {
  0%, 100% { box-shadow: 0 16px 40px rgba(11, 95, 255, 0.4), 0 0 0 8px rgba(11, 95, 255, 0.08); }
  50% { box-shadow: 0 16px 40px rgba(11, 95, 255, 0.5), 0 0 0 16px rgba(11, 95, 255, 0.04); }
}

.cf__success h3 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 10px;
  background: var(--grad-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cf__success p {
  color: var(--text-secondary);
  margin-bottom: 22px;
  font-size: 15px;
}

.cf__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.cf__field {
  margin-bottom: 16px;
  position: relative;
}

.cf__field label {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  letter-spacing: 0.3px;
  transition: color var(--duration-fast);
}

.cf__field label i {
  color: #e5484d;
  font-style: normal;
  margin-left: 2px;
}

.cf__field input,
.cf__field select,
.cf__field textarea {
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid var(--border-mid);
  border-radius: var(--radius-md);
  font-size: 14.5px;
  background: var(--bg-light);
  color: var(--text-primary);
  outline: none;
  transition: all var(--duration-fast) var(--ease-out);
}

.cf__field input::placeholder,
.cf__field select::placeholder,
.cf__field textarea::placeholder {
  color: var(--text-tertiary);
}

.cf__field input:hover,
.cf__field select:hover,
.cf__field textarea:hover {
  border-color: var(--brand-300);
  background: #fff;
}

.cf__field input:focus,
.cf__field select:focus,
.cf__field textarea:focus {
  border-color: var(--brand-500);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.08), 0 4px 16px rgba(11, 95, 255, 0.06);
}

.cf__field input:focus + label,
.cf__field select:focus + label,
.cf__field textarea:focus + label {
  color: var(--brand-600);
}

.cf__field select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235a6b85' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  padding-right: 40px;
  cursor: pointer;
}

.cf__field textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.6;
}

.cf__error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e5484d;
  font-size: 13.5px;
  font-weight: 500;
  margin: 0 0 16px;
  padding: 10px 16px;
  background: rgba(229, 72, 77, 0.05);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(229, 72, 77, 0.12);
  animation: cfShake 0.4s var(--ease-out);
}

@keyframes cfShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.cf__error::before {
  content: "⚠";
  font-size: 14px;
  flex-shrink: 0;
}

.cf__submit {
  width: 100%;
  margin-top: 4px;
  position: relative;
  overflow: hidden;
}

.cf__submit::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.cf__submit:hover::after {
  transform: translateX(100%);
}

.cf__submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 8px 24px rgba(11, 95, 255, 0.2) !important;
}

@media (max-width: 640px) {
  .cf {
    padding: 28px 20px;
  }

  .cf__row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>