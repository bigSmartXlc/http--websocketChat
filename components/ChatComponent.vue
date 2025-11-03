<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="message in messages" :key="message.id" :class="['message', message.role]">
        <div class="message-content" v-html="formatMessageContent(message.content, message.reasoning, message.id)
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
    <div class="buttonQuestion">
      <span v-for="item in buttonQuestion" :key="item.id" data-action="msg">{{
        item.prompt_content
      }}</span>
    </div>
    <div class="chat-input">
      <input v-model="inputMessage" @keyup.enter="sendMessage" placeholder="输入您的问题..." :disabled="loading"
        class="message-input" />
      <button @click="sendMessage" :disabled="loading || !inputMessage.trim()" class="send-button">
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, computed } from 'vue'
import {
  sendChatMessageStream,
  getUserInfo,
  getAppInitInfo,
  getQueryPrompt,
} from '@/services/deepseekService'
import { useGlobalStore } from '@/stores/global'

// 定义Message接口以支持思考过程
interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  reasoning?: string[] // 存储思考过程的数组
}

// 状态定义
const globalStore = useGlobalStore()
const address = computed(() => globalStore.currentLocation?.address)
const messages = ref<Message[]>([])
const inputMessage = ref('')
const loading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const expandedReasoning = ref<Record<string, boolean>>({})
const openReasoning = ref(true)
interface PresetQuestion {
  prompt_content: string
  type?: 'msg' | 'map'
  id: string
}
const presetQuestions = ref<PresetQuestion[]>([])
const buttonQuestion = ref<PresetQuestion[]>([])
//拼接问题列表
const presetQuestionsText = computed(() => {
  let text = `<ul class="preset-questions" style="list-style-type:decimal;cursor:pointer;">`
  presetQuestions.value.forEach((item) => {
    text += `<li data-action="${item.type || 'msg'
      }" class="preset-question-item"><svg t="1761638646841" class="leftIcon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3819" width="32" height="32"><path d="M241.6 512c0 149.5 121.1 270.8 270.4 270.8S782.4 661.6 782.4 512 661.3 241.2 512 241.2 241.6 362.5 241.6 512z m291.1-221.8c104.4 0 189.1 84.8 189.1 189.4 0 29.5-6.8 57.5-18.8 82.4 3.6-15 5.5-30.6 5.5-46.7 0-111-89.9-201.1-200.8-201.1-40.7 0-78.6 12.2-110.3 33 34.4-35.2 82.3-57 135.3-57z" fill="#8a8a8a" p-id="3820"></path><path d="M537.7 133c192.4 0 356.8 120.1 422.5 289.5C916.6 217.4 734.7 63.6 517 63.6c-250.3 0-453.2 203.2-453.2 453.8 0 57.9 10.8 113.3 30.6 164.3-6.5-30.6-9.9-62.3-9.9-94.9C84.5 336.2 287.4 133 537.7 133z" fill="#8a8a8a" p-id="3821"></path><path d="M213.1 740c-75.6-131.2-58.6-290.4 30.7-401.8-122.2 110.2-155.3 294.7-69.7 443.1 98.3 170.6 316.2 229 486.5 130.5 39.4-22.8 72.8-51.9 99.6-85.4-18.2 16.5-38.5 31.3-60.6 44C529.3 969 311.5 910.5 213.1 740z" fill="#8a8a8a" p-id="3822"></path><path d="M788.1 266.6c-30.1-17.4-62.9-27.3-96.5-30.2 18.3 5.1 36 12.5 52.9 22.3C874.9 334 907.4 522.2 817 678.8c-69.5 120.5-191.3 187.3-303.1 177.5 122.4 34.4 268.1-33.2 346.7-169.5 90.3-156.7 57.9-344.8-72.5-420.2z" fill="#8a8a8a" p-id="3823"></path></svg>${item.prompt_content
      }<svg t="1761635252640" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2662" width="32" height="32"><path d="M84.960699 390.521106l888.36099-135.63901-719.930132 238.486172zM257.863173 503.802038l719.930131-238.486172-629.007278 287.673945 10.43377 219.10917z" fill="#707070" p-id="2663"></path><path d="M375.615721 812.343523l-11.924309-219.109171 156.50655 99.866085zM634.969432 746.759825l-119.243086-77.508005-156.50655-99.866085 629.007278-287.673945z" fill="#707070" p-id="2664"></path></svg></li>`
  })
  return text + `</ul>`
})

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

const getUserInfoAndAddWelcomeMessage = async () => {
  try {
    // 获取查询参数id
    // const urlParams = new URLSearchParams(window.location.search)
    // const id: string = urlParams.get('id') || ''
    // const userInfo = await getUserInfo(id)
    // user.value = {
    //   phone: userInfo.phone,
    //   name: userInfo.name,
    // }
    //获取应用初始化信息
    const { appid, shareId, outLinkUid } = globalStore.GetAppConfig
    let appInitInfo: any = null
    if (!appid || !shareId || !outLinkUid) {
      throw new Error('应用配置参数缺失')
    } else {
      appInitInfo = await getAppInitInfo({
        appid,
        shareId,
        outLinkUid,
      })
    }
    console.log('应用初始化信息:', appInitInfo);
    // 添加欢迎消息
    messages.value.push({
      id: 'welcome',
      role: 'ai',
      content: `<p>${appInitInfo.app.chatConfig.welcomeText || `用户您好！您当前的位置为<span style="text-decoration:underline;color:blue;">${globalStore.currentLocation.address}(${globalStore.currentLocation.latitude},${globalStore.currentLocation.longitude})</span>附近,请问有什么可以帮您?您可以直接问或者点击下列问题列表中的问题。`}</p>${presetQuestionsText.value}`,
    })
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

//获取查询提示词
const getPrompt = async (prompt_type: string) => {
  try {
    const prompt = await getQueryPrompt(prompt_type)
    presetQuestions.value = prompt ? prompt : []
    getUserInfoAndAddWelcomeMessage()
  } catch (error) {
    console.error('获取查询提示词失败:', error)
    getUserInfoAndAddWelcomeMessage()
    throw error
  }
}

//获取按钮问题列表
const getButtonPrompt = async () => {
  try {
    const prompt = await getQueryPrompt('BUTTON')
    buttonQuestion.value = prompt ? prompt : []
  } catch (error) {
    console.error('获取按钮问题列表失败:', error)
    throw error
  }
}

//监听address
const hasShownWelcome = ref(false)
// 监听位置信息变化
const locationWatchStop = watch(
  () => globalStore.currentLocation?.address,
  (newAddress) => {
    if (newAddress && !hasShownWelcome.value) {
      hasShownWelcome.value = true
      getPrompt('TOP')
    }
  },
  { immediate: false, deep: true } // 立即执行并深度监听
)

//事件点击发送消息事件
const handleClickSendMessage = (event: Event, type: string) => {
  // 检查点击的元素或其祖先是否是快速问题列表项
  const target = event.target as Element
  const listItem = target.closest(`${type}[data-action]`)
  if (listItem) {
    // 触发自定义事件，传递问题内容
    const question = listItem.textContent?.trim()
    inputMessage.value = question
    sendMessage()
  }
}
//导航跳转小程序
const handleClickPresetQuestion = (event: Event) => {
  // 检查点击的元素是否是快速问题列表项
  if (event.target instanceof HTMLLIElement) {
    ; (window as any).wx.miniProgram.redirectTo({ url: '/pages/map/map' })
  }
}

//监听点击事件
const handleClickChatMessage = (container: HTMLElement) => {
  // 检查点击的元素是否是聊天消息项
  if (container) {
    if (container instanceof HTMLLIElement) {
      container.addEventListener('click', (event) => {
        const actionElement = (event.target as HTMLElement).closest(
          '[data-action]'
        ) as HTMLElement
        if (actionElement?.dataset.action === 'msg') {
          handleClickSendMessage(event, 'li')
        } else if (actionElement?.dataset.action === 'map') {
          handleClickPresetQuestion(event)
        }
      })
    }
  }
}

onMounted(async () => {
  getButtonPrompt()
  const chatContainer = document.querySelector('.chat-messages')
  const questionContainer = document.querySelector('.buttonQuestion')
  handleClickChatMessage(chatContainer as HTMLElement)
  handleClickChatMessage(questionContainer as HTMLElement)
})

const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) {
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
  // saveChatHistory()

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
      globalStore.currentLocation,
      {
        user_id: globalStore.userInfo.user_id,
        phone: globalStore.userInfo.phone,
        name: globalStore.userInfo.name,
        chat_id: globalStore.chatID,
      },
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
      content: '抱歉，网络繁忙请稍后再试',
    }
    messages.value.push(errorMessage)
  } finally {
    loading.value = false

    // 保存聊天记录（包含AI回复）
    // saveChatHistory()

    // 滚动到底部
    await nextTick()
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    console.log(
      'messagesContainer.value.scrollHeight',
      messagesContainer.value.scrollHeight
    )

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
      formattedContent += `<div class="reasoning-content" style="font-size: 12px;border-left:solid 2px #c4cbd7;padding-left:10px;line-height: 16px;">`
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
.buttonQuestion {
  padding: 5px 14px;
  display: flex;
  gap: 10px;
  overflow: auto;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* Internet Explorer 10+ */
}

.buttonQuestion span {
  background-color: #ffffff;
  color: #837d75;
  font-size: 14px;
  padding: 5px 10px;
  border-radius: 12px;
  /* 不允许换行 */
  white-space: nowrap;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
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
  background-color: #ffffff;
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
  background: linear-gradient(45deg, #1fd29d, #03aab9);
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
  background: linear-gradient(45deg, #1fd29d, #03aab9);
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
