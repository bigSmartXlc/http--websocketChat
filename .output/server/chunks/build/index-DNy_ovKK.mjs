import { defineComponent, ref, mergeProps, useSSRContext } from 'vue';
import { ssrRenderComponent, ssrRenderAttrs, ssrRenderList, ssrRenderClass, ssrInterpolate, ssrRenderAttr, ssrIncludeBooleanAttr } from 'vue/server-renderer';
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

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ChatComponent",
  __ssrInlineRender: true,
  setup(__props) {
    const messages = ref([]);
    const inputMessage = ref("");
    const loading = ref(false);
    ref(null);
    const showSettings = ref(false);
    const apiKey = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "chat-container" }, _attrs))} data-v-db751e89><div class="chat-messages" data-v-db751e89><!--[-->`);
      ssrRenderList(messages.value, (message) => {
        _push(`<div class="${ssrRenderClass(["message", message.role])}" data-v-db751e89><div class="message-content" data-v-db751e89>${ssrInterpolate(message.content)}</div></div>`);
      });
      _push(`<!--]-->`);
      if (loading.value) {
        _push(`<div class="message ai" data-v-db751e89><div class="message-content" data-v-db751e89><span class="typing-indicator" data-v-db751e89><span data-v-db751e89></span><span data-v-db751e89></span><span data-v-db751e89></span></span></div></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="chat-input" data-v-db751e89><input${ssrRenderAttr("value", inputMessage.value)} placeholder="\u8F93\u5165\u60A8\u7684\u95EE\u9898..."${ssrIncludeBooleanAttr(loading.value) ? " disabled" : ""} class="message-input" data-v-db751e89><button${ssrIncludeBooleanAttr(loading.value || !inputMessage.value.trim()) ? " disabled" : ""} class="send-button" data-v-db751e89> \u53D1\u9001 </button></div>`);
      if (showSettings.value) {
        _push(`<div class="chat-settings" data-v-db751e89><h3 data-v-db751e89>API\u8BBE\u7F6E</h3><input${ssrRenderAttr("value", apiKey.value)} placeholder="\u8BF7\u8F93\u5165API Key" type="password" class="settings-input" data-v-db751e89><button class="save-button" data-v-db751e89>\u4FDD\u5B58\u8BBE\u7F6E</button><button class="close-button" data-v-db751e89>\u5173\u95ED</button></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<button class="settings-button" data-v-db751e89> \u2699\uFE0F </button></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ChatComponent.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const ChatComponent = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-db751e89"]]);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(ChatComponent, _attrs, null, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-DNy_ovKK.mjs.map
