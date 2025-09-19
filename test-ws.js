// 简单的WebSocket服务器测试脚本
// 这个脚本可以直接运行来测试WebSocket服务是否正常工作

const WebSocket = require('ws')

// 创建WebSocket连接
const ws = new WebSocket('ws://localhost:8080')

// 连接成功事件
ws.on('open', () => {
  console.log('已成功连接到WebSocket服务器')
  
  // 发送测试消息
  const testMessage = {
    type: 'chat',
    content: '这是一条测试消息'
  }
  
  console.log('发送测试消息:', testMessage)
  ws.send(JSON.stringify(testMessage))
})

// 接收消息事件
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data)
    console.log('收到服务器消息:', message)
    
    // 如果收到结束消息，关闭连接
    if (message.type === 'chat_response_end') {
      console.log('测试完成，正在关闭连接...')
      setTimeout(() => {
        ws.close()
      }, 1000)
    }
  } catch (error) {
    console.error('解析消息失败:', error)
  }
})

// 错误事件
ws.on('error', (error) => {
  console.error('WebSocket错误:', error)
})

// 关闭事件
ws.on('close', () => {
  console.log('WebSocket连接已关闭')
})

// 处理超时
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('测试超时，关闭连接')
    ws.close()
  }
}, 10000) // 10秒超时