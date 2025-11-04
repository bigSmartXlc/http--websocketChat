// stores/global.ts
import { defineStore } from 'pinia'

export const useGlobalStore = defineStore('global', {
  // 状态
  state: () => ({
    watchid: null,
    chatId: '',
    userInfo: {
      user_id: 'test1',
      phone: '187****0272',
      name: '测试用户',
    },
    locationData: {
      latitude: 30.620792,
      longitude: 114.235447,
      address: '测试地址',
    },
    appConfig: {
      apiBaseUrl: '',
      defaultApiKey: '',
      securityJsCode: '',
      key: '',
      appid: '',
      shareId: '',
      outLinkUid: '',
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
    isLoggedIn: (state) => !!state.userInfo,
    currentUserInfo: (state) => state.userInfo,
    currentLocation: (state) => state.locationData,
  },

  // 方法
  actions: {
    setChatId(chatId: string) {
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
    clearWatchid() {
      if (this.watchid) {
        clearInterval(this.watchid)
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
