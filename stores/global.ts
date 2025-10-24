// stores/global.ts
import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('global', {
  // 状态
  state: () => ({
    watchid: null,
    userInfo: {
      phone: '1870272XXXX',
      name: '测试用户',
    },
    locationData: {
      latitude: 30.620792,
      longitude: 114.235447,
      address: '武汉市',
    },
    appConfig: {
      apiBaseUrl: '',
      defaultApiKey: '',
      securityJsCode: '',
      key: '',
    },
  }),

  // 计算属性
  getters: {
    isLoggedIn: (state) => !!state.userInfo,
    currentUserInfo: (state) => state.userInfo,
    currentLocation: (state) => state.locationData,
  },

  // 方法
  actions: {
    async updateLocation(location: any) {
      this.locationData = {
        ...this.locationData,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      }
    },
    clearWatchid() {
      if (this.watchid) {
        navigator.geolocation.clearWatch(this.watchid)
      }
      this.watchid = null
    },
    setWatchid(watchid: any) {
      this.watchid = watchid
    },
    updateUserInfo(userInfo: any) {
      this.userInfo = userInfo
    },
    setAppConfig(config: any) {
      this.appConfig = config
    },
  },
})
