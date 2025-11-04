<template>
  <div class="app-container">
    <header class="app-header">
      <!-- <h1>武汉停车AI助手</h1> -->
      <!-- <nav>
        <router-link to="/">http</router-link>
        <router-link to="/socket">WebSocket</router-link>
      </nav> -->
      <div class="location-phone-container">
        <svg t="1761878507245" class="icon" style="margin-left: 0" viewBox="0 0 1024 1024" version="1.1"
          xmlns="http://www.w3.org/2000/svg" p-id="2525" width="32" height="32">
          <path
            d="M731.546 588.952C782.032 501.857 806 432.632 806 384c0-162.372-131.628-294-294-294S218 221.628 218 384c0 48.633 23.968 117.857 74.454 204.952C341.914 674.28 415.131 773.963 512 887.432c96.869-113.469 170.085-213.153 219.546-298.48zM549.64 981.52a50 50 0 0 1-4.727 4.727c-20.788 18.177-52.375 16.06-70.553-4.727C243.453 717.45 128 518.277 128 384 128 171.923 299.923 0 512 0s384 171.923 384 384c0 134.277-115.453 333.45-346.36 597.519zM512 544c88.366 0 160-71.634 160-160s-71.634-160-160-160-160 71.634-160 160 71.634 160 160 160z m0-90c-38.66 0-70-31.34-70-70s31.34-70 70-70 70 31.34 70 70-31.34 70-70 70z"
            p-id="2526" fill="#ffffff"></path>
        </svg><span class="location-text">{{ userLocation || '-' }}</span>
      </div>
      <span>{{ userPhone || '未知用户' }}</span>
    </header>
    <main class="app-main">
      <!-- 如果访问的是首页(/)，显示ChatComponent，否则显示路由匹配的页面 -->
      <NuxtPage />
    </main>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useGlobalStore } from '@/stores/global'
import {
  getCurrentLocation,
  generateRandomString,
} from '@/services/deepseekService'
const globalStore = useGlobalStore()
const userLocation = computed(() => globalStore.currentLocation.address)
const userPhone = computed(() => globalStore.currentUserInfo.phone)
// 确保只在客户端环境执行地图相关代码
onMounted(async () => {
  // 检查是否在客户端环境
  if (process.client) {
    try {
      // 生成随机的chat_id
      const chatId = generateRandomString(10)
      globalStore.setChatId(chatId)
      // 获取当前位置
      getCurrentLocation()
    } catch (e) {
      console.error('地图加载失败:', e)
    }
  }
})

onUnmounted(() => {
  // 组件卸载时，清除位置信息的监听
  globalStore.clearWatchid()
})


</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f5f5f5;
}

.app-header {
  background: linear-gradient(45deg, #1fd29d, #03aab9);
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.location-phone-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
}

.location-text {
  overflow: hidden;
  max-width: 180px;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 5px;
  font-size: 14px;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app-main {
  flex: 1;
  overflow: auto;
  max-width: 100%;
  background: linear-gradient(135deg, #1fd29d14, #03aab914);
}

nav {
  margin-top: 10px;
}

nav a {
  color: white;
  margin: 0 10px;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}
</style>
