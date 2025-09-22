// DeepSeek AI 服务模块
export const useDeepSeekAI = () => {
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

      // 发送请求到DeepSeek AI API
      const response = await fetch(
        'https://api.siliconflow.cn/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`, // 使用提供的API密钥
          },
          body: JSON.stringify(requestBody),
        }
      )

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
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('发送消息到DeepSeek AI失败:', error)
      throw error
    }
  }

  // 流式发送消息（可选功能，用于实时显示回复内容）
  const sendChatMessageStream = async (
    apiKey: string,
    messages: Array<{ role: 'user' | 'ai'; content: string }>,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ) => {
    try {
      // const requestBody = {
      //   model: 'Qwen/QwQ-32B',
      //   messages: messages.map((msg) => ({
      //     role: msg.role,
      //     content: msg.content,
      //   })),
      //   temperature: 0.7,
      //   max_tokens: 2000,
      //   stream: true, // 启用流式响应
      // }

      // const response = await fetch(
      //   'https://api.siliconflow.cn/v1/chat/completions',
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       Authorization: `Bearer ${apiKey}`,
      //     },
      //     body: JSON.stringify(requestBody),
      //   }
      // )

      const requestBody = {
        user_id: '123',
        model: 'Qwen/QwQ-32B',
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
        max_tokens: 1000,
        stream: true, // 启用流式响应
      }

      const response = await fetch('http://localhost:8000/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
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
              data = data.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
              
              const parsedData = JSON.parse(data)
              
              // 修复2：根据用户提供的实际数据结构直接从content字段获取内容
              const content = parsedData.content || ''
              if (content) {
                onChunk(content)
              }
              
              // 修复3：处理is_final标志来确定流式响应何时完成
              if (parsedData.is_final === true) {
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

  // 验证API密钥是否有效
  const validateApiKey = async (apiKey: string): Promise<boolean> => {
    try {
      // 发送一个简单的请求来验证API密钥
      const response = await fetch('https://api.deepseek.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })

      return response.ok
    } catch {
      return false
    }
  }

  return {
    sendChatMessage,
    sendChatMessageStream,
    validateApiKey,
  }
}
