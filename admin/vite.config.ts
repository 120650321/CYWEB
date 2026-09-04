import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // 生产环境由 server 托管在 /admin 子路径，开发环境保持根路径
  base: process.env.NODE_ENV === "production" ? "/admin/" : "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          "vue-vendor": ["vue", "vue-router", "pinia"],
        },
        chunkFileNames: "assets/js/[name]-[hash:8].js",
        entryFileNames: "assets/js/[name]-[hash:8].js",
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split(".").pop() || "";
          if (/png|jpe?g|svg|gif|webp|ico/i.test(ext)) return "assets/images/[name]-[hash:8][extname]";
          if (/woff2?|ttf|eot/i.test(ext)) return "assets/fonts/[name]-[hash:8][extname]";
          if (/css/i.test(ext)) return "assets/css/[name]-[hash:8][extname]";
          return "assets/[name]-[hash:8][extname]";
        },
      },
    },
    modulePreload: {
      polyfill: true,
    },
    reportCompressedSize: false,
  },
});