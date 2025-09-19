# WebSocket聊天示例

这是一个基于Nuxt 3和WebSocket的实时聊天应用示例。该应用包含一个集成在Nuxt服务器中的WebSocket服务，可以模拟大模型的流式响应。

## 功能特点

- 实时WebSocket通信
- 模拟大模型流式响应
- 完整的聊天界面，支持发送和接收消息
- 连接状态显示
- 响应式设计，适配移动设备

## 安装和运行

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm run dev
```

这将启动Nuxt前端应用。默认情况下，应用将运行在`http://localhost:3000`。

### 启动WebSocket服务器

Nuxt服务器启动时会自动初始化并启动WebSocket服务器，它将在端口8080上运行。

### 访问应用

打开浏览器，访问`http://localhost:3000/socket`即可进入聊天界面。

## WebSocket服务说明

WebSocket服务集成在Nuxt服务器中，在Nuxt启动时自动启动，它将在端口8080上运行。主要功能包括：

1. 接收客户端连接
2. 处理聊天消息请求
3. 模拟大模型流式响应
4. 维护客户端连接列表

### 消息格式

#### 客户端发送消息

```json
{
  "type": "chat",
  "content": "消息内容"
}
```

#### 服务器响应消息块

```json
{
  "type": "chat_response_chunk",
  "content": "响应内容块"
}
```

#### 服务器响应结束标志

```json
{
  "type": "chat_response_end",
  "message": "流式响应结束"
}
```

#### 错误消息

```json
{
  "type": "error",
  "message": "错误信息"
}
```

## 测试WebSocket服务

可以使用提供的测试脚本来验证WebSocket服务是否正常工作：

1. 确保Nuxt服务器正在运行
2. 打开另一个终端窗口
3. 运行测试脚本：

```bash
node test-ws.js
```

这将创建一个到WebSocket服务器的连接并发送一条测试消息，然后显示服务器的响应。

## 项目结构

- `pages/socket.vue` - 聊天界面组件
- `server/index.ts` - Nuxt服务器入口点，包含WebSocket服务实现
- `test-ws.js` - WebSocket服务测试脚本