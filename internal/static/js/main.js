var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// node_modules/@tinyfx/runtime/dist/signals.js
var effectStack = [];
function signal(v) {
  let value = v;
  const subs = /* @__PURE__ */ new Set();
  const fn = () => {
    const running = effectStack[effectStack.length - 1];
    if (running)
      subs.add(running);
    return value;
  };
  fn.set = (next) => {
    if (Object.is(next, value))
      return;
    value = next;
    subs.forEach((s) => s());
  };
  return fn;
}
function effect(fn) {
  const run = () => {
    effectStack.push(run);
    try {
      fn();
    } finally {
      effectStack.pop();
    }
  };
  run();
}

// node_modules/@tinyfx/runtime/dist/http/data.js
function httpError(status, statusText, url, method, response) {
  return { kind: "http", status, statusText, url, method, response };
}
function timeoutError(url, timeout) {
  return { kind: "timeout", url, timeout };
}
function parseError(message, url) {
  return { kind: "parse", message, url };
}
function isHttpError(err) {
  return typeof err === "object" && err !== null && "kind" in err && err.kind === "http";
}

// node_modules/@tinyfx/runtime/dist/http/helper.js
function buildUrl(url, base, params) {
  const fullUrl = base + url;
  if (!params || Object.keys(params).length === 0)
    return fullUrl;
  const urlObj = new URL(fullUrl, typeof window !== "undefined" ? window.location.href : "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, String(value));
  });
  return urlObj.toString().replace(urlObj.origin, "");
}
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// node_modules/@tinyfx/runtime/dist/http/http.js
function createHttp(config = {}) {
  var _a, _b, _c, _d, _e, _f, _g;
  const base = (_a = config.baseUrl) !== null && _a !== void 0 ? _a : "";
  const defaultHeaders = (_b = config.headers) !== null && _b !== void 0 ? _b : {};
  const defaultTimeout = (_c = config.timeout) !== null && _c !== void 0 ? _c : 3e4;
  const maxRetries = (_d = config.retries) !== null && _d !== void 0 ? _d : 0;
  const retryDelay = (_e = config.retryDelay) !== null && _e !== void 0 ? _e : 1e3;
  const requestInterceptors = (_f = config.requestInterceptors) !== null && _f !== void 0 ? _f : [];
  const responseInterceptors = (_g = config.responseInterceptors) !== null && _g !== void 0 ? _g : [];
  async function request(method, url, body, options = {}) {
    var _a2, _b2, _c2;
    const fullUrl = buildUrl(url, base, options.params);
    const timeoutMs = (_a2 = options.timeout) !== null && _a2 !== void 0 ? _a2 : defaultTimeout;
    const useJson = (_b2 = options.json) !== null && _b2 !== void 0 ? _b2 : true;
    let attempts = 0;
    const maxAttempts = maxRetries + 1;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        const headers = Object.assign(Object.assign({}, defaultHeaders), options.headers);
        if (body !== void 0 && useJson && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
        const serializedBody = body !== void 0 ? useJson ? JSON.stringify(body) : body : void 0;
        let fetchOptions = {
          method,
          headers,
          body: serializedBody,
          signal: options.signal
        };
        let requestUrl = fullUrl;
        for (const interceptor of requestInterceptors) {
          const result = await interceptor(requestUrl, fetchOptions);
          requestUrl = result.url;
          fetchOptions = result.options;
        }
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
        let combinedSignal = timeoutController.signal;
        if (options.signal) {
          const combinedController = new AbortController();
          const abortHandler = () => combinedController.abort();
          options.signal.addEventListener("abort", abortHandler, { once: true });
          timeoutController.signal.addEventListener("abort", abortHandler, { once: true });
          combinedSignal = combinedController.signal;
        }
        fetchOptions.signal = combinedSignal;
        let res;
        try {
          res = await fetch(requestUrl, fetchOptions);
        } catch (err) {
          clearTimeout(timeoutId);
          if (err instanceof Error && err.name === "AbortError") {
            if ((_c2 = options.signal) === null || _c2 === void 0 ? void 0 : _c2.aborted) {
              throw err;
            }
            throw timeoutError(requestUrl, timeoutMs);
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
        }
        for (const interceptor of responseInterceptors) {
          res = await interceptor(res);
        }
        if (!res.ok) {
          throw httpError(res.status, res.statusText, requestUrl, method, res);
        }
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          try {
            const text = await res.text();
            if (!text || text.trim().length === 0) {
              return void 0;
            }
            return JSON.parse(text);
          } catch (err) {
            throw parseError(`Failed to parse JSON response: ${err instanceof Error ? err.message : "Unknown error"}`, requestUrl);
          }
        }
        if (contentType.includes("text/")) {
          return await res.text();
        }
        try {
          const text = await res.text();
          return text || void 0;
        } catch (_d2) {
          return void 0;
        }
      } catch (err) {
        const is5xx = isHttpError(err) && err.status >= 500 && err.status < 600;
        const shouldRetry = attempts < maxAttempts && (!isHttpError(err) || is5xx);
        if (shouldRetry) {
          await sleep(retryDelay * attempts);
          continue;
        }
        throw err;
      }
    }
    throw new Error("Max retries exceeded");
  }
  return {
    get: (url, options) => request("GET", url, void 0, options),
    post: (url, body, options) => request("POST", url, body, options),
    put: (url, body, options) => request("PUT", url, body, options),
    patch: (url, body, options) => request("PATCH", url, body, options),
    del: (url, options) => request("DELETE", url, void 0, options),
    delete: (url, options) => request("DELETE", url, void 0, options)
  };
}

// node_modules/@tinyfx/runtime/dist/registry.js
var factories = /* @__PURE__ */ new Map();
function registerComponent(name, factory) {
  factories.set(name, factory);
}

// node_modules/@tinyfx/runtime/dist/page-registry.js
var modules = /* @__PURE__ */ new Map();
function registerPage(path, module) {
  modules.set(path, module);
}
function runPageInit(path, ctx) {
  const mod = modules.get(path);
  if (typeof (mod === null || mod === void 0 ? void 0 : mod.init) === "function") {
    mod.init(document.body, ctx);
  }
}

// node_modules/@tinyfx/runtime/dist/mount-state.js
var mounted = /* @__PURE__ */ new WeakSet();
function markMounted(el) {
  if (mounted.has(el))
    return false;
  mounted.add(el);
  return true;
}

// node_modules/@tinyfx/runtime/dist/router/path-matcher.js
function matchPath(def, pathSegments) {
  const { staticSegments, paramNames } = def;
  if (staticSegments.length !== pathSegments.length)
    return null;
  const params = {};
  let paramIdx = 0;
  for (let i = 0; i < staticSegments.length; i++) {
    const expected = staticSegments[i];
    const actual = pathSegments[i];
    if (expected === null) {
      params[paramNames[paramIdx++]] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}
function splitPath(pathname) {
  return pathname.split("/").filter(Boolean);
}

// node_modules/@tinyfx/runtime/dist/router/lifecycle.js
var mountCallbacks = [];
var destroyCallbacks = [];
function onMount(fn) {
  if (document.readyState === "loading") {
    mountCallbacks.push(fn);
    return;
  }
  fn();
}
function onDestroy(fn) {
  destroyCallbacks.push(fn);
}
function flushMount() {
  const run = () => mountCallbacks.forEach((fn) => fn());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
function initLifecycle() {
  flushMount();
  window.addEventListener("pagehide", () => destroyCallbacks.forEach((fn) => fn()), { once: true });
}

// node_modules/@tinyfx/runtime/dist/router/active-links.js
function highlightActiveLinks(pathname) {
  const links = document.querySelectorAll("a[href]");
  links.forEach((link) => {
    try {
      const url = new URL(link.getAttribute("href"), window.location.origin);
      if (url.pathname === pathname) {
        link.setAttribute("data-active", "true");
      } else {
        link.removeAttribute("data-active");
      }
    } catch (_a) {
    }
  });
}

// node_modules/@tinyfx/runtime/dist/router/params.js
var currentParams = {};
function setParams(params) {
  currentParams = params;
}

// node_modules/@tinyfx/runtime/dist/router/index.js
function navigate(path) {
  window.location.href = path;
}

// node_modules/@tinyfx/runtime/dist/init.js
var initialized = false;
function init(config) {
  if (initialized)
    return null;
  initialized = true;
  const pathname = window.location.pathname;
  const pathSegments = splitPath(pathname);
  let matchedPath = null;
  let params = {};
  for (const [path, def] of Object.entries(config.routes)) {
    const result = matchPath(def, pathSegments);
    if (result) {
      matchedPath = path;
      params = result;
      break;
    }
  }
  if (!matchedPath) {
    if (true) {
      console.warn(`[tinyfx] No route matched for pathname: "${pathname}". Check that a page file exists for this URL in src/pages/.`);
    }
    return null;
  }
  initLifecycle();
  highlightActiveLinks(pathname);
  setParams(params);
  const ctx = { params, navigate };
  if (config.setupDirectives) {
    config.setupDirectives(ctx);
  }
  runPageInit(matchedPath, ctx);
  return ctx;
}

// src/components/ConfigForm/ConfigForm.ts
var ConfigForm_exports = {};
__export(ConfigForm_exports, {
  ConfigForm: () => ConfigForm,
  mount: () => mount
});

// src/lib/config.ts
var API_BASE = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

// src/lib/services/http.ts
var http = createHttp({ baseUrl: API_BASE });
var originalFetch = window.fetch.bind(window);
window.fetch = (input, init6) => {
  const nextInit = {
    credentials: "include",
    ...init6
  };
  return originalFetch(input, nextInit);
};
function triggerDownload(url) {
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// src/lib/services/config.service.ts
var ConfigService = {
  async getConfig() {
    return http.get("/config/api");
  },
  async updateConfig(payload) {
    await http.put("/config/api", JSON.stringify(payload), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

// src/lib/models/server-config.model.ts
var ServerConfigModel = class _ServerConfigModel {
  constructor(dto) {
    __publicField(this, "port");
    __publicField(this, "basePath");
    __publicField(this, "maxSizeMb");
    __publicField(this, "authEnabled");
    __publicField(this, "loggingEnabled");
    __publicField(this, "loggingLevel");
    this.port = dto.server.port;
    this.basePath = dto.storage.base_path;
    this.maxSizeMb = Math.max(1, Math.round(dto.storage.max_size / (1024 * 1024)));
    this.authEnabled = dto.auth.authentication;
    this.loggingEnabled = dto.logging.logging;
    this.loggingLevel = dto.logging.logging_level;
  }
  static fromDto(dto) {
    return new _ServerConfigModel(dto);
  }
  toPayload() {
    return {
      server: { port: this.port },
      tls: { tls_enabled: false, cert_file: "", key_file: "" },
      storage: {
        base_path: this.basePath,
        max_size: this.maxSizeMb * 1024 * 1024
      },
      auth: { authentication: this.authEnabled },
      logging: {
        logging: this.loggingEnabled,
        logging_level: this.loggingLevel
      }
    };
  }
};

// src/components/ConfigForm/ConfigForm.ts
var ConfigForm = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "isLoading", signal(true));
    __publicField(this, "alertMessage", signal(""));
    __publicField(this, "alertType", signal("info"));
    __publicField(this, "initialConfig", null);
  }
  init() {
    const form = this.el.querySelector("[data-config-form]");
    const resetBtn = this.el.querySelector("[data-reset-btn]");
    const portInput = this.el.querySelector("[data-port]");
    const maxSizeInput = this.el.querySelector("[data-max-size]");
    const basePathInput = this.el.querySelector("[data-base-path]");
    const authCheckbox = this.el.querySelector("[data-auth-enabled]");
    const loggingCheckbox = this.el.querySelector("[data-logging-enabled]");
    const loggingLevelSelect = this.el.querySelector("[data-logging-level]");
    this.loadConfig();
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!this.initialConfig) return;
      const payload = {
        server: { port: Number(portInput?.value) },
        tls: { tls_enabled: false, cert_file: "", key_file: "" },
        storage: {
          base_path: basePathInput?.value.trim() || "",
          max_size: Number(maxSizeInput?.value) * 1024 * 1024
        },
        auth: { authentication: !!authCheckbox?.checked },
        logging: {
          logging: !!loggingCheckbox?.checked,
          logging_level: loggingLevelSelect?.value || "info"
        }
      };
      try {
        await ConfigService.updateConfig(payload);
        this.showAlert("Config saved. Some changes require a restart.", "success");
        this.initialConfig = ServerConfigModel.fromDto(payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save config";
        this.showAlert(message, "error");
      }
    });
    resetBtn?.addEventListener("click", () => {
      if (!this.initialConfig) return;
      this.populateForm(this.initialConfig);
      this.showAlert("Changes reset.", "info");
    });
    effect(() => {
      const alertBox = this.el.querySelector("[data-alert]");
      if (alertBox) {
        const msg = this.alertMessage();
        alertBox.style.display = msg ? "block" : "none";
        if (msg) alertBox.textContent = msg;
      }
    });
  }
  async loadConfig() {
    try {
      const dto = await ConfigService.getConfig();
      this.initialConfig = ServerConfigModel.fromDto(dto);
      this.populateForm(this.initialConfig);
      this.isLoading.set(false);
    } catch {
      this.showAlert("Failed to load config. Please refresh.", "error");
    }
  }
  populateForm(config) {
    const portInput = this.el.querySelector("[data-port]");
    const maxSizeInput = this.el.querySelector("[data-max-size]");
    const basePathInput = this.el.querySelector("[data-base-path]");
    const authCheckbox = this.el.querySelector("[data-auth-enabled]");
    const loggingCheckbox = this.el.querySelector("[data-logging-enabled]");
    const loggingLevelSelect = this.el.querySelector("[data-logging-level]");
    if (portInput) portInput.value = String(config.port);
    if (maxSizeInput) maxSizeInput.value = String(config.maxSizeMb);
    if (basePathInput) basePathInput.value = config.basePath;
    if (authCheckbox) authCheckbox.checked = config.authEnabled;
    if (loggingCheckbox) loggingCheckbox.checked = config.loggingEnabled;
    if (loggingLevelSelect) loggingLevelSelect.value = config.loggingLevel;
  }
  showAlert(message, type) {
    this.alertMessage.set(message);
    this.alertType.set(type);
    const alertBox = this.el.querySelector("[data-alert]");
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.textContent = message;
      alertBox.className = `retro-card-sm px-4 py-3 font-semibold alert-${type}`;
    }
  }
};
function mount(el, ctx) {
  const inst = new ConfigForm(el, ctx);
  inst.init();
  return inst;
}

// src/components/DeleteModal/DeleteModal.ts
var DeleteModal_exports = {};
__export(DeleteModal_exports, {
  DeleteModal: () => DeleteModal,
  mount: () => mount2
});

// src/lib/state/modal-callbacks.state.ts
var deleteCallback = signal(null);
var pinCallback = signal(null);
var deleteModalState = signal({
  name: "",
  type: "file",
  visible: false
});
var pinModalState = signal({
  action: null,
  visible: false
});
var shareModalState = signal({
  url: "",
  visible: false
});

// src/components/DeleteModal/DeleteModal.ts
var DeleteModal = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "visible", signal(false));
    __publicField(this, "itemName", signal(""));
    __publicField(this, "itemType", signal("file"));
  }
  init() {
    effect(() => {
      const state = deleteModalState();
      this.visible.set(state.visible);
      if (state.visible) {
        this.itemName.set(state.name);
        this.itemType.set(state.type);
      }
    });
    effect(() => {
      this.el.classList.toggle("show", this.visible());
      if (this.visible()) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
    effect(() => {
      const nameEl = this.el.querySelector(".file-name-display");
      if (nameEl) nameEl.textContent = this.itemName();
    });
    effect(() => {
      const typeEl = this.el.querySelector(".modal-body > p");
      if (typeEl) typeEl.textContent = `Are you sure you want to delete this ${this.itemType()}?`;
    });
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });
    this.el.querySelector("[data-action='close']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='cancel']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='confirm']")?.addEventListener("click", () => this.handleConfirm());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }
  hide() {
    this.visible.set(false);
    deleteModalState.set({ name: "", type: "file", visible: false });
    deleteCallback.set(null);
  }
  handleConfirm() {
    const cb = deleteCallback();
    if (cb) cb();
    this.hide();
  }
};
function mount2(el, ctx) {
  const inst = new DeleteModal(el, ctx);
  inst.init();
  return inst;
}

// src/components/Navbar/Navbar.ts
var Navbar_exports = {};
__export(Navbar_exports, {
  Navbar: () => Navbar,
  mount: () => mount3
});

// src/lib/state/auth.state.ts
var authState = signal({
  checked: false,
  loggedIn: false,
  authEnabled: false,
  user: ""
});

// src/lib/services/session.service.ts
var SessionService = {
  async checkAuth() {
    try {
      const response = await fetch("/auth/status", { credentials: "include" });
      if (!response.ok) {
        throw new Error("auth status failed");
      }
      const status = await response.json();
      authState.set({
        checked: true,
        loggedIn: !!status?.loggedIn,
        authEnabled: !!status?.authEnabled,
        user: status?.user || ""
      });
    } catch {
      authState.set({
        checked: true,
        loggedIn: false,
        authEnabled: false,
        user: ""
      });
    }
  },
  markLoggedOut() {
    authState.set({
      checked: true,
      loggedIn: false,
      authEnabled: authState().authEnabled,
      user: ""
    });
  }
};

// src/lib/services/auth.service.ts
var AuthService = {
  async login(username, password) {
    try {
      const response = await fetch("/login", {
        method: "POST",
        body: new URLSearchParams({ username, password }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        redirect: "follow"
      });
      if (!response.ok) {
        let errorMsg = "Login failed";
        try {
          const text = await response.text();
          if (text) errorMsg = text;
        } catch {
        }
        return { ok: false, error: errorMsg };
      }
      await SessionService.checkAuth();
      if (!response.redirected && !response.url.includes("/dashboard")) {
        return { ok: false, error: "Login failed" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Login failed" };
    }
  },
  async logout() {
    try {
      await http.post("/logout");
    } catch {
    }
    SessionService.markLoggedOut();
    window.location.href = "/login";
  }
};

// src/components/Navbar/Navbar.ts
var Navbar = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "isLoggedIn", signal(false));
    __publicField(this, "links", [
      { label: "Files", url: "/", active: false },
      { label: "Dashboard", url: "/dashboard", active: false },
      { label: "Config", url: "/config", active: false }
    ]);
  }
  init() {
    const loginBtn = this.el.querySelector("#loginBtn");
    const logoutBtn = this.el.querySelector("#logoutBtn");
    this.isLoggedIn.set(authState().loggedIn);
    effect(() => {
      this.isLoggedIn.set(authState().loggedIn);
    });
    const render = () => {
      const loggedIn = this.isLoggedIn();
      this.renderLinks(loggedIn);
      if (loginBtn) loginBtn.hidden = loggedIn;
      if (logoutBtn) logoutBtn.hidden = !loggedIn;
    };
    render();
    effect(() => {
      this.isLoggedIn();
      render();
    });
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => AuthService.logout());
    }
  }
  renderLinks(loggedIn) {
    const nav = this.el.querySelector("[data-nav-links]");
    if (!nav) return;
    nav.querySelectorAll("a[data-nav-link]").forEach((node) => node.remove());
    const visibleLinks = loggedIn ? this.links : [];
    const loginBtn = nav.querySelector("#loginBtn");
    const currentPath = window.location.pathname;
    visibleLinks.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.setAttribute("data-nav-link", "true");
      anchor.href = link.url;
      const isActive = currentPath === link.url;
      anchor.className = isActive ? "nav-link active" : "nav-link";
      anchor.textContent = link.label;
      if (loginBtn) {
        nav.insertBefore(anchor, loginBtn);
      } else {
        nav.appendChild(anchor);
      }
    });
  }
};
function mount3(el, ctx) {
  const inst = new Navbar(el, ctx);
  inst.init();
  return inst;
}

// src/components/PinModal/PinModal.ts
var PinModal_exports = {};
__export(PinModal_exports, {
  PinModal: () => PinModal,
  mount: () => mount4
});
var PinModal = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "visible", signal(false));
    __publicField(this, "title", signal("Enter PIN"));
    __publicField(this, "description", signal("This item is protected. Please enter the PIN:"));
    __publicField(this, "submitLabel", signal("Download"));
    __publicField(this, "pinValue", signal(""));
    __publicField(this, "pendingAction", null);
  }
  init() {
    effect(() => {
      const state = pinModalState();
      this.visible.set(state.visible);
      if (state.visible && state.action) {
        this.pendingAction = state.action;
        this.updateCopy(state.action.type);
        this.pinValue.set("");
        const input2 = this.el.querySelector("[data-pin-input]");
        if (input2) {
          input2.value = "";
          setTimeout(() => input2.focus(), 50);
        }
      }
    });
    effect(() => {
      this.el.classList.toggle("show", this.visible());
      if (this.visible()) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
    effect(() => {
      const titleEl = this.el.querySelector(".modal-header h3");
      if (titleEl) titleEl.textContent = this.title();
    });
    effect(() => {
      const descEl = this.el.querySelector(".modal-body > p");
      if (descEl) descEl.textContent = this.description();
    });
    effect(() => {
      const submitBtn2 = this.el.querySelector("[data-action='submit']");
      if (submitBtn2) submitBtn2.textContent = this.submitLabel();
    });
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });
    const closeBtn = this.el.querySelector("[data-action='close']");
    closeBtn?.addEventListener("click", () => this.hide());
    const cancelBtn = this.el.querySelector("[data-action='cancel']");
    cancelBtn?.addEventListener("click", () => this.hide());
    const submitBtn = this.el.querySelector("[data-action='submit']");
    submitBtn?.addEventListener("click", () => this.handleSubmit());
    const input = this.el.querySelector("[data-pin-input]");
    input?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSubmit();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }
  hide() {
    this.visible.set(false);
    this.pendingAction = null;
    this.pinValue.set("");
    pinModalState.set({ action: null, visible: false });
    pinCallback.set(null);
  }
  handleSubmit() {
    const input = this.el.querySelector("[data-pin-input]");
    const pin = input?.value.trim() || "";
    if (!pin) return;
    const cb = pinCallback();
    if (this.pendingAction && cb) {
      cb(pin, this.pendingAction);
    }
  }
  updateCopy(actionType) {
    const isFolderOpen = actionType === "folder-open";
    const isFolderDownload = actionType === "folder-download";
    if (isFolderOpen) {
      this.title.set("Enter PIN");
      this.description.set("This folder is protected. Please enter the PIN to open:");
      this.submitLabel.set("Open");
    } else if (isFolderDownload) {
      this.title.set("Enter PIN");
      this.description.set("This folder is protected. Please enter the PIN to download:");
      this.submitLabel.set("Download");
    } else {
      this.title.set("Enter PIN");
      this.description.set("This file is protected. Please enter the PIN to download:");
      this.submitLabel.set("Download");
    }
  }
};
function mount4(el, ctx) {
  const inst = new PinModal(el, ctx);
  inst.init();
  return inst;
}

// src/components/ShareModal/ShareModal.ts
var ShareModal_exports = {};
__export(ShareModal_exports, {
  ShareModal: () => ShareModal,
  mount: () => mount5
});
function buildQrImageUrl(value) {
  const encoded = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encoded}`;
}
var ShareModal = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "visible", signal(false));
    __publicField(this, "shareUrl", signal(""));
  }
  init() {
    effect(() => {
      const state = shareModalState();
      this.visible.set(state.visible);
      if (state.visible) {
        this.shareUrl.set(state.url);
      }
    });
    effect(() => {
      this.el.classList.toggle("show", this.visible());
      if (this.visible()) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
    effect(() => {
      const input = this.el.querySelector("[data-share-url]");
      if (input) input.value = this.shareUrl();
    });
    effect(() => {
      const qrContainer = this.el.querySelector("[data-qr]");
      if (qrContainer && this.visible() && this.shareUrl()) {
        qrContainer.innerHTML = "";
        const img = document.createElement("img");
        img.src = buildQrImageUrl(this.shareUrl());
        img.width = 240;
        img.height = 240;
        img.alt = "QR code for share link";
        img.loading = "eager";
        img.referrerPolicy = "no-referrer";
        img.onerror = () => {
          qrContainer.textContent = this.shareUrl();
        };
        qrContainer.appendChild(img);
      }
    });
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });
    this.el.querySelector("[data-action='close']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='copy']")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.shareUrl());
        const input = this.el.querySelector("[data-share-url]");
        if (input) {
          input.style.background = "#d1fae5";
          setTimeout(() => {
            input.style.background = "";
          }, 800);
        }
      } catch {
      }
    });
    this.el.querySelector("[data-action='native-share']")?.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: this.shareUrl() });
        } catch {
        }
      } else {
        try {
          await navigator.clipboard.writeText(this.shareUrl());
        } catch {
        }
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }
  hide() {
    this.visible.set(false);
    shareModalState.set({ url: "", visible: false });
  }
};
function mount5(el, ctx) {
  const inst = new ShareModal(el, ctx);
  inst.init();
  return inst;
}

// src/components/Toast/Toast.ts
var Toast_exports = {};
__export(Toast_exports, {
  Toast: () => Toast,
  mount: () => mount6
});

// src/lib/state/toast.state.ts
var toastData = signal({
  message: "",
  type: "info",
  visible: false
});
var hideTimeout = null;
var toast = {
  message: () => toastData().message,
  type: () => toastData().type,
  visible: () => toastData().visible,
  show(message, type = "info") {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
    toastData.set({ message, type, visible: true });
    hideTimeout = setTimeout(() => {
      toastData.set({ ...toastData(), visible: false });
    }, 3e3);
  },
  hide() {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    toastData.set({ ...toastData(), visible: false });
  }
};

// src/components/Toast/Toast.ts
var Toast = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
  }
  init() {
    effect(() => {
      const msg = toast.message();
      const type = toast.type();
      const visible = toast.visible();
      this.el.classList.toggle("show", visible);
      this.el.classList.remove("success", "error", "info");
      this.el.classList.add(type);
      const iconEl = this.el.querySelector(".toast-icon");
      if (iconEl) {
        if (type === "success") {
          iconEl.textContent = "✓";
        } else if (type === "error") {
          iconEl.textContent = "✗";
        } else {
          iconEl.textContent = "ℹ";
        }
      }
      const msgEl = this.el.querySelector(".toast-message");
      if (msgEl) {
        msgEl.textContent = msg;
      }
    });
  }
};
function mount6(el, ctx) {
  const inst = new Toast(el, ctx);
  inst.init();
  return inst;
}

// src/components/UploadDropzone/UploadDropzone.ts
var UploadDropzone_exports = {};
__export(UploadDropzone_exports, {
  UploadDropzone: () => UploadDropzone,
  mount: () => mount7
});

// src/lib/state/upload.state.ts
var uploadDescriptor = signal(null);
function setUploadDescriptor(desc) {
  uploadDescriptor.set(desc);
}
function getUploadDescriptor() {
  return uploadDescriptor();
}
function clearUploadDescriptor() {
  uploadDescriptor.set(null);
}

// src/components/UploadDropzone/UploadDropzone.ts
var UploadDropzone = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "descriptor", signal(null));
    __publicField(this, "dropText", signal("Drop files or folders here"));
    __publicField(this, "fileInput", null);
    __publicField(this, "folderInput", null);
  }
  init() {
    this.fileInput = this.el.querySelector("[data-file-input]");
    this.folderInput = this.el.querySelector("[data-folder-input]");
    const dropTextEl = this.el.querySelector(".file-drop-text");
    const pickFilesBtn = this.el.querySelector("[data-pick-files]");
    const pickFolderBtn = this.el.querySelector("[data-pick-folder]");
    const displayNameInput = this.el.closest("form")?.querySelector("[data-display-name]");
    pickFilesBtn?.addEventListener("click", () => this.fileInput?.click());
    pickFolderBtn?.addEventListener("click", () => this.folderInput?.click());
    this.el.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.el.classList.add("dragover");
    });
    this.el.addEventListener("dragleave", () => {
      this.el.classList.remove("dragover");
    });
    this.el.addEventListener("drop", async (e) => {
      e.preventDefault();
      this.el.classList.remove("dragover");
      const entries = await this.extractDropEntries(e.dataTransfer);
      if (!entries.length) return;
      const desc = this.buildDescriptor(entries);
      this.descriptor.set(desc);
      setUploadDescriptor(desc);
      this.updateDisplay(desc);
      this.autoFillDisplayName(desc, displayNameInput);
      if (this.fileInput) this.fileInput.value = "";
      if (this.folderInput) this.folderInput.value = "";
    });
    this.fileInput?.addEventListener("change", (e) => {
      const target = e.target;
      if (target.files) {
        const desc = this.analyzeFiles(Array.from(target.files), false);
        this.descriptor.set(desc);
        setUploadDescriptor(desc);
        this.updateDisplay(desc);
        this.autoFillDisplayName(desc, displayNameInput);
        if (this.folderInput) this.folderInput.value = "";
      }
    });
    this.folderInput?.addEventListener("change", (e) => {
      const target = e.target;
      if (target.files) {
        const desc = this.analyzeFiles(Array.from(target.files), true);
        this.descriptor.set(desc);
        setUploadDescriptor(desc);
        this.updateDisplay(desc);
        this.autoFillDisplayName(desc, displayNameInput);
        if (this.fileInput) this.fileInput.value = "";
      }
    });
    effect(() => {
      const text = this.dropText();
      if (dropTextEl) dropTextEl.textContent = text;
    });
    effect(() => {
      const desc = this.descriptor();
      if (!desc || !desc.entries.length) {
        this.el.classList.remove("has-file");
      } else {
        this.el.classList.add("has-file");
      }
    });
    effect(() => {
      const shared = uploadDescriptor();
      if (!shared) {
        this.descriptor.set(null);
        this.updateDisplay(null);
        if (this.fileInput) this.fileInput.value = "";
        if (this.folderInput) this.folderInput.value = "";
      }
    });
  }
  getDescriptor() {
    return this.descriptor();
  }
  clear() {
    this.descriptor.set(null);
    clearUploadDescriptor();
    if (this.fileInput) this.fileInput.value = "";
    if (this.folderInput) this.folderInput.value = "";
  }
  autoFillDisplayName(desc, input) {
    if (!input) return;
    if (desc.type === "file" && desc.entries.length === 1) {
      input.value = desc.entries[0].file.name;
    } else if (desc.type === "folder" && desc.entries.length > 0) {
      const path = desc.entries[0].relativePath;
      if (path) {
        const folderName = path.split("/")[0];
        if (folderName) input.value = folderName;
      }
    } else {
      input.value = "";
    }
  }
  updateDisplay(desc) {
    if (!desc || !desc.entries.length) {
      this.dropText.set("Drop files or folders here");
      return;
    }
    if (desc.type === "folder") {
      this.dropText.set(`${desc.totalFiles} items from folder`);
    } else if (desc.totalFiles === 1) {
      this.dropText.set(desc.entries[0].file.name);
    } else {
      this.dropText.set(`${desc.totalFiles} files selected`);
    }
  }
  analyzeFiles(files, fromFolderInput) {
    const hasRelativePath = files.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
    let type;
    if (files.length === 1 && !hasRelativePath) {
      type = "file";
    } else if (hasRelativePath || fromFolderInput) {
      type = "folder";
    } else {
      type = "files";
    }
    const entries = files.map((f) => ({
      file: f,
      size: f.size,
      relativePath: f.webkitRelativePath || null
    }));
    const totalSize = entries.reduce((s, e) => s + e.size, 0);
    return { type, totalFiles: entries.length, totalSize, entries };
  }
  buildDescriptor(entries) {
    const totalSize = entries.reduce((s, e) => s + e.size, 0);
    const hasRelativePath = entries.some((e) => e.relativePath && e.relativePath.includes("/"));
    let type;
    if (entries.length === 1 && !hasRelativePath) {
      type = "file";
    } else if (hasRelativePath) {
      type = "folder";
    } else {
      type = "files";
    }
    return { type, totalFiles: entries.length, totalSize, entries };
  }
  async extractDropEntries(dataTransfer) {
    if (!dataTransfer) return [];
    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    if (!items.length) {
      return Array.from(dataTransfer.files || []).map((f) => ({
        file: f,
        size: f.size,
        relativePath: f.webkitRelativePath || null
      }));
    }
    const entryPromises = items.filter((item) => item.kind === "file").map((item) => item.webkitGetAsEntry ? item.webkitGetAsEntry() : null).filter(Boolean).map((entry) => this.traverseEntry(entry, ""));
    const nested = await Promise.all(entryPromises);
    return nested.flat();
  }
  async traverseEntry(entry, prefix) {
    if (entry.file) {
      const fileEntry = entry;
      const file = await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
      return [{ file, size: file.size, relativePath: prefix + file.name }];
    }
    if (entry.createReader) {
      const dirEntry = entry;
      const reader = dirEntry.createReader();
      const allChildren = await this.readAllEntries(reader);
      const allFiles = [];
      for (const child of allChildren) {
        const childFiles = await this.traverseEntry(child, `${prefix}${dirEntry.name}/`);
        allFiles.push(...childFiles);
      }
      return allFiles;
    }
    return [];
  }
  async readAllEntries(reader) {
    const entries = [];
    while (true) {
      const batch = await new Promise((resolve) => reader.readEntries(resolve));
      if (!batch.length) break;
      entries.push(...batch);
    }
    return entries;
  }
};
function mount7(el, ctx) {
  const inst = new UploadDropzone(el, ctx);
  inst.init();
  return inst;
}

// src/components/UploadForm/UploadForm.ts
var UploadForm_exports = {};
__export(UploadForm_exports, {
  UploadForm: () => UploadForm,
  mount: () => mount8
});

// src/lib/services/upload.service.ts
var UploadService = {
  async upload(descriptor, options = {}) {
    const formData = new FormData();
    if (options.parentId) {
      formData.append("parent_id", options.parentId);
    }
    formData.append("pin_code", options.pinCode || "");
    formData.append("contentType", descriptor.type);
    if ((descriptor.type === "file" || descriptor.type === "folder") && options.displayName) {
      formData.append("display_name", options.displayName.trim());
    }
    for (const entry of descriptor.entries) {
      formData.append("files", entry.file);
      if (entry.relativePath) {
        formData.append("paths", entry.relativePath);
      }
    }
    await http.post("/upload", formData, { json: false });
  }
};

// src/lib/services/folder.service.ts
var FolderService = {
  ROOT_ID: "00000000-0000-0000-0000-000000000000",
  async getContents(folderId, pin = "") {
    const isRoot = folderId === this.ROOT_ID;
    const endpoint = isRoot ? "/rootfilesandfolders" : `/folder/content/${folderId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    return http.get(endpoint);
  },
  async checkProtection(folderId) {
    try {
      const res = await http.get(`/folder/content/${folderId}`);
      return !!res?.is_protected;
    } catch {
      return false;
    }
  },
  async deleteFolder(folderId) {
    await http.delete(`/delete/folder/${folderId}`);
  }
};

// src/lib/state/folder-nav.state.ts
var FolderNavState = class {
  constructor() {
    __publicField(this, "currentFolderId", signal(FolderService.ROOT_ID));
    __publicField(this, "folderHistory", signal([]));
    __publicField(this, "folderPinCache", /* @__PURE__ */ new Map());
  }
  get ROOT_ID() {
    return FolderService.ROOT_ID;
  }
  setCurrentFolderID(folderId) {
    this.currentFolderId.set(folderId || this.ROOT_ID);
  }
  getCurrentFolderID() {
    return this.currentFolderId();
  }
  getFolderHistory() {
    return this.folderHistory();
  }
  cacheFolderPin(folderId, pin) {
    if (folderId && pin) {
      this.folderPinCache.set(folderId, pin);
    }
  }
  getCachedPin(folderId) {
    if (!folderId) return "";
    return this.folderPinCache.get(folderId) || "";
  }
  navigateToFolder(folderId, folderName, pin, loadFn) {
    this.folderHistory.set([
      ...this.folderHistory(),
      { id: this.currentFolderId(), name: folderName }
    ]);
    this.setCurrentFolderID(folderId);
    loadFn(folderId, pin);
  }
  navigateBack(loadFn) {
    const history = this.folderHistory();
    if (history.length > 0) {
      const newHistory = [...history];
      const previousFolder = newHistory.pop();
      this.folderHistory.set(newHistory);
      this.setCurrentFolderID(previousFolder.id);
      loadFn(previousFolder.id, "");
    } else {
      this.setCurrentFolderID(this.ROOT_ID);
      loadFn(this.ROOT_ID, "");
    }
  }
};
var folderNav = new FolderNavState();

// src/components/UploadForm/UploadForm.ts
var UploadForm = class {
  constructor(el, ctx) {
    __publicField(this, "el", el);
    __publicField(this, "ctx", ctx);
    __publicField(this, "isUploading", signal(false));
  }
  init() {
    const form = this.el;
    const submitBtn = this.el.querySelector("[data-upload-submit]");
    const btnText = this.el.querySelector(".btn-text");
    const btnSpinner = this.el.querySelector(".btn-spinner");
    const displayNameInput = this.el.querySelector("[data-display-name]");
    const pinCodeInput = this.el.querySelector("[data-pin-code]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const descriptor = getUploadDescriptor();
      if (!descriptor || !descriptor.entries.length) {
        toast.show("Please select files or a folder to upload", "error");
        return;
      }
      this.isUploading.set(true);
      if (btnText) btnText.style.display = "none";
      if (btnSpinner) btnSpinner.style.display = "inline-block";
      if (submitBtn) submitBtn.disabled = true;
      try {
        await UploadService.upload(descriptor, {
          displayName: displayNameInput?.value,
          pinCode: pinCodeInput?.value,
          parentId: folderNav.getCurrentFolderID() !== folderNav.ROOT_ID ? folderNav.getCurrentFolderID() : void 0
        });
        toast.show("Upload successful!", "success");
        clearUploadDescriptor();
        if (displayNameInput) displayNameInput.value = "";
        if (pinCodeInput) pinCodeInput.value = "";
        const event = new CustomEvent("upload:complete");
        this.el.dispatchEvent(event);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.show(message, "error");
      } finally {
        this.isUploading.set(false);
        if (btnText) btnText.style.display = "";
        if (btnSpinner) btnSpinner.style.display = "none";
        if (submitBtn) submitBtn.disabled = false;
      }
    });
    effect(() => {
      const uploading = this.isUploading();
      if (btnText) btnText.textContent = uploading ? "Uploading..." : "Upload File";
    });
  }
};
function mount8(el, ctx) {
  const inst = new UploadForm(el, ctx);
  inst.init();
  return inst;
}

// src/pages/index.ts
var pages_exports = {};
__export(pages_exports, {
  init: () => init2
});

// src/lib/services/file.service.ts
var FileService = {
  async deleteFile(fileId) {
    await http.delete(`/delete/file/${fileId}`);
  },
  downloadFile(fileId, pin = "") {
    const url = `${API_BASE}/download/${fileId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    triggerDownload(url);
  },
  downloadFolder(folderId, pin = "") {
    const url = `${API_BASE}/download-folder/${folderId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    triggerDownload(url);
  }
};

// src/pages/index.ts
function init2(el, ctx) {
  let pinModal = null;
  let shareModal = null;
  onMount(() => {
    pinModal = el.querySelector("[data-pin-modal]");
    shareModal = el.querySelector("[data-share-modal]");
    const refreshBtn = el.querySelector("#refreshBtn");
    refreshBtn?.addEventListener("click", () => loadFiles());
    loadFiles();
  });
  onDestroy(() => {
    pinModal = null;
    shareModal = null;
  });
  async function loadFiles(folderId, pin = "") {
    const targetId = folderId || folderNav.getCurrentFolderID();
    folderNav.setCurrentFolderID(targetId);
    if (!pin && targetId) {
      const cached = folderNav.getCachedPin(targetId);
      if (cached) pin = cached;
    }
    const loadingEl = el.querySelector("#loadingState");
    const tableEl = el.querySelector("#fileTable");
    const emptyEl = el.querySelector("#emptyState");
    if (loadingEl) loadingEl.style.display = "flex";
    if (tableEl) tableEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "none";
    try {
      const data = await FolderService.getContents(targetId, pin);
      if (pin) folderNav.cacheFolderPin(targetId, pin);
      if (loadingEl) loadingEl.style.display = "none";
      const isRoot = targetId === FolderService.ROOT_ID;
      const allItems = [...data.folders || [], ...data.files || []];
      if (allItems.length === 0) {
        if (tableEl) tableEl.style.display = "none";
        if (!isRoot) {
          renderBackButton(tableEl);
        } else {
          if (emptyEl) emptyEl.style.display = "block";
        }
        return;
      }
      renderTable(data, isRoot, tableEl);
      if (tableEl) tableEl.style.display = "table";
    } catch {
      if (loadingEl) loadingEl.style.display = "none";
      toast.show("Failed to load files. Please try again.", "error");
    }
  }
  function renderTable(data, isRoot, tableEl) {
    if (!tableEl) return;
    const folders = data.folders || [];
    const files = data.files || [];
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    tbody.innerHTML = "";
    if (!isRoot && folderNav.getFolderHistory().length > 0) {
      const backRow = document.createElement("tr");
      backRow.className = "folder-row back-row";
      backRow.innerHTML = `<td colspan="4" style="cursor:pointer;font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
      backRow.addEventListener("click", () => navigateBack());
      tbody.appendChild(backRow);
    }
    folders.forEach((folder) => {
      const row = createFolderRow(folder);
      tbody.appendChild(row);
    });
    files.forEach((file) => {
      const row = createFileRow(file);
      tbody.appendChild(row);
    });
  }
  function createFolderRow(folder) {
    const row = document.createElement("tr");
    row.className = "folder-row";
    row.style.cursor = "pointer";
    const folderLink = `${API_BASE}/download-folder/${folder.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>
          <span class="name-text" title="${escapeHtml(folder.name)}">${escapeHtml(truncateName(folder.name))}</span>
        </div>
      </td>
      <td>${formatBytes(folder.size)}</td>
      <td>Folder</td>
      <td>
        <button class="btn-link share-btn" data-url="${folderLink}">Share</button>
        <button class="btn-link primary folder-download-btn" data-folder-id="${folder.id}">Download</button>
      </td>
    `;
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shareModal?.show(folderLink);
    });
    row.querySelector(".folder-download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFolderDownload(folder.id, folder.isProtected);
    });
    row.addEventListener("click", (e) => {
      if (!e.target.closest(".btn-link")) {
        handleFolderNavigation(folder.id, folder.name, folder.isProtected);
      }
    });
    return row;
  }
  function createFileRow(file) {
    const row = document.createElement("tr");
    const downloadLink = `${API_BASE}/download/${file.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M320 464c8.8 0 16-7.2 16-16l0-288-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0zM0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64z"/></svg>
          <span class="name-text" title="${escapeHtml(file.name)}">${escapeHtml(truncateName(file.name))}</span>
          <button class="copy-btn" title="Copy download link" data-copy="${downloadLink}">
            <svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"/></svg>
          </button>
        </div>
      </td>
      <td>${formatBytes(file.size)}</td>
      <td>${file.extension || "file"}</td>
      <td>
        <button class="btn-link share-btn" data-url="${downloadLink}">Share</button>
        <button class="btn-link primary download-btn" data-file-id="${file.id}">Download</button>
      </td>
    `;
    row.querySelector(".copy-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(downloadLink);
        toast.show("Link copied to clipboard", "success");
      } catch {
        toast.show("Failed to copy link", "error");
      }
    });
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shareModal?.show(downloadLink);
    });
    row.querySelector(".download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFileDownload(file.id, file.isProtected);
    });
    return row;
  }
  function renderBackButton(tableEl) {
    if (!tableEl) return;
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    const backRow = document.createElement("tr");
    backRow.className = "folder-row back-row";
    backRow.style.cursor = "pointer";
    backRow.innerHTML = `<td colspan="4" style="font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
    backRow.addEventListener("click", () => navigateBack());
    tbody.appendChild(backRow);
  }
  function navigateBack() {
    folderNav.navigateBack((id, pin) => loadFiles(id, pin));
  }
  async function handleFolderNavigation(folderId, folderName, isProtected) {
    try {
      if (isProtected) {
        pinModal?.show(
          { type: "folder-open", id: folderId, name: folderName },
          (pin) => {
            folderNav.cacheFolderPin(folderId, pin);
            folderNav.navigateToFolder(folderId, folderName, pin, (id, p) => loadFiles(id, p));
            pinModal?.hide();
          }
        );
        return;
      }
      folderNav.navigateToFolder(folderId, folderName, "", (id, p) => loadFiles(id, p));
    } catch {
      toast.show("Failed to open folder", "error");
    }
  }
  function handleFileDownload(fileId, isProtected) {
    if (isProtected) {
      pinModal?.show(
        { type: "file", id: fileId },
        (pin) => {
          FileService.downloadFile(fileId, pin);
          pinModal?.hide();
        }
      );
      return;
    }
    FileService.downloadFile(fileId);
  }
  function handleFolderDownload(folderId, isProtected) {
    if (isProtected) {
      pinModal?.show(
        { type: "folder-download", id: folderId },
        (pin) => {
          FileService.downloadFolder(folderId, pin);
          pinModal?.hide();
        }
      );
      return;
    }
    FileService.downloadFolder(folderId);
  }
  function formatBytes(bytes) {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  function truncateName(name, head = 6, tail = 4) {
    if (name.length <= head + tail + 3) return name;
    return `${name.slice(0, head)}...${name.slice(-tail)}`;
  }
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}

// src/pages/config.ts
var config_exports = {};
__export(config_exports, {
  init: () => init3
});
function init3(el, ctx) {
  onMount(() => {
    console.log("[LocalDrop] Config page mounted");
  });
}

// src/pages/dashboard.ts
var dashboard_exports = {};
__export(dashboard_exports, {
  init: () => init4
});
function init4(el, ctx) {
  onMount(() => {
    const refreshBtn = el.querySelector("#refreshBtn");
    refreshBtn?.addEventListener("click", () => {
      const icon = refreshBtn.querySelector(".refresh-icon");
      if (icon) {
        refreshBtn.disabled = true;
        icon.style.animation = "spin 1s linear infinite";
        loadFiles();
        setTimeout(() => {
          refreshBtn.disabled = false;
          icon.style.animation = "";
        }, 500);
      } else {
        loadFiles();
      }
    });
    const uploadFormComponent = el.querySelector("[data-upload-form-component]");
    if (uploadFormComponent) {
      uploadFormComponent.el?.addEventListener("upload:complete", () => {
        loadFiles();
      });
    }
    loadFiles();
  });
  onDestroy(() => {
    deleteCallback.set(null);
    pinCallback.set(null);
  });
  function showDeleteModal(name, type, onConfirm) {
    deleteCallback.set(onConfirm);
    deleteModalState.set({ name, type, visible: true });
  }
  function showPinModal(action, onSubmit) {
    pinCallback.set(onSubmit);
    pinModalState.set({ action, visible: true });
  }
  function hidePinModal() {
    pinModalState.set({ action: null, visible: false });
    pinCallback.set(null);
  }
  function showShareModal(url) {
    shareModalState.set({ url, visible: true });
  }
  async function loadFiles(folderId, pin = "") {
    const targetId = folderId || folderNav.getCurrentFolderID();
    folderNav.setCurrentFolderID(targetId);
    if (!pin && targetId) {
      const cached = folderNav.getCachedPin(targetId);
      if (cached) pin = cached;
    }
    const loadingEl = el.querySelector("#loadingState");
    const tableEl = el.querySelector("#fileTable");
    const emptyEl = el.querySelector("#emptyState");
    if (loadingEl) loadingEl.style.display = "flex";
    if (tableEl) tableEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "none";
    try {
      const data = await FolderService.getContents(targetId, pin);
      if (pin) folderNav.cacheFolderPin(targetId, pin);
      if (loadingEl) loadingEl.style.display = "none";
      const isRoot = targetId === FolderService.ROOT_ID;
      const allItems = [...data.folders || [], ...data.files || []];
      if (allItems.length === 0) {
        if (tableEl) tableEl.style.display = "none";
        if (!isRoot) {
          renderBackButton(tableEl);
        } else {
          if (emptyEl) emptyEl.style.display = "block";
        }
        return;
      }
      renderTable(data, isRoot, tableEl);
      if (tableEl) tableEl.style.display = "table";
    } catch {
      if (loadingEl) loadingEl.style.display = "none";
      toast.show("Failed to load files. Please try again.", "error");
    }
  }
  function renderTable(data, isRoot, tableEl) {
    if (!tableEl) return;
    const folders = data.folders || [];
    const files = data.files || [];
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    tbody.innerHTML = "";
    if (!isRoot && folderNav.getFolderHistory().length > 0) {
      const backRow = document.createElement("tr");
      backRow.className = "folder-row back-row";
      backRow.innerHTML = `<td colspan="5" style="cursor:pointer;font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
      backRow.addEventListener("click", () => navigateBack());
      tbody.appendChild(backRow);
    }
    folders.forEach((folder) => {
      const row = createFolderRow(folder);
      tbody.appendChild(row);
    });
    files.forEach((file) => {
      const row = createFileRow(file);
      tbody.appendChild(row);
    });
  }
  function createFolderRow(folder) {
    const row = document.createElement("tr");
    row.className = "folder-row";
    row.style.cursor = "pointer";
    const folderLink = `${API_BASE}/download-folder/${folder.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>
          <span class="name-text" title="${escapeHtml(folder.name)}">${escapeHtml(truncateName(folder.name))}</span>
        </div>
      </td>
      <td>${formatBytes(folder.size)}</td>
      <td>Folder</td>
      <td>${new Date(folder.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn-link share-btn" data-url="${folderLink}">Share</button>
        <button class="btn-link primary folder-download-btn" data-folder-id="${folder.id}">Download</button>
        <button class="btn-link delete delete-folder-btn" data-folder-id="${folder.id}" data-folder-name="${escapeHtml(folder.name)}">Delete</button>
      </td>
    `;
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showShareModal(folderLink);
    });
    row.querySelector(".folder-download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFolderDownload(folder.id, folder.isProtected);
    });
    row.querySelector(".delete-folder-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteModal(folder.name, "folder", () => {
        deleteFolder(folder.id, folder.name);
      });
    });
    row.addEventListener("click", (e) => {
      if (!e.target.closest(".btn-link")) {
        handleFolderNavigation(folder.id, folder.name, folder.isProtected);
      }
    });
    return row;
  }
  function createFileRow(file) {
    const row = document.createElement("tr");
    const downloadLink = `${API_BASE}/download/${file.id}`;
    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <svg width="1em" height="1em" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M320 464c8.8 0 16-7.2 16-16l0-288-80 0c-17.7 0-32-14.3-32-32l0-80L64 48c-8.8 0-16 7.2-16 16l0 384c0 8.8 7.2 16 16 16l256 0zM0 64C0 28.7 28.7 0 64 0L229.5 0c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64z"/></svg>
          <span class="name-text" title="${escapeHtml(file.name)}">${escapeHtml(truncateName(file.name))}</span>
          <button class="copy-btn" title="Copy download link" data-copy="${downloadLink}">
            <svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false"><path d="M384 336l-192 0c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l140.1 0L400 115.9 400 320c0 8.8-7.2 16-16 16zM192 384l192 0c35.3 0 64-28.7 64-64l0-204.1c0-12.7-5.1-24.9-14.1-33.9L366.1 14.1c-9-9-21.2-14.1-33.9-14.1L192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-32-48 0 0 32c0 8.8-7.2 16-16 16L64 464c-8.8 0-16-7.2-16-16l0-256c0-8.8 7.2-16 16-16l32 0 0-48-32 0z"/></svg>
          </button>
        </div>
      </td>
      <td>${formatBytes(file.size)}</td>
      <td>${file.extension || "file"}</td>
      <td>${new Date(file.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn-link share-btn" data-url="${downloadLink}">Share</button>
        <button class="btn-link primary download-btn" data-file-id="${file.id}">Download</button>
        <button class="btn-link delete delete-file-btn" data-file-id="${file.id}" data-file-name="${escapeHtml(file.name)}">Delete</button>
      </td>
    `;
    row.querySelector(".copy-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(downloadLink);
        toast.show("Link copied to clipboard", "success");
      } catch {
        toast.show("Failed to copy link", "error");
      }
    });
    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showShareModal(downloadLink);
    });
    row.querySelector(".download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFileDownload(file.id, file.isProtected);
    });
    row.querySelector(".delete-file-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteModal(file.name, "file", () => {
        deleteFile(file.id, file.name);
      });
    });
    return row;
  }
  function renderBackButton(tableEl) {
    if (!tableEl) return;
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    const backRow = document.createElement("tr");
    backRow.className = "folder-row back-row";
    backRow.style.cursor = "pointer";
    backRow.innerHTML = `<td colspan="5" style="font-weight:bold"><svg width="1em" height="1em" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" focusable="false" style="margin-right:0.5rem"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>Back to parent folder</td>`;
    backRow.addEventListener("click", () => navigateBack());
    tbody.appendChild(backRow);
  }
  function navigateBack() {
    folderNav.navigateBack((id, pin) => loadFiles(id, pin));
  }
  async function handleFolderNavigation(folderId, folderName, isProtected) {
    try {
      if (isProtected) {
        showPinModal(
          { type: "folder-open", id: folderId, name: folderName },
          (pin) => {
            folderNav.cacheFolderPin(folderId, pin);
            folderNav.navigateToFolder(folderId, folderName, pin, (id, p) => loadFiles(id, p));
            hidePinModal();
          }
        );
        return;
      }
      folderNav.navigateToFolder(folderId, folderName, "", (id, p) => loadFiles(id, p));
    } catch {
      toast.show("Failed to open folder", "error");
    }
  }
  function handleFileDownload(fileId, isProtected) {
    if (isProtected) {
      showPinModal(
        { type: "file", id: fileId },
        (pin) => {
          FileService.downloadFile(fileId, pin);
          hidePinModal();
        }
      );
      return;
    }
    FileService.downloadFile(fileId);
  }
  function handleFolderDownload(folderId, isProtected) {
    if (isProtected) {
      showPinModal(
        { type: "folder-download", id: folderId },
        (pin) => {
          FileService.downloadFolder(folderId, pin);
          hidePinModal();
        }
      );
      return;
    }
    FileService.downloadFolder(folderId);
  }
  async function deleteFile(id, name) {
    try {
      await FileService.deleteFile(id);
      toast.show("File deleted", "success");
      loadFiles(folderNav.getCurrentFolderID());
    } catch {
      toast.show("Failed to delete file", "error");
    }
  }
  async function deleteFolder(id, name) {
    try {
      await FolderService.deleteFolder(id);
      toast.show("Folder deleted", "success");
      loadFiles(folderNav.getCurrentFolderID());
    } catch {
      toast.show("Failed to delete folder", "error");
    }
  }
  function formatBytes(bytes) {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  function truncateName(name, head = 6, tail = 4) {
    if (name.length <= head + tail + 3) return name;
    return `${name.slice(0, head)}...${name.slice(-tail)}`;
  }
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}

// src/pages/login.ts
var login_exports = {};
__export(login_exports, {
  init: () => init5
});
function init5(el, ctx) {
  const isLoading = signal(false);
  onMount(() => {
    const form = el.querySelector("[data-login-form]");
    const usernameInput = el.querySelector("[data-username]");
    const passwordInput = el.querySelector("[data-password]");
    const submitBtn = el.querySelector("[data-login-submit]");
    const btnText = el.querySelector(".btn-text");
    const btnSpinner = el.querySelector(".btn-spinner");
    const errorEl = el.querySelector("[data-error-msg]");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = usernameInput?.value.trim() || "";
      const password = passwordInput?.value.trim() || "";
      if (!username || !password) {
        showError("Please fill in all fields");
        return;
      }
      setLoading(true);
      try {
        const result = await AuthService.login(username, password);
        if (result.ok) {
          showSuccess("Login successful! Redirecting...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1e3);
        } else {
          showError(result.error || "Login failed");
        }
      } catch {
        showError("Error connecting to server. Please try again.");
      } finally {
        setLoading(false);
      }
    });
    [usernameInput, passwordInput].forEach((input) => {
      input?.addEventListener("input", () => {
        if (errorEl?.classList.contains("show") && !errorEl.classList.contains("success")) {
          errorEl.classList.remove("show");
        }
      });
    });
    passwordInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        form?.dispatchEvent(new Event("submit"));
      }
    });
    function setLoading(loading) {
      isLoading.set(loading);
      if (submitBtn) submitBtn.disabled = loading;
      if (btnText) btnText.style.display = loading ? "none" : "";
      if (btnSpinner) btnSpinner.style.display = loading ? "inline-block" : "none";
    }
    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove("success");
      errorEl.classList.add("show");
      setTimeout(() => errorEl.classList.remove("show"), 5e3);
    }
    function showSuccess(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.add("success", "show");
    }
  });
}

// src/tinyfx.gen.ts
var __componentInstances = /* @__PURE__ */ new WeakMap();
function __registerInstance(el, instance) {
  __componentInstances.set(el, instance);
}
function mountComponent(module, el, ctx) {
  if (!markMounted(el)) return void 0;
  if (typeof module.mount === "function") {
    const inst = module.mount(el, ctx);
    if (inst && typeof inst === "object") {
      __registerInstance(el, inst);
    }
    return inst;
  }
  if (typeof module.init === "function") {
    module.init(el, ctx);
  }
  return void 0;
}
function __mount_ConfigForm(el, ctx) {
  const inst = mountComponent(ConfigForm_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_DeleteModal(el, ctx) {
  const inst = mountComponent(DeleteModal_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_Navbar(el, ctx) {
  const inst = mountComponent(Navbar_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_PinModal(el, ctx) {
  const inst = mountComponent(PinModal_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_ShareModal(el, ctx) {
  const inst = mountComponent(ShareModal_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_Toast(el, ctx) {
  const inst = mountComponent(Toast_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_UploadDropzone(el, ctx) {
  const inst = mountComponent(UploadDropzone_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
function __mount_UploadForm(el, ctx) {
  const inst = mountComponent(UploadForm_exports, el, ctx);
  if (!inst) return null;
  return inst;
}
registerComponent("ConfigForm", (el, ctx) => __mount_ConfigForm(el, ctx));
registerComponent("DeleteModal", (el, ctx) => __mount_DeleteModal(el, ctx));
registerComponent("Navbar", (el, ctx) => __mount_Navbar(el, ctx));
registerComponent("PinModal", (el, ctx) => __mount_PinModal(el, ctx));
registerComponent("ShareModal", (el, ctx) => __mount_ShareModal(el, ctx));
registerComponent("Toast", (el, ctx) => __mount_Toast(el, ctx));
registerComponent("UploadDropzone", (el, ctx) => __mount_UploadDropzone(el, ctx));
registerComponent("UploadForm", (el, ctx) => __mount_UploadForm(el, ctx));
var routes = {
  "/": { staticSegments: [], paramNames: [] },
  "/config": { staticSegments: ["config"], paramNames: [] },
  "/dashboard": { staticSegments: ["dashboard"], paramNames: [] },
  "/login": { staticSegments: ["login"], paramNames: [] }
};
registerPage("/", pages_exports);
registerPage("/config", config_exports);
registerPage("/dashboard", dashboard_exports);
registerPage("/login", login_exports);
function setupDirectives(ctx) {
}
if (typeof document !== "undefined") {
  const boot = () => {
    const ctx = init({ routes, setupDirectives });
    if (!ctx) return;
    document.querySelectorAll("[data-component='ConfigForm']").forEach((el) => {
      __mount_ConfigForm(el, ctx);
    });
    document.querySelectorAll("[data-component='DeleteModal']").forEach((el) => {
      __mount_DeleteModal(el, ctx);
    });
    document.querySelectorAll("[data-component='Navbar']").forEach((el) => {
      __mount_Navbar(el, ctx);
    });
    document.querySelectorAll("[data-component='PinModal']").forEach((el) => {
      __mount_PinModal(el, ctx);
    });
    document.querySelectorAll("[data-component='ShareModal']").forEach((el) => {
      __mount_ShareModal(el, ctx);
    });
    document.querySelectorAll("[data-component='Toast']").forEach((el) => {
      __mount_Toast(el, ctx);
    });
    document.querySelectorAll("[data-component='UploadDropzone']").forEach((el) => {
      __mount_UploadDropzone(el, ctx);
    });
    document.querySelectorAll("[data-component='UploadForm']").forEach((el) => {
      __mount_UploadForm(el, ctx);
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

// src/main.ts
SessionService.checkAuth();
init();
//# sourceMappingURL=main.js.map
