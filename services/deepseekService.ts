// DeepSeek AI 服务模块

// 定义配置接口
export interface AppConfig {
  apiBaseUrl: string
  defaultApiKey: string
  securityJsCode: string
  key: string
  appid: string
  shareId: string
  outLinkUid: string
}

// 加载配置文件
let appConfig: AppConfig = {
  apiBaseUrl: '/ai_customer/processing',
  defaultApiKey: '46546sdffdsffdsfe',
  securityJsCode: 'f2c5b796509cce81aa504808c2e066f1',
  key: '3a4b3b633dc42eec565aee94918477e0',
  appid: '68f74407c7862b21dfdb1307',
  shareId: 'x2IldcrczDsW9y0ExTznAfpk',
  outLinkUid: 'shareChat-1762133983352-gyTOGWYRsDYH3VkOlKlYZqYj',
}

/**
 * 从配置文件加载应用配置
 * @returns 配置对象
 */
export const loadAppConfig = async (): Promise<AppConfig> => {
  try {
    const { useGlobalStore } = await import('@/stores/global')
    const globalStore = useGlobalStore()
    // 从public目录加载配置文件
    const response = await fetch('/config.json')
    if (response.ok) {
      const config = await response.json()
      appConfig = {
        apiBaseUrl: config.apiBaseUrl || appConfig.apiBaseUrl,
        defaultApiKey: config.defaultApiKey || appConfig.defaultApiKey,
        securityJsCode: config.securityJsCode || appConfig.securityJsCode,
        key: config.key || appConfig.key,
        appid: config.appid || appConfig.appid,
        shareId: config.shareId || appConfig.shareId,
        outLinkUid: config.outLinkUid || appConfig.outLinkUid,
      }
      globalStore.setAppConfig(config)
      return config
    }
  } catch (error) {
    console.warn('加载配置文件失败，使用默认配置:', error)
  }
  return appConfig
}

// 发送聊天消息到DeepSeek AI API
const sendChatMessage = async (
  apiKey: string,
  messages: Array<{ role: 'user' | 'ai'; content: string }>
) => {
  try {
    // 准备API请求参数
    const requestBody = {
      model: 'Qwen/QwQ-32B', // 使用DeepSeek的聊天模型
      messages: messages.map((msg) => ({
        role: msg.role, // 'user' 或 'ai'
        content: msg.content,
      })),
      temperature: 0.7, // 控制响应的随机性
      max_tokens: 2000, // 最大生成的token数
    }

    // 发送请求到配置的API地址
    const response = await fetch(appConfig.apiBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey || appConfig.defaultApiKey}`, // 使用提供的API密钥或默认值
      },
      body: JSON.stringify(requestBody),
    })

    // 检查响应状态
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || `API请求失败: ${response.status}`
      )
    }

    // 解析响应数据
    const data = await response.json()

    // 提取AI的回复内容
    // 修改后
    // 过滤掉仅包含换行符的内容
    const content = data.choices[0]?.message?.content || ''
    // 检查content是否只包含换行符
    if (content.trim() === '') {
      return ''
    }
    return content
  } catch (error) {
    console.error('发送消息到DeepSeek AI失败:', error)
    throw error
  }
}

// 流式发送消息（可选功能，用于实时显示回复内容）
// 定义用于处理流式响应的数据类型
export interface StreamChunk {
  content: string
  reasoning?: string
}

// 定义流式响应回调类型
export interface StreamCallbacks {
  onChunk: (chunk: string | StreamChunk) => void
  onComplete: () => void
}

/**
 * 生成指定长度的随机字符串
 * @param length 字符串长度
 * @returns 随机字符串
 */
export const generateRandomString = function (length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charsLength = chars.length
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * charsLength))
  }
  return result
}

// 修改 sendChatMessageStream 函数的类型定义
export const sendChatMessageStream = async (
  //经纬度
  position: {
    latitude: number
    longitude: number
  },
  info: {
    user_id: string
    phone: string
    name: string
    chat_id: string
  },
  messages: Array<{ role: 'user' | 'ai'; content: string }>,
  onChunk: (chunk: string | StreamChunk) => void,
  onComplete: () => void
) => {
  try {
    const requestBody = {
      latitude: position.latitude,
      longitude: position.longitude,
      user_id: info.phone,
      chat_id: info.chat_id,
      question: messages[messages.length - 1].content,
    }

    const response = await fetch(appConfig.apiBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appConfig.defaultApiKey}`, // 使用提供的API密钥或默认值
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    })
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }

    // 处理流式响应
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应体的读取器')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 解析SSE格式的响应
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data:')) {
          let data = line.substring(5).trim()
          if (data === '[DONE]') {
            onComplete()
            return
          }
          try {
            // 修复1：将单引号转换为双引号，使数据符合JSON格式
            data = data.replace(/'/g, '"')

            // 修复2：将JavaScript风格的大写布尔值(True/False)转换为JSON标准的小写布尔值(true/false)
            data = data
              .replace(/\bTrue\b/g, 'true')
              .replace(/\bFalse\b/g, 'false')

            const parsedData = JSON.parse(data)

            // 获取普通内容
            const content = parsedData.choices?.[0]?.delta?.content || ''
            // 获取思考过程内容
            const reasoning =
              parsedData.choices?.[0]?.delta?.reasoning_content || ''

            // 根据获取到的内容类型决定传递什么数据
            if (content && reasoning) {
              // 同时有内容和思考过程
              onChunk({ content, reasoning })
            } else if (content) {
              // 只有内容
              onChunk(content)
            } else if (reasoning) {
              // 只有思考过程
              onChunk({ content: '', reasoning })
            }

            // 检查是否完成
            const finishReason = parsedData.choices?.[0]?.finish_reason
            if (finishReason === 'stop' || data === '[DONE]') {
              onComplete()
              return
            }
          } catch (e) {
            console.error('解析流式响应数据失败:', e)
            console.error('原始数据:', data)
          }
        }
      }
    }

    onComplete()
  } catch (error) {
    console.error('流式发送消息失败:', error)
    throw error
  }
}

//h5获取当前位置信息（单次获取）
export const getCurrentLocation = async () => {
  // 分三种情况1,常规浏览器2，微信小程序webview3,app的webview
  // 1,常规浏览器
  if (
    (window as any).__wxjs_environment == 'miniprogram' ||
    (window as any).jsBridge !== undefined
  ) {
    //调取信电接口获取位置信息
    const response = await fetch('/ai_customer/location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    const data = await response.json()
    return data.location
  } else {
    const { useGlobalStore } = await import('@/stores/global')
    const globalStore = useGlobalStore()
    if (
      navigator.geolocation &&
      (window.location.protocol !== 'http:' ||
        window.location.hostname === 'localhost')
    ) {
      // 先清除已存在的监听器，避免重复监听
      if (globalStore.watchid) {
        navigator.geolocation.clearWatch(globalStore.watchid)
      }
      return new Promise((resolve, reject) => {
        let watchId: number | null = null
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            try {
              // 构建位置数据对象
              const locationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }
              // 设置watchId到全局状态，以便后续可以清除监听
              globalStore.setWatchid(watchId)
              // 解析位置数据
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
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
          }
        )
      })
    } else {
      return new Promise((resolve, reject) => {
        const locationData = {
          latitude: globalStore.locationData.latitude,
          longitude: globalStore.locationData.longitude,
        }
        reject(locationData)
      })
    }
  }
}

//获取微信token
export const getWechatToken = async () => {
  try {
    const response = await fetch('/ai_customer/wechat_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    const data = await response.json()
    return data.token
  } catch (error) {
    console.error('获取微信token失败:', error)
    throw error
  }
}

//获取用户信息
export const getUserInfo = async (id: string) => {
  try {
    const response = await fetch(`/ai_customer/user_info?id=${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  }
}

//获取查询提示词
export const getQueryPrompt = async (prompt_type: string) => {
  try {
    const response = await fetch(`ai_customer/prompt/list/${prompt_type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    const data = await response.json()
    console.log('获取查询提示词成功:', data)
    return data.data
  } catch (error) {
    console.error('获取查询提示词失败:', error)
    throw error
  }
}

//获取应用初始化信息
export const getAppInitInfo = async (queryParams: any) => {
  try {
    const query = new URLSearchParams()
    for (const key in queryParams) {
      query.append(key, queryParams[key])
    }
    const response = await fetch(
      'http://zwork.wuhanparking.com:9000/api/core/chat/outLink/init?' +
        query.toString(),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    const data = await response.json()
    console.log('获取应用初始化信息成功:', data)
    return data.data
  } catch (error) {
    console.error('获取应用初始化信息失败:', error)
    throw error
  }
}
