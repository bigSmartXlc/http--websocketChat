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
  loadAppConfig,
  generateRandomString,
} from '@/services/deepseekService'
const globalStore = useGlobalStore()
const AMap: any = ref(null)
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
        .then((locationData: any) => {
          // 根据经纬度获取地址信息
          getAddressByLatLng([locationData.longitude, locationData.latitude])
        })
        .catch((error) => {
          console.warn('位置信息获取失败，使用默认位置:', error)
          // 直接设置默认位置信息，避免进一步错误
          globalStore.updateLocation({
            latitude: 30.620792,
            longitude: 114.235447,
            address: '武汉市',
          })
        })
    } catch (e) {
      console.error('地图加载失败:', e)
    }
  }
})

onUnmounted(() => {
  // 组件卸载时，清除位置信息的监听
  globalStore.clearWatchid()
})

// 高德地图逆地理编码接口
/**
 * 根据经纬度获取地址信息（逆地理编码）
 * @param {Array} lnglat 经纬度坐标 [经度, 纬度]
 * @returns {Promise} 返回地址信息的Promise
 */
// 只在客户端环境使用的函数
async function getAddressByLatLng(lnglat: number[]) {
  const appConfig: any = await loadAppConfig()
    // 使用类型断言解决TypeScript类型错误
    ; (window as any)._AMapSecurityConfig = {
      securityJsCode: appConfig.securityJsCode,
    }
  const { default: DynamicAMapLoader } = await import('@amap/amap-jsapi-loader')
  const AMapInstance = await DynamicAMapLoader.load({
    key: appConfig.key,
    version: '2.0',
    plugins: ['AMap.Geocoder'],
  })

  AMap.value = AMapInstance
  return new Promise((resolve, reject) => {
    // 检查是否在客户端环境和AMap是否已加载
    if (!process.client || !AMap.value || !lnglat || lnglat.length !== 2) {
      reject(new Error('参数错误或不在客户端环境'))
      return
    }
    try {
      // 创建逆地理编码实例
      const geocoder = new AMap.value.Geocoder({
        city: '武汉',
        radius: 1000,
        extensions: 'all',
      })
      // 执行逆地理编码
      geocoder.getAddress(lnglat, (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          // 更新位置信息到全局状态，使用正确的格式
          globalStore.updateLocation({
            longitude: lnglat[0],
            latitude: lnglat[1],
            address:
              result.regeocode.aois[0].name ||
              result.regeocode.formattedAddress,
          })
        } else {
          reject(new Error('无法获取地址信息'))
        }
      })
    } catch (error) {
      console.error('执行逆地理编码失败:', error)
      reject(error)
    }
  })
}
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
