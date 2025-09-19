import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';

// 创建HTTP服务器（用于WebSocket服务器）
const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket服务器正在运行\n');
});

// 创建WebSocket服务器实例
const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws'
});

// 存储客户端连接
const clients = new Set();

/**
 * 模拟大模型流式响应
 * @param {string} prompt 用户提示词
 */
function* mockLLMStreamResponse(prompt) {
  const responseChunks = ['这是', '来自', '大模型', '的流式', '回复'];
  for (const chunk of responseChunks) {
    yield chunk;
    // 模拟大模型处理耗时
    try {
      // eslint-disable-next-line no-promise-executor-return
      yield new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error('模拟延迟出错:', error);
    }
  }
}

/**
 * 启动WebSocket服务器
 * @param {number} port 端口号
 */
function startWebSocketServer(port = 8081) {
  // 监听客户端连接
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('新客户端已连接');

    // 监听客户端消息
    ws.on('message', async (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        if (parsedMessage.type === 'chat') {
          console.log('收到对话请求，转发给大模型...');
          const prompt = parsedMessage.content;
          const stream = mockLLMStreamResponse(prompt);

          for await (const chunk of stream) {
            if (typeof chunk === 'string') {
              const responseChunk = {
                type: 'chat_response_chunk',
                content: chunk,
              };
              ws.send(JSON.stringify(responseChunk));
            }
          }

          // 发送结束标志
          ws.send(
            JSON.stringify({
              type: 'chat_response_end',
              message: '流式响应结束',
            })
          );
        }
      } catch (error) {
        console.error('处理消息时出错:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            message: '处理消息时发生错误',
          })
        );
      }
    });

    // 监听客户端断开连接
    ws.on('close', () => {
      clients.delete(ws);
      console.log('客户端已断开连接');
    });
  });

  // 启动HTTP服务器（包含WebSocket服务）
  httpServer.listen(port, () => {
    console.log(`WebSocket服务器已在端口${port}上启动`);
    console.log(`WebSocket端点: ws://localhost:${port}/ws`);
    console.log(`HTTP状态检查: http://localhost:${port}`);
  });

  // 处理服务器错误
  httpServer.on('error', (error) => {
    console.error('WebSocket服务器启动失败:', error);
    // 检查端口是否被占用
    if (error.code === 'EADDRINUSE') {
      console.log(`端口${port}已被占用，请尝试其他端口`);
    }
  });
}

// 启动服务器
startWebSocketServer(8081);