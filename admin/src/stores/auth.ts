import { defineStore } from "pinia";
import { api } from "@/api";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("admin_token") || "",
    user: JSON.parse(localStorage.getItem("admin_user") || "null") as User | null,
    mustChangePassword: localStorage.getItem("admin_must_change") === "1",
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    isSuperadmin: (s) => s.user?.role === "superadmin",
    needChangePassword: (s) => s.mustChangePassword,
  },
  actions: {
    async login(username: string, password: string) {
      const data = await api.auth.login({ username, password });
      this.token = data.token;
      this.user = data.user;
      this.mustChangePassword = data.must_change_password === true;
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));
      if (this.mustChangePassword) {
        localStorage.setItem("admin_must_change", "1");
      } else {
        localStorage.removeItem("admin_must_change");
      }
    },
    async loadProfile() {
      if (!this.token) return;
      try {
        const user = await api.auth.profile();
        this.user = user;
        localStorage.setItem("admin_user", JSON.stringify(user));
      } catch {
        this.logout();
      }
    },
    passwordChanged() {
      this.mustChangePassword = false;
      localStorage.removeItem("admin_must_change");
    },
    logout() {
      this.token = "";
      this.user = null;
      this.mustChangePassword = false;
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      localStorage.removeItem("admin_must_change");
    },
  },
});