// stores/global.ts
import { defineStore } from 'pinia'
import {
  getAddressByLatLngGD,
  calculateDistance,
  generateRandomString,
} from '@/services/deepseekService'
import { post } from '@/services/request'

export const useGlobalStore = defineStore('global', {
  // 状态
  state: () => ({
    watchid: null,
    chatId: '',
    appConfigLoaded: false,
    userInfo: {
      uid: '',
      phone: '',
      token: '',
    },
    locationData: {
      latitude: 30.620792,
      longitude: 114.235447,
      address: '',
    },
    appConfig: {
      apiBaseUrl: '/ai_customer/',
      defaultApiKey: '46546sdffdsffdsfe',
      securityJsCode: 'f2c5b796509cce81aa504808c2e066f1',
      key: '3a4b3b633dc42eec565aee94918477e0',
    },
  }),

  // 计算属性
  getters: {
    chatID(state) {
      return state.chatId
    },
    GetAppConfig(state) {
      return state.appConfig
    },
    isLoggedIn: (state) => !!state.userInfo.token,
    currentUserInfo: (state) => state.userInfo,
    currentLocation: (state) => state.locationData,
  },
  // 方法
  actions: {
    setChatId() {
      const chatId = generateRandomString(10)
      this.chatId = chatId
    },
    async updateLocation(location: any) {
      this.locationData = {
        ...this.locationData,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      }
    },
    logout() {
      this.userInfo = {
        uid: '',
        phone: '',
        token: '',
      }
    },
    updateUserInfo(userInfo: any) {
      this.userInfo = userInfo
    },
    setAppConfig(config: any) {
      this.appConfig = config
    },
    async fetchUserInfo(uid: string) {
      try {
        const response: any = await post('getUserInfo', {
          user_id: uid,
        })
        if (response.code == 200) {
          const { token = '', mobileNumber = '' } = response?.data || {}
          this.updateUserInfo({
            uid,
            phone: mobileNumber,
            token,
          })
          //token存储到cookie
          document.cookie = `token=${token}; path=/; max-age=3600`
        } else {
          throw new Error('获取用户信息失败')
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        throw error
      }
    },

    async loadAppConfig(forceRefresh = false) {
      // 如果配置已加载且不强制刷新，则直接返回缓存的配置
      if (this.appConfigLoaded && !forceRefresh) {
        return this.appConfig
      }
      try {
        // 从public目录加载配置文件
        const response = await fetch('/config.json')
        if (response.ok) {
          const config = await response.json()
          this.setAppConfig({
            apiBaseUrl: config.apiBaseUrl || this.appConfig.apiBaseUrl,
            defaultApiKey: config.defaultApiKey || this.appConfig.defaultApiKey,
            securityJsCode:
              config.securityJsCode || this.appConfig.securityJsCode,
            key: config.key || this.appConfig.key,
          })
          // 标记配置已加载
          this.appConfigLoaded = true
          return config
        }
      } catch (error) {
        console.warn('加载配置文件失败，使用默认配置:', error)
      }
      // 即使加载失败也标记为已加载，避免频繁尝试重新加载
      return this.appConfig
    },

    async getCurrentLocation(urlParams?: any) {
      // 分三种情况1,常规浏览器2，微信小程序webview3,app的webview
      // 1,常规浏览器
      if (
        (window as any).__wxjs_environment == 'miniprogram' ||
        (window as any).jsBridge !== undefined
      ) {
        const address = await getAddressByLatLngGD([
          Number(urlParams.longitude),
          Number(urlParams.latitude),
        ])
        this.updateLocation({
          latitude: urlParams.latitude,
          longitude: urlParams.longitude,
          address: address || '定位中...',
        })
      } else {
        if (
          navigator.geolocation &&
          (window.location.protocol !== 'http:' ||
            window.location.hostname === 'localhost')
        ) {
          return new Promise((resolve, reject) => {
            // 上次位置更新的时间戳，用于节流控制
            let lastUpdateTime = 0
            // 位置更新的最小时间间隔（毫秒），例如30秒
            const MIN_UPDATE_INTERVAL = 30000
            // 位置变化的最小距离（米），只有超过这个距离才更新
            const MIN_DISTANCE_CHANGE = 50
            // 上次位置坐标
            let lastPosition: any = null

            navigator.geolocation.getCurrentPosition(
              (position) => {
                try {
                  // 获取当前时间戳
                  const currentTime = Date.now()
                  // 构建位置数据对象
                  const locationData = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  }
                  // 计算与上次位置的距离（如果有上次位置的话）
                  let distanceChanged = true
                  if (lastPosition) {
                    const distance = calculateDistance(
                      lastPosition.latitude,
                      lastPosition.longitude,
                      position.coords.latitude,
                      position.coords.longitude
                    )
                    distanceChanged = distance > MIN_DISTANCE_CHANGE
                  }
                  // 节流控制：只有满足时间间隔和距离变化条件时才更新位置
                  if (
                    currentTime - lastUpdateTime > MIN_UPDATE_INTERVAL &&
                    distanceChanged
                  ) {
                    // 解析位置数据
                    getAddressByLatLngGD([
                      // getAddressByLatLngQQ([
                      position.coords.longitude,
                      position.coords.latitude,
                    ])
                      .then((address) => {
                        this.updateLocation({
                          longitude: position.coords.longitude,
                          latitude: position.coords.latitude,
                          address: address || '定位中...',
                        })
                      })
                      .catch((error) => {
                        console.error('获取地址失败:', error)
                      })

                    // 更新时间戳和位置信息
                    lastUpdateTime = currentTime
                    lastPosition = {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                    }
                  }

                  resolve(locationData)
                } catch (storeError) {
                  console.error('更新全局位置状态失败:', storeError)
                  resolve(position)
                }
              },
              (error) => {
                reject(error)
              },
              {
                enableHighAccuracy: false, // 降低精度要求，减少电池消耗
                timeout: 15000, // 增加超时时间到15秒
                maximumAge: 60000, // 增加最大缓存时间到60秒，减少请求频率
              }
            )
          })
        } else {
          return new Promise((resolve, reject) => {
            const locationData = {
              latitude: this.locationData.latitude,
              longitude: this.locationData.longitude,
            }
            reject(locationData)
          })
        }
      }
    },
  },
})
