/**
 * 请求工具模块
 * 使用浏览器原生fetch API封装，提供完整的请求处理功能
 */

import { useGlobalStore } from '@/stores/global'
let timeoutId = null
/**
 * 请求配置接口
 */
const requestConfig = {
  baseURL: '', // 基础URL，将从global store获取
  timeout: 10000, // 请求超时时间（毫秒）
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * 处理URL查询参数
 * @param {string} url - 基础URL
 * @param {Object} params - 查询参数对象
 * @returns {string} - 拼接后的完整URL
 */
function buildUrlWithParams(url, params) {
  if (!params || Object.keys(params).length === 0) {
    return url
  }

  const queryString = new URLSearchParams(params).toString()
  const separator = url.includes('?') ? '&' : '?'

  return `${url}${separator}${queryString}`
}

/**
 * 准备请求数据
 * @param {any} data - 请求数据
 * @param {string} contentType - Content-Type头信息
 * @returns {any} - 处理后的请求体
 */
function prepareRequestData(data, contentType) {
  // 如果data已经是FormData、URLSearchParams或字符串，直接返回
  if (
    !data ||
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    typeof data === 'string'
  ) {
    return data
  }

  // 对于JSON类型，将对象转换为JSON字符串
  if (contentType && contentType.includes('application/json')) {
    return JSON.stringify(data)
  }

  // 其他情况返回原始数据
  return data
}

/**
 * 请求拦截器
 * @param {Object} options - 请求选项
 * @returns {Object} 处理后的请求选项
 */
async function requestInterceptor(options) {
  const globalStore = useGlobalStore()
  // 获取基础URL（优先从store获取）
  const baseURL = globalStore.GetAppConfig?.apiBaseUrl || requestConfig.baseURL

  // 构建完整URL
  const url = options.url.startsWith('http')
    ? options.url
    : `${baseURL}${options.url}`

  // 合并默认配置和自定义配置
  const mergedOptions = {
    ...requestConfig,
    ...options,
    headers: {
      ...requestConfig.headers,
      ...options.headers,
    },
    // 确保携带cookie
    credentials: 'include',
  }

  // 处理查询参数
  let finalUrl = url
  if (mergedOptions.params && Object.keys(mergedOptions.params).length > 0) {
    finalUrl = buildUrlWithParams(url, mergedOptions.params)
    // 移除params，因为已经拼接到URL中
    delete mergedOptions.params
  }

  // 处理请求体数据
  if (mergedOptions.body) {
    const contentType =
      mergedOptions.headers['Content-Type'] ||
      requestConfig.headers['Content-Type']
    mergedOptions.body = prepareRequestData(mergedOptions.body, contentType)
  }

  // 添加token（如果存在）
  const token = globalStore.userInfo?.token || ''
  if (token) {
    mergedOptions.headers['Authorization'] = `Bearer ${token}`
  }

  // 添加请求时间戳，用于调试
  mergedOptions.headers['X-Request-Time'] = new Date().toISOString()

  return {
    ...mergedOptions,
    url: finalUrl,
  }
}

/**
 * 响应拦截器
 * @param {Response} response - 响应对象
 * @param {boolean} isStream - 是否为流式响应
 * @returns {Object|ReadableStream} 处理后的响应数据或读取器
 */
async function responseInterceptor(response, isStream = false) {
  // 检查响应状态
  if (!response.ok) {
    const error = new Error(`HTTP error! Status: ${response.status}`)
    error.response = response
    throw error
  }

  // 流式响应处理
  if (isStream && response.body) {
    return response.body.getReader()
  }

  // 非流式响应处理
  // 根据响应类型处理数据
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  } else {
    return await response.text()
  }
}

/**
 * 错误处理器
 * @param {Error} error - 错误对象
 * @returns {Promise} 包含错误信息的Promise（会被reject）
 */
async function errorHandler(error) {
  console.error('请求错误:', error)

  // 处理网络错误或请求超时
  if (!error.response) {
    // 检查是否是超时错误
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw new Error('网络连接异常，请检查您的网络设置')
  }

  // 处理HTTP错误状态码
  const { status } = error.response
  let errorMessage = ''

  try {
    // 尝试获取响应中的错误信息
    const errorData = await error.response.json().catch(() => ({}))
    errorMessage = errorData.message || errorData.msg || ''
  } catch (e) {
    // 解析错误时出错，忽略
  }

  switch (status) {
    case 401:
      console.error('未授权访问')
      // 可以在这里添加重定向到登录页面的逻辑
      if (process.client) {
        // 客户端操作，例如重定向
        window.location.href = '/'
      }
      throw new Error(errorMessage || '登录已过期，请重新登录')

    case 403:
      throw new Error(errorMessage || '没有权限执行此操作')

    case 404:
      throw new Error(errorMessage || '请求的资源不存在')

    case 500:
    case 502:
    case 503:
      throw new Error(errorMessage || '服务器错误，请稍后重试')

    default:
      throw new Error(errorMessage || `请求失败: ${status}`)
  }
}

/**
 * 创建请求实例
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {Object} additionalOptions - 附加选项
 * @param {boolean} additionalOptions.isStream - 是否为流式响应
 * @returns {Promise} 请求结果
 */
export async function request(url, options = {}, additionalOptions = {}) {
  try {
    // 使用请求拦截器处理选项
    const requestOptions = await requestInterceptor({
      url,
      ...options,
    })

    // 创建AbortController用于超时控制
    let abortController = null
    if (requestOptions.timeout) {
      abortController = new AbortController()
      requestOptions.signal = abortController.signal

      // 设置超时定时器
      timeoutId = setTimeout(() => {
        abortController.abort()
      }, requestOptions.timeout)

      // 清除timeout属性，fetch不支持这个选项
      delete requestOptions.timeout
    }

    // 发起fetch请求
    const response = await fetch(requestOptions.url, {
      ...requestOptions,
      // 移除url，因为它已经作为第一个参数传递
      url: undefined,
    })

    // 清除超时定时器
    if (abortController) {
      clearTimeout(timeoutId)
    }

    // 使用响应拦截器处理响应
    return await responseInterceptor(response, additionalOptions.isStream)
  } catch (error) {
    // 处理请求错误
    return errorHandler(error)
  }
}

/**
 * GET请求快捷方法
 * @param {string} url - 请求URL
 * @param {Object} params - 查询参数
 * @param {Object} options - 其他请求选项
 * @returns {Promise} 请求结果
 */
export async function get(url, params = {}, options = {}) {
  return request(url, {
    ...options,
    method: 'GET',
    params,
  })
}

/**
 * POST请求快捷方法
 * @param {string} url - 请求URL
 * @param {Object|FormData|URLSearchParams|string} data - 请求体数据
 * @param {Object} options - 其他请求选项
 * @returns {Promise} 请求结果
 */
export async function post(url, data = {}, options = {}) {
  return request(url, {
    ...options,
    method: 'POST',
    body: data,
  })
}

/**
 * 流式POST请求快捷方法
 * @param {string} url - 请求URL
 * @param {Object|FormData|URLSearchParams|string} data - 请求体数据
 * @param {Object} options - 其他请求选项
 * @returns {Promise<ReadableStreamDefaultReader>} 响应流读取器
 */
export async function postStream(url, data = {}, options = {}) {
  return request(url, {
    ...options,
    method: 'POST',
    body: data,
  }, { isStream: true })
}

/**
 * PUT请求快捷方法
 * @param {string} url - 请求URL
 * @param {Object|FormData|URLSearchParams|string} data - 请求体数据
 * @param {Object} options - 其他请求选项
 * @returns {Promise} 请求结果
 */
export async function put(url, data = {}, options = {}) {
  return request(url, {
    ...options,
    method: 'PUT',
    body: data,
  })
}

/**
 * DELETE请求快捷方法
 * @param {string} url - 请求URL
 * @param {Object} params - 查询参数
 * @param {Object} options - 其他请求选项
 * @returns {Promise} 请求结果
 */
export async function del(url, params = {}, options = {}) {
  return request(url, {
    ...options,
    method: 'DELETE',
    params,
  })
}

/**
 * 解析流式响应的辅助函数
 * @param {ReadableStreamDefaultReader} reader - 响应流读取器
 * @param {Function} onChunk - 每个数据块的回调函数
 * @param {Function} onComplete - 完成时的回调函数
 * @param {Function} onError - 错误时的回调函数
 */
export async function parseStreamResponse(reader, onChunk, onComplete, onError) {
  const decoder = new TextDecoder()
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        if (onComplete) onComplete()
        break
      }
      
      if (value) {
        const chunk = decoder.decode(value, { stream: true })
        if (onChunk) onChunk(chunk)
      }
    }
  } catch (error) {
    if (onError) onError(error)
    else console.error('流式响应处理错误:', error)
    throw error
  }
}

// 默认导出request方法
export default request
