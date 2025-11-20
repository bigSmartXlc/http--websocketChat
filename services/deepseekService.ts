// DeepSeek AI 服务模块
import { post, postStream, parseStreamResponse } from './request'
// 定义配置接口
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
      // user_id: info.user_id,
      chat_id: info.chat_id,
      question: messages[messages.length - 1].content,
    }
    const reader = await postStream('processing', requestBody)
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
            //非json字符串，直接传递
            if (!/^[\{\[]/.test(data)) {
              onChunk(data)
              continue
            }
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

// 高德地图逆地理编码接口
/**
 * 根据经纬度获取地址信息（逆地理编码）
 * @param {Array} lnglat 经纬度坐标 [经度, 纬度]
 * @returns {Promise} 返回地址信息的Promise
 */
// 只在客户端环境使用的函数
export async function getAddressByLatLngGD(lnglat: number[]) {
  const { useGlobalStore } = await import('@/stores/global')
  const globalStore = useGlobalStore()
  // 使用缓存的配置，避免重复加载
  const appConfig: any = globalStore.GetAppConfig
  // 使用类型断言解决TypeScript类型错误
  ;(window as any)._AMapSecurityConfig = {
    securityJsCode: appConfig.securityJsCode,
  }
  const { default: DynamicAMapLoader } = await import('@amap/amap-jsapi-loader')
  const AMapInstance = await DynamicAMapLoader.load({
    key: appConfig.key,
    version: '2.0',
    plugins: ['AMap.Geocoder'],
  })

  const AMap = AMapInstance
  return new Promise((resolve, reject) => {
    // 检查是否在客户端环境和AMap是否已加载
    if (!import.meta.client || !AMap || !lnglat || lnglat.length !== 2) {
      reject(new Error('参数错误或不在客户端环境'))
      return
    }
    try {
      // 创建逆地理编码实例
      const geocoder = new AMap.Geocoder({
        city: '武汉',
        radius: 1000,
        extensions: 'all',
      })
      // 执行逆地理编码
      geocoder.getAddress(lnglat, (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          resolve(
            result.regeocode.aois[0].name || result.regeocode.formattedAddress
          )
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

// 计算两点之间的距离（米）
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // 地球半径（米）
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

//获取查询提示词
export const getQueryPrompt = async (prompt_type: string) => {
  try {
    const response = await post('prompt/list/' + prompt_type, {})
    const data = response.data
    return data
  } catch (error) {
    console.error('获取查询提示词失败:', error)
    throw error
  }
}

//获取应用初始化信息
export const getAppInitInfo = async (id: string = '1') => {
  try {
    const response = await post('prompt/init', {
      id: id,
    })
    const data = response.data
    return data
  } catch (error) {
    console.error('获取应用初始化信息失败:', error)
    throw error
  }
}

/**
 * Base64加密函数
 * 将普通字符串转换为Base64编码格式，支持处理UTF-8字符
 * @param text 需要加密的文本，可为null
 * @returns Base64编码后的字符串，若输入为null则返回null
 */
export const encodeBase64 = (text: string | null): string | null => {
  if (!text) return null
  try {
    // 正确处理UTF-8字符串的Base64编码
    // encodeURIComponent将字符串转换为UTF-8编码的URI组件
    // 然后使用btoa进行Base64编码
    return btoa(
      encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16))
      })
    )
  } catch (e) {
    console.error('Base64加密失败:', e)
    return null
  }
}

/**
 * Base64解密函数
 * 将Base64编码的字符串解码为普通字符串，支持处理UTF-8字符
 * @param encoded Base64编码的字符串，可为null
 * @returns 解码后的普通字符串，若输入为null则返回null
 */
export const decodeBase64 = (encoded: string | null): string | null => {
  if (!encoded) return null
  try {
    return decodeURIComponent(
      atob(encoded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch (e) {
    console.error('Base64解码失败:', e)
    return null
  }
}
