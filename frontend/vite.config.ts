import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
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
        pure_funcs: ["console.log", "console.info", "console.debug"],
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