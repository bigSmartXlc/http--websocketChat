<template>
  <div class="app-container">
    <header class="app-header">
      <h1>AI小助手</h1>
      <nav>
        <router-link to="/">http</router-link>
        <router-link to="/socket">WebSocket</router-link>
      </nav>
    </header>
    <main class="app-main">
      <!-- 如果访问的是首页(/)，显示ChatComponent，否则显示路由匹配的页面 -->
      <NuxtPage />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #f5f5f5;
}

.app-header {
  background-color: #4c51bf;
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app-main {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
nav {
  margin-top: 10px;
}
nav a {
  color: white;
  margin: 0 10px;
  text-decoration: none;
}
nav a:hover {
  text-decoration: underline;
}
</style>
