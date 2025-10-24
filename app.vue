<template>
  <div class="app-container">
    <header class="app-header">
      <h1>武汉停车AI助手</h1>
      <!-- <nav>
        <router-link to="/">http</router-link>
        <router-link to="/socket">WebSocket</router-link>
      </nav> -->
    </header>
    <main class="app-main">
      <!-- 如果访问的是首页(/)，显示ChatComponent，否则显示路由匹配的页面 -->
      <NuxtPage />
    </main>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from '@/stores/global'
import { getCurrentLocation, loadAppConfig } from '@/services/deepseekService'
const globalStore = useGlobalStore()
const AMap: any = ref(null)

// 确保只在客户端环境执行地图相关代码
onMounted(async () => {
  // 加载应用配置
  const appConfig: any = await loadAppConfig()
  // 检查是否在客户端环境
  if (process.client) {
    // 使用类型断言解决TypeScript类型错误
    ;(window as any)._AMapSecurityConfig = {
      securityJsCode: appConfig.securityJsCode,
    }
    try {
      // 动态导入AMapLoader以避免SSR问题
      const { default: DynamicAMapLoader } = await import(
        '@amap/amap-jsapi-loader'
      )
      const AMapInstance = await DynamicAMapLoader.load({
        key: appConfig.key,
        version: '2.0',
        plugins: ['AMap.Geocoder'],
      })

      AMap.value = AMapInstance

      // 获取当前位置
      getCurrentLocation().then((locationData: any) => {
        // 根据经纬度获取地址信息
        getAddressByLatLng([locationData.longitude, locationData.latitude])
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
function getAddressByLatLng(lnglat: number[]) {
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
        console.log(status, result)
        if (status === 'complete' && result.regeocode) {
          // 更新位置信息到全局状态，使用正确的格式
          globalStore.updateLocation({
            longitude: lnglat[0],
            latitude: lnglat[1],
            address:
              result.regeocode.aois[0].name ||
              result.regeocode.formattedAddress,
          })
          console.log(globalStore.currentLocation)
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
  background-color: #4c51bf;
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app-main {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  max-width: 100%;
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
