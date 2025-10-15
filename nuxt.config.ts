// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['@/assets/css/main.css'],
  modules: [],
  runtimeConfig: {
    public: {},
  },
  vite: {
    server: {
      allowedHosts: [
        '33cb739a.r20.cpolar.top', // 你的 cpolar 域名
        // 可以加更多域名
      ],
      strictPort: true,
      proxy: {
        // 配置代理
        '/ai_customer': {
          target: 'http://zwork.wuhanparking.com:8060', // 目标服务器
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai_customer/, '/ai_customer'), // 保持路径不变
        },
      },
    },
  },
})
