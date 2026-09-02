<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api";

const router = useRouter();
const auth = useAuthStore();

const formRef = ref();
const loading = ref(false);
const form = ref({ username: "", password: "" });

const showChangePwd = ref(false);
const pwdFormRef = ref();
const pwdLoading = ref(false);
const pwdForm = reactive({ old_password: "", new_password: "", confirm_password: "" });

const pwdRules = {
  old_password: [{ required: true, message: "请输入原密码", trigger: "blur" }],
  new_password: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, message: "密码长度不能少于6位", trigger: "blur" },
  ],
  confirm_password: [
    { required: true, message: "请确认新密码", trigger: "blur" },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (value !== pwdForm.new_password) callback(new Error("两次输入的密码不一致"));
        else callback();
      },
      trigger: "blur",
    },
  ],
};

const rules = {
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

async function submit() {
  await formRef.value?.validate();
  loading.value = true;
  try {
    await auth.login(form.value.username, form.value.password);
    if (auth.needChangePassword) {
      showChangePwd.value = true;
      pwdForm.old_password = form.value.password;
      ElMessage.warning("检测到您使用的是默认密码，请立即修改密码！");
    } else {
      ElMessage.success("登录成功，欢迎回来！");
      router.push("/dashboard");
    }
  } catch (e: any) {
    ElMessage.error(e.message || "登录失败");
  } finally {
    loading.value = false;
  }
}

async function submitPwdChange() {
  await pwdFormRef.value?.validate();
  pwdLoading.value = true;
  try {
    await api.auth.password({
      old_password: pwdForm.old_password,
      new_password: pwdForm.new_password,
    });
    auth.passwordChanged();
    ElMessage.success("密码修改成功！");
    router.push("/dashboard");
  } catch (e: any) {
    ElMessage.error(e.message || "密码修改失败");
  } finally {
    pwdLoading.value = false;
  }
}
</script>

<template>
  <div class="login">
    <div class="login__bg">
      <div class="login__grid"></div>
      <div class="login__glow login__glow--1"></div>
      <div class="login__glow login__glow--2"></div>
      <div class="login__orb login__orb--1"></div>
      <div class="login__orb login__orb--2"></div>
    </div>

    <div class="login__panel">
      <div class="login__brand">
        <img src="/logo.png" alt="驰耀科技" />
        <div>
          <h1>驰耀科技</h1>
          <p>CHIYAO TECHNOLOGY</p>
        </div>
      </div>
      <h2 class="login__title">后台管理系统</h2>
      <p class="login__sub">云南驰耀科技有限公司 · 智慧物联 · 科技赋能</p>

      <el-form v-if="!showChangePwd" ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="submit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="'User'" clearable />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="'Lock'" show-password />
        </el-form-item>
        <el-button type="primary" class="login__btn" size="large" :loading="loading" @click="submit">
          登 录
        </el-button>
      </el-form>

      <div v-if="showChangePwd" class="change-pwd">
        <h3>首次登录，请修改密码</h3>
        <p>为了账号安全，请设置一个新的密码</p>
        <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" size="large">
          <el-form-item prop="new_password">
            <el-input v-model="pwdForm.new_password" type="password" placeholder="新密码（至少6位）" :prefix-icon="'Lock'" show-password />
          </el-form-item>
          <el-form-item prop="confirm_password">
            <el-input v-model="pwdForm.confirm_password" type="password" placeholder="确认新密码" :prefix-icon="'Lock'" show-password />
          </el-form-item>
          <el-button type="primary" class="login__btn" size="large" :loading="pwdLoading" @click="submitPwdChange">
            确认修改
          </el-button>
        </el-form>
      </div>

      <div v-if="!showChangePwd" class="login__tip">
        <!-- <p>默认账号：<b>admin</b> / <b>admin123</b></p> -->
        <!-- <p>内容编辑：<b>editor</b> / <b>editor123</b></p> -->
      </div>

      <router-link to="/" class="login__back">← 返回官网首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.login{position:relative;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(135deg,#060e22 0%,#0a1633 50%,#0b1e3f 100%)}
.login__bg{position:absolute;inset:0}
.login__grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at center,rgba(0,0,0,0.8),transparent 75%);-webkit-mask-image:radial-gradient(ellipse at center,rgba(0,0,0,0.8),transparent 75%)}
.login__glow{position:absolute;border-radius:50%;filter:blur(100px)}
.login__glow--1{width:520px;height:520px;background:rgba(11,95,255,0.35);top:-160px;right:-100px;animation:glowPulse 8s ease-in-out infinite}
.login__glow--2{width:460px;height:460px;background:rgba(0,200,255,0.22);bottom:-160px;left:-100px;animation:glowPulse 8s ease-in-out infinite reverse}
@keyframes glowPulse{0%,100%{opacity:0.6}50%{opacity:1}}
.login__orb{position:absolute;border:1px solid rgba(0,200,255,0.2);border-radius:50%;animation:spin 40s linear infinite}
.login__orb--1{width:380px;height:380px;right:14%;bottom:12%}
.login__orb--2{width:560px;height:560px;right:8%;bottom:4%;border-color:rgba(255,255,255,0.06);animation-direction:reverse;animation-duration:56s}
.login__orb::before{content:"";position:absolute;width:8px;height:8px;border-radius:50%;background:var(--cyan-500);box-shadow:0 0 16px var(--cyan-500);top:10%;left:14%}
@keyframes spin{to{transform:rotate(360deg)}}

.login__panel{position:relative;z-index:2;width:420px;max-width:calc(100vw - 40px);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:24px;padding:44px 40px 36px;backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 24px 64px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05) inset}
.login__brand{display:flex;align-items:center;gap:14px;margin-bottom:28px}
.login__brand img{width:52px;height:52px;object-fit:contain;background:rgba(255,255,255,0.1);border-radius:14px;padding:5px}
.login__brand h1{font-size:22px;font-weight:800;color:#fff;letter-spacing:3px}
.login__brand p{font-size:10px;color:var(--cyan-500);letter-spacing:2px;font-family:"DIN Alternate",sans-serif}
.login__title{font-size:20px;font-weight:700;color:#fff;margin-bottom:6px}
.login__sub{font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:28px}

.change-pwd h3{font-size:18px;font-weight:700;color:#fff;margin-bottom:8px}
.change-pwd > p{font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:24px}

.login__panel :deep(.el-input__wrapper){background:rgba(255,255,255,0.08);box-shadow:0 0 0 1px rgba(255,255,255,0.14) inset;border-radius:10px;transition:all 0.3s}
.login__panel :deep(.el-input__wrapper.is-focus){box-shadow:0 0 0 1px var(--cyan-500) inset,0 0 0 3px rgba(0,200,255,0.15)}
.login__panel :deep(.el-input__inner){color:#fff}
.login__panel :deep(.el-input__inner::placeholder){color:rgba(255,255,255,0.4)}

.login__btn{width:100%;margin-top:8px;font-weight:700;letter-spacing:6px;background:linear-gradient(135deg,#1e6fff,#0b5fff 60%,#00c8ff);border:none;border-radius:10px;height:44px;box-shadow:0 8px 24px rgba(11,95,255,0.35);transition:all 0.3s}
.login__btn:hover{box-shadow:0 12px 32px rgba(11,95,255,0.5);transform:translateY(-1px)}

.login__tip{margin-top:22px;padding:12px 16px;border-radius:10px;background:rgba(0,200,255,0.08);border:1px solid rgba(0,200,255,0.2);font-size:12.5px;color:rgba(255,255,255,0.7);line-height:1.9}
.login__tip b{color:var(--cyan-300)}
.login__back{display:block;text-align:center;margin-top:20px;font-size:13px;color:rgba(255,255,255,0.5);transition:color 0.2s}
.login__back:hover{color:var(--cyan-400)}
</style>