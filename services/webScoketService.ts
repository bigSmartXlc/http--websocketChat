import { WebSocket, WebSocketServer } from 'ws'

// WebSocket 服务器配置
const wss = new WebSocketServer({ port: 8080 })

// 存储客户端连接
const clients = new Set<WebSocket>()

// 模拟大模型流式响应
function* mockLLMStreamResponse(prompt: string) {
  const responseChunks = ['这是', '来自', '大模型', '的流式', '回复']
  for (const chunk of responseChunks) {
    yield chunk
    // 模拟大模型处理耗时
    try {
      // eslint-disable-next-line no-promise-executor-return
      yield new Promise((resolve) => setTimeout(resolve, 300))
    } catch (error) {
      console.error('模拟延迟出错:', error)
    }
  }
}

// 监听客户端连接
wss.on('connection', (ws: WebSocket) => {
  clients.add(ws)
  console.log('新客户端已连接')

  // 监听客户端消息
  ws.on('message', async (message: string) => {
    try {
      const parsedMessage = JSON.parse(message)
      if (parsedMessage.type === 'chat') {
        console.log('收到对话请求，转发给大模型...')
        const prompt = parsedMessage.content
        const stream = mockLLMStreamResponse(prompt)

        for await (const chunk of stream) {
          if (typeof chunk === 'string') {
            const responseChunk = {
              type: 'chat_response_chunk',
              content: chunk,
            }
            ws.send(JSON.stringify(responseChunk))
          }
        }

        // 发送结束标志
        ws.send(
          JSON.stringify({
            type: 'chat_response_end',
            message: '流式响应结束',
          })
        )
      }
    } catch (error) {
      console.error('处理消息时出错:', error)
      ws.send(
        JSON.stringify({
          type: 'error',
          message: '处理消息时发生错误',
        })
      )
    }
  })

  // 监听客户端断开连接
  ws.on('close', () => {
    clients.delete(ws)
    console.log('客户端已断开连接')
  })
})

// 客户端连接函数
export function connectToWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)

    ws.on('open', () => {
      console.log('已连接到 WebSocket 服务器')
      resolve(ws)
    })

    ws.on('error', (error) => {
      console.error('WebSocket 连接出错:', error)
      reject(error)
    })
  })
}

// 发送聊天消息的函数
export async function sendChatMessage(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    const chatMessage = {
      type: 'chat',
      content: message,
    }
    ws.send(JSON.stringify(chatMessage))
  } else {
    throw new Error('WebSocket 连接未就绪')
  }
}
