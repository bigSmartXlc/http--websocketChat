// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['@/assets/css/main.css'],
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    public: {},
  },
  app: {
    head: {
      title: '武汉停车AI助手',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        },
        { name: 'description', content: 'AI智能助手应用' },
        { name: 'keywords', content: 'AI,智能助手' },
        // 添加更多meta标签
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // 添加更多link标签
      ],
    },
  },
  vite: {
    server: {
      allowedHosts: [
        '1f3ef122.r20.cpolar.top', // 你的 cpolar 域名
        '596784a7.r7.cpolar.cn',
        '6fdede94.r20.cpolar.top',
        // 可以加更多域名
      ],
      strictPort: true,
      proxy: {
        // 配置代理
        '/ai_customer': {
          target: 'http://zwork.wuhanparking.com:8090', // 目标服务器
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai_customer/, '/ai_customer'), // 保持路径不变
        },
      },
    },
  },
})
