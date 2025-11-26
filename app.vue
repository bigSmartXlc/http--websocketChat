<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGlobalStore } from '@/stores/global'

const showContent = ref(false) // 控制是否显示内容
const globalStore = useGlobalStore()
const id = ref('')
const latitude = ref('')
const longitude = ref('')
async function initApp() {
  try {
    globalStore.setChatId()
    const urlParams = new URLSearchParams(window.location.search)
    id.value = urlParams.get('uid') || ''
    await globalStore.loadAppConfig()
    await globalStore.fetchUserInfo(id.value)
    latitude.value = urlParams.get('lat') || ''
    longitude.value = urlParams.get('lon') || ''
    await globalStore.getCurrentLocation({ latitude: latitude.value, longitude: longitude.value, id: id.value })
  } catch (e) {
    console.error('初始化失败:', e)
  } finally {
    showContent.value = true
  }
}

onMounted(async () => {
  if (import.meta.client) {
    initApp()
  }
})
</script>

<template>
  <ClientOnly>
    <div v-if="showContent">
      <div v-if="!globalStore.isLoggedIn" class="login-fail-container">
        用户信息加载失败<span class="retry-btn" @click="initApp">重试</span>
      </div>
      <div v-else class="app-container">
        <header class="app-header">
          <div class="location-phone-container">
            <!-- 你的 SVG -->
            <svg t="1761878507245" class="icon" style="margin-left: 0" viewBox="0 0 1024 1024" version="1.1"
              xmlns="http://www.w3.org/2000/svg" p-id="2525" width="32" height="32">
              <path
                d="M731.546 588.952C782.032 501.857 806 432.632 806 384c0-162.372-131.628-294-294-294S218 221.628 218 384c0 48.633 23.968 117.857 74.454 204.952C341.914 674.28 415.131 773.963 512 887.432c96.869-113.469 170.085-213.153 219.546-298.48zM549.64 981.52a50 50 0 0 1-4.727 4.727c-20.788 18.177-52.375 16.06-70.553-4.727C243.453 717.45 128 518.277 128 384 128 171.923 299.923 0 512 0s384 171.923 384 384c0 134.277-115.453 333.45-346.36 597.519zM512 544c88.366 0 160-71.634 160-160s-71.634-160-160-160-160 71.634-160 160 71.634 160 160 160z m0-90c-38.66 0-70-31.34-70-70s31.34-70 70-70 70 31.34 70 70-31.34 70-70 70z"
                p-id="2526" fill="#ffffff"></path>
            </svg>
            <span class="location-text">{{ globalStore.currentLocation.address || '-' }}</span>
          </div>
          <span>{{ globalStore.currentUserInfo.phone || '未知用户' }}</span>
        </header>
        <main class="app-main">
          <NuxtPage />
        </main>
      </div>
    </div>

    <template #fallback>
      <div class="loading-container">Loading...</div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.retry-btn {
  color: #03aab9;
  cursor: pointer;
  margin-left: 10px;
  text-decoration: underline;
}

.login-fail-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: #f5f5f5;
}

.loading-container {
  height: 100vh;
  width: 100vw;
  background-color: #f5f5f5;
}

.app-container {
  display: flex;
  flex-direction: column;
  /* 使用动态视口高度单位以更好地适配移动设备 */
  height: 100vh;
  /* height: 100vh; 替换为以下现代视口单位 */
  height: 100svh;
  /* 小视口高度 - 浏览器UI展开时 */
  height: 100lvh;
  /* 大视口高度 - 浏览器UI收起时 */
  height: 100dvh;
  /* 动态视口高度 - 自动适应UI变化 */
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