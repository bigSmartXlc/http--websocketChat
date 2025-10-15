<template>
  <div class="chat-container">
    <!-- 连接状态显示 -->
    <!-- <div class="status-bar">
      <h1>WebSocket聊天</h1>
      <div
        class="connection-status"
        :class="{ connected: isConnected, disconnected: !isConnected }">
        {{ isConnected ? '已连接' : '未连接' }}
      </div>
    </div> -->

    <!-- 聊天消息列表 -->
    <div class="chat-messages" ref="messagesContainer">
      <!-- <div v-if="!isConnected && !isConnecting" class="connection-prompt">
        <p>请先连接到WebSocket服务器</p>
        <div class="connection-settings">
          <input
            v-model="websocketUrl"
            placeholder="WebSocket服务器地址"
            class="url-input" />
          <button @click="connect" class="connect-button">连接</button>
        </div>
      </div>

      <div v-if="isConnecting" class="connecting-status">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p>正在连接服务器...</p>
      </div> -->

      <!-- 消息列表 -->
      <template v-if="isConnected">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.type]">
          <div v-if="message.type !== 'system'" class="message-sender">
            {{ message.sender }}:
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
        <div v-if="isWaitingResponse" class="message response">
          <div class="message-content">
            <span class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- 消息输入区域 -->
    <div class="chat-input" v-if="isConnected">
      <input
        v-model="inputMessage"
        @keyup.enter="sendMessage"
        placeholder="输入消息..."
        class="message-input" />
      <button
        @click="sendMessage"
        :disabled="!inputMessage.trim()"
        class="send-button">
        发送
      </button>
    </div>

    <!-- 设置按钮 -->
    <!-- <button @click="showSettings = !showSettings" class="settings-button">
      ⚙️
    </button> -->

    <!-- 设置面板 -->
    <div class="chat-settings" v-if="showSettings">
      <h3>连接设置</h3>
      <input
        v-model="websocketUrl"
        placeholder="WebSocket服务器地址"
        class="settings-input" />
      <button
        @click="connect"
        :disabled="isConnected || isConnecting"
        class="save-button">
        {{ isConnected ? '已连接' : '连接' }}
      </button>
      <button @click="showSettings = false" class="close-button">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// WebSocket连接相关状态
const websocketUrl = ref('ws://localhost:8081/ws')
const wsConnection = ref<WebSocket | null>(null)
const isConnected = ref(false)
const isConnecting = ref(false)
const showSettings = ref(false)
const isWaitingResponse = ref(false)

// 聊天消息相关状态
const inputMessage = ref('')
const messages = ref<
  Array<{
    type: 'user' | 'system' | 'error' | 'response'
    sender: string
    content: string
  }>
>([])
const messagesContainer = ref<HTMLElement | null>(null)

/**
 * 初始化WebSocket连接
 */
const connect = async () => {
  if (isConnecting.value || isConnected.value) {
    return
  }

  isConnecting.value = true
  // addSystemMessage(`正在连接到服务器: ${websocketUrl.value}`)

  try {
    // 使用浏览器原生WebSocket API连接
    wsConnection.value = await browserConnectToWebSocket(websocketUrl.value)

    // 设置连接成功状态
    isConnected.value = true
    // addSystemMessage('已成功连接到WebSocket服务器')

    // 设置WebSocket事件监听器
    setupWebSocketListeners(wsConnection.value)

    // 测试连接 - 发送一条欢迎消息
    // addSystemMessage('连接成功，可以开始发送消息了...')

    // 发送一条欢迎消息给服务器
    await browserSendChatMessage(wsConnection.value, '你好，WebSocket服务器！')
  } catch (error) {
    console.error('WebSocket连接失败:', error)
    addErrorMessage(
      `连接失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
  } finally {
    isConnecting.value = false
  }
}

/**
 * 浏览器环境中的WebSocket连接函数
 * @param url WebSocket服务器地址
 * @returns Promise<WebSocket>
 */
const browserConnectToWebSocket = (url: string): Promise<WebSocket> => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    // 设置超时处理
    const timeoutId = setTimeout(() => {
      reject(new Error('WebSocket连接超时'))
    }, 10000) // 10秒超时

    // 连接成功事件
    ws.onopen = () => {
      clearTimeout(timeoutId)
      console.log('已连接到 WebSocket 服务器')
      resolve(ws)
    }

    // 连接错误事件
    ws.onerror = (error) => {
      clearTimeout(timeoutId)
      console.error('WebSocket 连接出错:', error)
      reject(new Error('连接WebSocket服务器失败'))
    }

    // 连接关闭事件（在建立连接前关闭）
    ws.onclose = () => {
      clearTimeout(timeoutId)
      reject(new Error('WebSocket连接被关闭'))
    }
  })
}

/**
 * 断开WebSocket连接
 */
const disconnect = () => {
  if (wsConnection.value) {
    wsConnection.value.close()
    wsConnection.value = null
    isConnected.value = false
    addSystemMessage('已断开与服务器的连接')
  }
}

/**
 * 设置WebSocket事件监听器
 * @param ws WebSocket实例
 */
const setupWebSocketListeners = (ws: WebSocket) => {
  // 监听消息接收事件
  ws.onmessage = (event: MessageEvent) => {
    try {
      const parsedMessage = JSON.parse(event.data)

      // 处理不同类型的消息
      switch (parsedMessage.type) {
        case 'chat_response_chunk':
          // 处理流式响应数据块
          handleResponseChunk(parsedMessage.content)
          break

        case 'chat_response_end':
          // 处理响应结束标志
          isWaitingResponse.value = false
          // addSystemMessage('--- 响应结束 ---')
          break

        case 'error':
          // 处理错误消息
          isWaitingResponse.value = false
          addErrorMessage(`服务器错误: ${parsedMessage.message}`)
          break

        default:
          // 处理未知类型的消息
          addSystemMessage(
            `收到未知类型的消息: ${JSON.stringify(parsedMessage)}`
          )
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error)
      isWaitingResponse.value = false
      addErrorMessage(
        `解析消息失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  // 监听连接关闭事件
  ws.onclose = () => {
    wsConnection.value = null
    isConnected.value = false
    isWaitingResponse.value = false
    addSystemMessage('与服务器的连接已关闭')
  }

  // 监听错误事件
  ws.onerror = (error) => {
    console.error('WebSocket错误:', error)
    isWaitingResponse.value = false
    addErrorMessage(
      `WebSocket错误: ${error instanceof Event ? '连接错误' : '未知错误'}`
    )
  }
}

/**
 * 处理响应数据块
 * @param chunk 数据块内容
 */
const handleResponseChunk = (chunk: string) => {
  // 检查是否需要创建新的响应消息
  const lastMessage = messages.value[messages.value.length - 1]

  if (!lastMessage || lastMessage.type !== 'response') {
    // 创建新的响应消息
    messages.value.push({
      type: 'response',
      sender: 'AI',
      content: chunk,
    })
  } else {
    // 追加到现有的响应消息
    lastMessage.content += chunk
    // 强制Vue更新视图
    messages.value = [...messages.value]
  }

  // 滚动到底部
  nextTick().then(() => scrollToBottom())
}

/**
 * 发送聊天消息
 */
const sendMessage = async () => {
  if (!inputMessage.value.trim() || !wsConnection.value) {
    return
  }

  const message = inputMessage.value.trim()

  // 添加用户消息到界面
  messages.value.push({
    type: 'user',
    sender: '您',
    content: message,
  })

  try {
    // 显示等待响应状态
    isWaitingResponse.value = true

    // 发送消息到服务器
    await browserSendChatMessage(wsConnection.value, message)

    // 清空输入框
    inputMessage.value = ''

    // 滚动到底部
    nextTick().then(() => scrollToBottom())
  } catch (error) {
    console.error('发送消息失败:', error)
    addErrorMessage(
      `发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
    isWaitingResponse.value = false
  }
}

/**
 * 浏览器环境中的发送聊天消息函数
 * @param ws WebSocket实例
 * @param message 消息内容
 * @returns Promise<void>
 */
const browserSendChatMessage = (
  ws: WebSocket,
  message: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      const chatMessage = {
        type: 'chat',
        content: message,
      }

      // 添加消息ID和时间戳，便于跟踪
      const messageWithMetadata = {
        ...chatMessage,
        messageId: Date.now().toString(),
        timestamp: new Date().toISOString(),
      }

      ws.send(JSON.stringify(messageWithMetadata))

      // 模拟成功回调
      setTimeout(() => {
        resolve()
      }, 10)
    } else {
      reject(new Error('WebSocket 连接未就绪'))
    }
  })
}

/**
 * 添加系统消息
 * @param content 消息内容
 */
const addSystemMessage = (content: string) => {
  messages.value.push({
    type: 'system',
    sender: '系统',
    content,
  })

  // 滚动到底部
  nextTick().then(() => scrollToBottom())
}

/**
 * 添加错误消息
 * @param content 错误内容
 */
const addErrorMessage = (content: string) => {
  messages.value.push({
    type: 'error',
    sender: '错误',
    content,
  })

  // 滚动到底部
  nextTick().then(() => scrollToBottom())
}

/**
 * 滚动到底部
 */
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 组件挂载时的钩子
onMounted(() => {
  // 可以在这里进行一些初始化操作
  connect()
  // 例如从URL参数中获取WebSocket服务器地址
})

// 组件卸载时的钩子
onUnmounted(() => {
  // 断开WebSocket连接
  disconnect()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 85vh;
  max-width: 800px;
  margin: 0 auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eaeaea;
}

.status-bar h1 {
  font-size: 1.5rem;
  margin: 0;
  color: #333;
}

.connection-status {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: bold;
}

.connection-status.connected {
  background-color: #4caf50;
  color: white;
}

.connection-status.disconnected {
  background-color: #f44336;
  color: white;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background-color: #f9f9f9;
}

.connection-prompt {
  text-align: center;
  margin-top: 50px;
}

.connection-prompt p {
  margin-bottom: 1rem;
  color: #666;
}

.connection-settings {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 1rem;
}

.url-input {
  flex: 0 0 300px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.connect-button {
  padding: 0.75rem 1.5rem;
  background-color: #4c51bf;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.connect-button:hover:not(:disabled) {
  background-color: #434190;
}

.connect-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.connecting-status {
  text-align: center;
  margin-top: 50px;
  color: #666;
}

.connecting-status p {
  margin-top: 10px;
}

.message {
  margin-bottom: 1rem;
  display: flex;

  max-width: 80%;
}

.message.user {
  align-items: flex-end;
  margin-left: auto;
  flex-direction: row-reverse;
}

.message.response,
.message.error,
.message.system {
  align-items: flex-start;
}

.message-sender {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
  /* 底部对齐 */
  align-self: flex-end;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  word-wrap: break-word;
  position: relative;
  max-width: 95%;
  text-align: left;
}

.message.user .message-content {
  background-color: #4c51bf;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.response .message-content {
  background-color: white;
  color: #333;
  border: 1px solid #eaeaea;
  border-bottom-left-radius: 4px;
}

.message.system .message-content {
  background-color: #e3f2fd;
  color: #1976d2;
  border-radius: 8px;
  font-size: 0.875rem;
}

.message.error .message-content {
  background-color: #ffebee;
  color: #d32f2f;
  border-radius: 8px;
  font-size: 0.875rem;
}

.chat-input {
  display: flex;
  padding: 1rem;
  border-top: 1px solid #eaeaea;
  background-color: white;
}

.message-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  border-color: #4c51bf;
}

.send-button {
  margin-left: 0.75rem;
  padding: 0.75rem 1.5rem;
  background-color: #4c51bf;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #434190;
}

.send-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.settings-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s;
  z-index: 10;
}

.settings-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.chat-settings {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 300px;
}

.chat-settings h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.settings-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 1rem;
  box-sizing: border-box;
}

.save-button,
.close-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-right: 0.5rem;
}

.save-button {
  background-color: #4c51bf;
  color: white;
}

.close-button {
  background-color: #ccc;
  color: #333;
}

.typing-indicator {
  display: inline-flex;
  align-items: center;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background-color: #999;
  border-radius: 50%;
  margin: 0 2px;
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0% {
    transform: translateY(0px);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-5px);
    opacity: 1;
  }
  100% {
    transform: translateY(0px);
    opacity: 0.6;
  }
}
.message {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
  max-width: 80%;
}

.message.user {
  background-color: #e3f2fd;
  margin-left: auto;
  text-align: right;
}

.message.response {
  background-color: #f5f5f5;
  margin-right: auto;
}

.message.system {
  background-color: #fff3e0;
  margin: 0 auto;
  text-align: center;
  max-width: 90%;
}

.message.error {
  background-color: #ffebee;
  margin: 0 auto;
  text-align: center;
  max-width: 90%;
}

.message-sender {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
}

.message-content {
  font-size: 16px;
  word-wrap: break-word;
}

.chat-input-container {
  display: flex;
  gap: 10px;
}

.message-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.send-button {
  padding: 12px 24px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.send-button:hover:not(:disabled) {
  background-color: #45a049;
}

.send-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.disconnect-button {
  padding: 12px 24px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.disconnect-button:hover {
  background-color: #da190b;
}

/* 响应式设计 */
@media (max-width: 600px) {
  .websocket-chat-container {
    padding: 10px;
  }

  .chat-header {
    flex-direction: column;
    gap: 10px;
  }

  .connection-settings {
    flex-direction: column;
  }

  .chat-input-container {
    flex-direction: column;
  }

  .message {
    max-width: 90%;
  }
}
</style>
