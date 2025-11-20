// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['@/assets/css/main.css'],
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    public: {},
  },
  devServer: {
    host: 'localhost',
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
      allowedHosts: [],
      strictPort: true,
      proxy: {
        // 配置代理
        '/onenet-prod-api/': {
          target: 'http://192.168.0.203:9060', // 目标服务器
          changeOrigin: true,
          // 不需要重写，保留完整路径
          secure: false, // 允许非HTTPS请求
          headers: {
            'X-Forwarded-For': '',
            'X-Forwarded-Proto': '',
          },
        },
      },
    },
  },
})
