import { defineStore } from "pinia";
import { api, type SiteInfo } from "@/api";

export const useSiteStore = defineStore("site", {
  state: () => ({
    site: {} as SiteInfo,
    loaded: false,
  }),
  getters: {
    name: (s) => s.site.site_name || "云南驰耀科技有限公司",
    shortName: (s) => s.site.site_short_name || "驰耀科技",
    enName: (s) => s.site.site_en_name || "CHIYAO TECHNOLOGY",
    icp: (s) => s.site.site_icp || "滇ICP备2024047880号-1",
    phone: (s) => s.site.site_phone || "0871-6789 0000",
    mobile: (s) => s.site.site_mobile || "138 8888 0000",
    email: (s) => s.site.site_email || "info@ynyzzn.com",
    address: (s) => s.site.site_address || "",
    slogan: (s) => s.site.site_slogan || "智慧物联 · 数智赋能",
    domain: (s) => s.site.site_domain || "ynyzzn.com",
  },
  actions: {
    async load() {
      if (this.loaded) return;
      try {
        this.site = await api.site();
        this.loaded = true;
      } catch {
        /* 站点信息加载失败时使用默认值 */
      }
    },
  },
});