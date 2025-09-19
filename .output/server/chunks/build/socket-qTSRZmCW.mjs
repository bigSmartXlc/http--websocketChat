import { defineComponent, ref, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderClass, ssrInterpolate, ssrRenderAttr, ssrRenderList, ssrIncludeBooleanAttr } from 'vue/server-renderer';
import { _ as _export_sfc } from './server.mjs';
import 'node:http';
import 'node:https';
import 'node:zlib';
import 'node:stream';
import 'node:buffer';
import 'node:util';
import 'node:url';
import 'node:net';
import 'node:fs';
import 'node:path';
import '../_/nitro.mjs';
import 'node:events';
import 'node:crypto';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "socket",
  __ssrInlineRender: true,
  setup(__props) {
    const websocketUrl = ref("ws://localhost:8080");
    ref(null);
    const isConnected = ref(false);
    const isConnecting = ref(false);
    const inputMessage = ref("");
    const messages = ref([]);
    ref(null);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "websocket-chat-container" }, _attrs))} data-v-cf86321b><div class="chat-header" data-v-cf86321b><h1 data-v-cf86321b>WebSocket\u804A\u5929\u754C\u9762</h1><div class="${ssrRenderClass([{ connected: isConnected.value, disconnected: !isConnected.value }, "connection-status"])}" data-v-cf86321b>${ssrInterpolate(isConnected.value ? "\u5DF2\u8FDE\u63A5" : "\u672A\u8FDE\u63A5")}</div></div>`);
      if (!isConnected.value && !isConnecting.value) {
        _push(`<div class="connection-settings" data-v-cf86321b><input${ssrRenderAttr("value", websocketUrl.value)} placeholder="\u8F93\u5165WebSocket\u670D\u52A1\u5668\u5730\u5740\uFF0C\u9ED8\u8BA4\u4E3Aws://localhost:8080" class="url-input" data-v-cf86321b><button class="connect-button" data-v-cf86321b>\u8FDE\u63A5</button></div>`);
      } else {
        _push(`<!---->`);
      }
      if (isConnecting.value) {
        _push(`<div class="connecting-status" data-v-cf86321b> \u6B63\u5728\u8FDE\u63A5\u670D\u52A1\u5668... </div>`);
      } else {
        _push(`<!---->`);
      }
      if (isConnected.value) {
        _push(`<div class="chat-messages" data-v-cf86321b><!--[-->`);
        ssrRenderList(messages.value, (message, index) => {
          _push(`<div class="${ssrRenderClass(["message", message.type])}" data-v-cf86321b><div class="message-sender" data-v-cf86321b>${ssrInterpolate(message.sender)}:</div><div class="message-content" data-v-cf86321b>${ssrInterpolate(message.content)}</div></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      if (isConnected.value) {
        _push(`<div class="chat-input-container" data-v-cf86321b><input${ssrRenderAttr("value", inputMessage.value)} placeholder="\u8F93\u5165\u6D88\u606F..." class="message-input" data-v-cf86321b><button${ssrIncludeBooleanAttr(!inputMessage.value.trim()) ? " disabled" : ""} class="send-button" data-v-cf86321b> \u53D1\u9001 </button><button class="disconnect-button" data-v-cf86321b> \u65AD\u5F00\u8FDE\u63A5 </button></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/socket.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const socket = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-cf86321b"]]);

export { socket as default };
//# sourceMappingURL=socket-qTSRZmCW.mjs.map
