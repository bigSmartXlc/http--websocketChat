<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role]">
        <div
          class="message-content"
          v-html="
            formatMessageContent(message.content, message.reasoning, message.id)
          "></div>
      </div>
      <div v-if="loading" class="message ai">
        <div class="message-content">
          <span class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      </div>
    </div>
    <div class="chat-input">
      <input
        v-model="inputMessage"
        @keyup.enter="sendMessage"
        placeholder="输入您的问题..."
        :disabled="loading"
        class="message-input" />
      <button
        @click="sendMessage"
        :disabled="loading || !inputMessage.trim()"
        class="send-button">
        发送
      </button>
    </div>
    <div class="chat-settings" v-if="showSettings">
      <h3>API设置</h3>
      <input
        v-model="apiKey"
        placeholder="请输入API Key"
        type="password"
        class="settings-input" />
      <button @click="saveSettings" class="save-button">保存设置</button>
      <button @click="showSettings = false" class="close-button">关闭</button>
    </div>
    <button @click="showSettings = !showSettings" class="settings-button">
      ⚙️
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { sendChatMessageStream } from '@/services/deepseekService'

// 定义Message接口以支持思考过程
interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  reasoning?: string[] // 存储思考过程的数组
}

// 状态定义
const messages = ref<Message[]>([])
const inputMessage = ref('')
const loading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const showSettings = ref(false)
const apiKey = ref('')
const expandedReasoning = ref<Record<string, boolean>>({})
const openReasoning = ref(true)

// 从localStorage加载聊天记录
const loadChatHistory = () => {
  try {
    const savedMessages = localStorage.getItem('chatMessages')
    if (savedMessages) {
      const parsedMessages: Message[] = JSON.parse(savedMessages)
      // 移除欢迎消息（如果存在），避免重复添加
      const filteredMessages = parsedMessages.filter(
        (msg) => msg.id !== 'welcome'
      )
      return filteredMessages
    }
  } catch (error) {
    console.error('加载聊天记录失败:', error)
  }
  return []
}

// 保存聊天记录到localStorage，最多保存30条
const saveChatHistory = () => {
  try {
    // 移除欢迎消息，因为我们每次加载都会重新添加
    const messagesToSave = messages.value.filter((msg) => msg.id !== 'welcome')
    // 只保留最近30条记录
    const recentMessages = messagesToSave.slice(-30)
    localStorage.setItem('chatMessages', JSON.stringify(recentMessages))
  } catch (error) {
    console.error('保存聊天记录失败:', error)
  }
}

onMounted(() => {
  // 从localStorage加载API Key
  const savedApiKey = localStorage.getItem('deepseekApiKey')
  if (savedApiKey) {
    apiKey.value = savedApiKey
  }

  // 从localStorage加载聊天记录
  const savedMessages = loadChatHistory()
  if (savedMessages.length > 0) {
    messages.value = [...savedMessages]
  } else {
    // 如果没有保存的聊天记录，添加欢迎消息
    messages.value.push({
      id: 'welcome',
      role: 'ai',
      content: '您好！我是DeepSeek AI助手，有什么可以帮助您的吗？',
    })
  }

  // 获取查询参数appid
  const urlParams = new URLSearchParams(window.location.search)
  const appid = urlParams.get('appid')
  if (appid) {
    inputMessage.value = appid
  }
})

const saveSettings = () => {
  localStorage.setItem('deepseekApiKey', apiKey.value)
  showSettings.value = false
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value || !apiKey.value) {
    return
  }

  // 添加用户消息
  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: inputMessage.value,
  }
  messages.value.push(userMessage)

  // 保存聊天记录
  saveChatHistory()

  // 清空输入框
  inputMessage.value = ''

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  loading.value = true

  try {
    // 创建一个空的AI消息对象，用于后续更新
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'ai',
      content: '', // 初始为空，通过流式响应逐步填充
      reasoning: [], // 初始化思考过程数组
    }
    messages.value.push(aiMessage)

    // 默认展开思考过程
    expandedReasoning.value[aiMessageId] = true

    // 使用流式响应函数，并在回调中更新消息内容
    await sendChatMessageStream(
      apiKey.value,
      [userMessage],
      (data) => {
        // 在onChunk回调中，找到对应的消息并追加内容或思考过程
        const messageIndex = messages.value.findIndex(
          (msg) => msg.id === aiMessageId
        )
        if (messageIndex !== -1) {
          if (typeof data === 'string') {
            // 普通文本内容
            messages.value[messageIndex].content += data
          } else {
            // 包含内容和思考过程的对象
            if (data.content) {
              messages.value[messageIndex].content += data.content
            }
            if (
              data.reasoning &&
              typeof data.reasoning === 'string' &&
              data.reasoning.trim()
            ) {
              // 确保reasoning数组存在
              if (!messages.value[messageIndex].reasoning) {
                messages.value[messageIndex].reasoning = []
              }
              messages.value[messageIndex].reasoning.push(data.reasoning)
            }
          }
          // 触发响应式更新
          messages.value = [...messages.value]
        }
      },
      () => {
        // 在onComplete回调中，可以进行完成后的处理
        console.log('请求完成')
        // 如果最终内容为空，可以设置默认消息
        const messageIndex = messages.value.findIndex(
          (msg) => msg.id === aiMessageId
        )
        if (
          messageIndex !== -1 &&
          !(messages.value[messageIndex].content?.trim() ?? '')
        ) {
          messages.value[messageIndex].content =
            '抱歉，我暂时无法回答这个问题。'
          messages.value = [...messages.value]
        }
      }
    )
  } catch (error) {
    console.error('API错误:', error)
    const errorMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'ai',
      content: '抱歉，API请求失败，请检查您的API Key是否正确。',
    }
    messages.value.push(errorMessage)
  } finally {
    loading.value = false

    // 保存聊天记录（包含AI回复）
    saveChatHistory()

    // 滚动到底部
    await nextTick()
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 格式化消息内容，支持显示可关闭的思考过程
const formatMessageContent = (
  content: string,
  reasoning?: string[],
  messageId?: string
) => {
  if (!content && (!reasoning || reasoning.length === 0)) return ''

  let formattedContent = ''

  // 如果有思考过程，显示可关闭的思考过程
  if (openReasoning.value && reasoning && reasoning.length > 0 && messageId) {
    const isExpanded = expandedReasoning.value[messageId] !== false
    formattedContent += `<div class="reasoning-process">`
    formattedContent += `<div class="reasoning-header">`
    formattedContent += `<span class="reasoning-title">🤔 思考过程：</span>`
    formattedContent += `</div>`

    if (isExpanded) {
      formattedContent += `<div class="reasoning-content" style="font-size: 12px;border-left:solid 2px #c4cbd7;padding-left:10px;">`
      formattedContent += reasoning.join('')
      formattedContent += `</div>`
    }
    formattedContent += `</div>`
  }

  // 然后显示普通内容
  if (content) {
    let processedContent = content

    // 将Markdown粗体格式(**文本**)转换为HTML的<strong>标签
    processedContent = processedContent.replace(
      /\*\*(.+?)\*\*/g,
      '<strong>$1</strong>'
    )

    // 将Markdown三级标题(### 标题)转换为HTML的<h3>标签
    processedContent = processedContent.replace(/^### (.+)$/gm, '<h3>$1</h3>')

    // 将换行符转换为HTML的<br>标签
    processedContent = processedContent.replace(/\n/g, '<br>')

    formattedContent += `<div class="normal-content">${processedContent}</div>`
  }

  return formattedContent
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background-color: #f9f9f9;
}

.message {
  margin-bottom: 1rem;
  display: flex;
}

.message.user {
  justify-content: flex-end;
  margin-left: auto;
}

.message.ai {
  justify-content: flex-start;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: 18px;
  word-wrap: break-word;
  position: relative;
  background-color: #e2e8f0;
}

/* Markdown格式样式 */
.message-content strong {
  font-weight: bold;
}

.message-content h3 {
  font-size: 1.1em;
  font-weight: 600;
  margin: 10px 0 5px 0;
  color: #333;
}

.message.user .message-content {
  background-color: #4c51bf;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.ai .message-content {
  color: #333;
  border: 1px solid #eaeaea;
  border-bottom-left-radius: 4px;
}

.normal-content {
  line-height: 1.6;
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
  left: 10px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s;
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
</style>
