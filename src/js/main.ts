import "../css/main.css";

const THEME_KEY = "mdocs-theme";

type PluginPageSettings = {
  plugin_enabled?: boolean;
  archive_title?: string;
  archive_description?: string;
  nav_expanded_all?: boolean;
  nav_show_count?: boolean;
  toc_enabled?: boolean;
  toolbar_enabled?: boolean;
  toolbar_groups?: {
    title?: string;
    items?: {
      type?: string;
      icon?: string;
      title?: string;
      url?: string;
    }[];
  }[];
};

function pluginPageSettings(
  plugin: "docsme" | "minidocs" | "docs"
): PluginPageSettings {
  const root = (window as unknown as {
    themePluginPage?: Record<string, PluginPageSettings>;
  }).themePluginPage;
  const value = root?.[plugin] as
    | PluginPageSettings
    | { realNode?: PluginPageSettings }
    | undefined;
  if (!value) return {};
  const raw =
    "realNode" in value && value.realNode ? value.realNode : value;
  if (plugin === "docs") {
    return {
      nav_expanded_all: raw.sidebar_default_expanded,
      nav_show_count: raw.sidebar_show_count,
      toc_enabled: raw.show_toc,
      toolbar_enabled: raw.show_copy_markdown,
      toolbar_groups: raw.toolbar_groups,
    } as PluginPageSettings;
  }
  return raw;
}

function initBackground(): void {
  const body = document.body;
  const read = (key: string, fallback: string): string => {
    const value = body.dataset[key];
    return value && value !== "null" ? value : fallback;
  };

  body.style.setProperty("--theme-bg-light", read("bgLight", "#ffffff"));
  body.style.setProperty("--theme-bg-dark", read("bgDark", "#0d1117"));

  const image = read("bgImage", "");
  body.style.setProperty("--theme-bg-image", image ? `url("${image}")` : "none");
}

function applyTheme(theme: string): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-color-scheme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.classList.remove("color-scheme-auto", "color-scheme-dark", "color-scheme-light");
  root.classList.add(`color-scheme-${theme}`);
  applyLogo(theme);
}

function applyLogo(theme: string): void {
  document.querySelectorAll<HTMLImageElement>("img[data-logo-light]").forEach((img) => {
    const light = img.dataset.logoLight ?? "";
    const dark = img.dataset.logoDark ?? light;
    const src = theme === "dark" && dark ? dark : light;
    if (src) img.src = src;
  });
}

function initPrimaryColor(): void {
  const body = document.body;
  const raw = (body.dataset.primary ?? "").trim();
  const isLegacyBlue = raw.toLowerCase() === "#2563eb";
  const isHex = /^#[0-9a-f]{6}$/i.test(raw);

  if (!isHex || isLegacyBlue) {
    body.style.removeProperty("--primary-color");
    return;
  }

  const r = parseInt(raw.slice(1, 3), 16);
  const g = parseInt(raw.slice(3, 5), 16);
  const b = parseInt(raw.slice(5, 7), 16);
  if (r === g && g === b) {
    body.style.removeProperty("--primary-color");
    return;
  }

  body.style.setProperty("--primary-color", raw);
}

function initTheme(): void {
  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(stored || (prefersDark ? "dark" : "light"));
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });
}

function initDocsmeVersionSwitchers(): void {
  document
    .querySelectorAll<HTMLButtonElement>("[data-mdocs-version-trigger]")
    .forEach((trigger) => {
      const panel = trigger.parentElement?.querySelector<HTMLElement>(
        "[data-mdocs-version-panel]"
      );
      if (!panel) return;
      const close = () => {
        panel.hidden = true;
        trigger.removeAttribute("aria-expanded");
      };
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = panel.hidden;
        close();
        if (willOpen) {
          panel.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
        }
      });
      document.addEventListener("click", close);
      panel.addEventListener("click", (event) => event.stopPropagation());
    });
}

function initHeaderMenu(): void {
  document.querySelectorAll<HTMLElement>(".header-menu-item.has-dropdown").forEach((item) => {
    const trigger = item.querySelector<HTMLElement>(".header-menu-trigger");
    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = item.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".header-menu-item.open").forEach((i) => {
      i.classList.remove("open");
      i.querySelector<HTMLElement>(".header-menu-trigger")?.setAttribute("aria-expanded", "false");
    });
  });
}

function initUserMenu(): void {
  const userMenu = document.getElementById("user-menu");
  if (!userMenu) return;
  const avatar = userMenu.querySelector<HTMLElement>(".user-avatar.user-authenticated");
  avatar?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = userMenu.classList.toggle("open");
    avatar.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", () => {
    userMenu.classList.remove("open");
    avatar?.setAttribute("aria-expanded", "false");
  });
}

function detectMacPlatform(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  return /mac|iphone|ipad|ipod/i.test(uaData?.platform ?? navigator.platform ?? navigator.userAgent);
}

function initSearchShortcut(): void {
  const trigger = document.getElementById("search-trigger");
  if (!trigger) return;
  // 快捷键提示按平台改写：macOS 为 ⌘K，Windows/Linux 为 Ctrl+K
  const hint = trigger.querySelector<HTMLElement>(".search-trigger-kbd");
  if (hint) hint.textContent = detectMacPlatform() ? "⌘K" : "Ctrl+K";
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      trigger.click();
    }
  });
}

function initMobileMenu(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  const toggle = document.getElementById("mobile-menu-toggle");
  const backdrop = document.getElementById("mobile-menu-backdrop");
  const panel = document.getElementById("header-menu-panel");
  if (!header || !toggle) return;

  const close = () => {
    header.classList.remove("mobile-menu-open");
    document.body.classList.remove("mobile-menu-locked");
    toggle.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    header.classList.add("mobile-menu-open");
    document.body.classList.add("mobile-menu-locked");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    if (header.classList.contains("mobile-menu-open")) {
      close();
    } else {
      open();
    }
  });
  backdrop?.addEventListener("click", close);
  panel?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) {
      close();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
    }
  });
}

function initHeroCarousel(): void {
  document.querySelectorAll<HTMLElement>(".hero-carousel").forEach((root) => {
    const track = root.querySelector<HTMLElement>(".hero-carousel-track");
    const slides = root.querySelectorAll<HTMLElement>(".hero-carousel-slide");
    const dots = root.querySelectorAll<HTMLButtonElement>(".hero-carousel-dot");
    if (!track || slides.length === 0) return;

    let idx = 0;
    let timer: number | undefined;

    const show = (i: number) => {
      const next = ((i % slides.length) + slides.length) % slides.length;
      idx = next;
      slides.forEach((s, j) => s.classList.toggle("active", next === j));
      dots.forEach((d, j) => d.classList.toggle("active", next === j));
    };

    const start = () => {
      const speed = parseInt(root.dataset.speed || "5000", 10);
      timer = window.setInterval(() => show(idx + 1), speed);
    };

    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let dragDeltaX = 0;
    let suppressClick = false;

    const dragTurn = (deltaX: number): void => {
      if (Math.abs(deltaX) < 40) return;
      suppressClick = true;
      stop();
      show(deltaX < 0 ? idx + 1 : idx - 1);
      start();
    };

    const finishDrag = (): void => {
      if (!dragging) return;
      dragging = false;
      dragTurn(dragDeltaX);
      dragDeltaX = 0;
      track.style.removeProperty("user-select");
    };

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      dragDeltaX = 0;
      suppressClick = false;
      track.style.userSelect = "none";
      try {
        track.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });

    track.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        dragDeltaX = deltaX;
        e.preventDefault();
      }
    });

    track.addEventListener("pointerup", finishDrag);
    track.addEventListener("pointercancel", () => {
      dragging = false;
      dragDeltaX = 0;
      track.style.removeProperty("user-select");
    });

    root.querySelectorAll<HTMLAnchorElement>("a.hero-carousel-slide").forEach((slide) => {
      slide.addEventListener("click", (e) => {
        if (suppressClick) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick = false;
        }
      });
    });

    dots.forEach((d, i) =>
      d.addEventListener("click", (e) => {
        e.preventDefault();
        stop();
        show(i);
        start();
      })
    );

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);

    start();
  });
}

function initOverviewGroups(): void {
  document.querySelectorAll<HTMLElement>(".overview-direct").forEach((group) => {
    const grid = group.querySelector<HTMLElement>(".overview-grid");
    const isEmpty = !grid || grid.querySelectorAll(".card-cell").length === 0;
    if (isEmpty) {
      group.remove();
    }
  });
}

function initToc(): void {
  const tocList = document.getElementById("toc-list");
  const article = document.querySelector<HTMLElement>(".doc-article-body");
  if (!tocList || !article) return;
  const headings = article.querySelectorAll<HTMLHeadingElement>("h2, h3");
  if (headings.length === 0) return;
  const tocItems: { el: HTMLAnchorElement; heading: HTMLElement }[] = [];
  headings.forEach((h, i) => {
    if (!h.id) h.id = `heading-${i}`;
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = h.textContent ?? "";
    a.classList.add(h.tagName === "H3" ? "level-3" : "level-2");
    tocList.appendChild(a);
    tocItems.push({ el: a, heading: h });
  });
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = (entry.target as HTMLElement).id;
        tocItems.forEach(({ el }) => {
          el.classList.toggle("active", el.getAttribute("href") === `#${id}`);
        });
      });
    },
    { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
  );
  headings.forEach((h) => observer.observe(h));
}

function initSidebarCollapse(): void {
  const layout = document.querySelector<HTMLElement>(".doc-layout");
  if (!layout) return;
  // 后台关闭“左侧分类可折叠”时保持整棵树展开，且不绑定折叠行为
  if (document.querySelector<HTMLElement>(".doc-nav-list")?.dataset.collapsible === "false") {
    return;
  }
  const items = document.querySelectorAll<HTMLElement>(".doc-nav-item.has-children");
  items.forEach((item) => {
    const toggleCollapse = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      item.classList.toggle("collapsed");
    };
    item
      .querySelector<HTMLElement>(".mdocs-nav-toggle")
      ?.addEventListener("click", toggleCollapse);
    const navLink = item.querySelector<HTMLAnchorElement>(".doc-nav-link");
    navLink?.addEventListener("click", (e) => {
      if (navLink.classList.contains("active")) {
        toggleCollapse(e);
      }
    });
  });
  if (layout.dataset.defaultExpanded === "true") return;
  const active = document.querySelector(".doc-nav-link.active, .doc-nav-post a.active");
  if (!active) return;
  const ancestors = new Set<HTMLElement>();
  let li = active.closest<HTMLElement>(".doc-nav-item");
  while (li) {
    const parentLi = li.parentElement?.closest<HTMLElement>(".doc-nav-item");
    if (parentLi) ancestors.add(parentLi);
    li = parentLi ?? null;
  }
  items.forEach((item) => {
    if (!ancestors.has(item)) item.classList.add("collapsed");
  });
}

function initSidebarDrawer(): void {
  const layout = document.querySelector<HTMLElement>(".doc-layout");
  if (!layout) return;
  const toggle = document.querySelector<HTMLElement>(".sidebar-toggle");
  const backdrop = document.querySelector<HTMLElement>(".sidebar-backdrop");
  const close = () => {
    layout.classList.remove("sidebar-open");
    toggle?.setAttribute("aria-expanded", "false");
  };
  toggle?.addEventListener("click", () => {
    const open = layout.classList.toggle("sidebar-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  backdrop?.addEventListener("click", close);
}

/* ============ MiniDocs in-archive reader view ============ */

type MiniDocsTreeNode = {
  slug?: string;
  title?: string;
  children?: MiniDocsTreeNode[];
};

type MiniDocsDoc = {
  spec?: {
    slug?: string;
    title?: string;
    content?: string;
    raw?: string;
    author?: string;
    updateTime?: string;
  };
};

type MiniDocsKnowledgeBase = {
  spec?: {
    slug?: string;
    displayName?: string;
    cover?: string;
    updateTime?: string;
    accessCount?: number;
    likeCount?: number;
    likedUsers?: string[];
    shareEnabled?: boolean;
    shareToken?: string;
  };
  status?: {
    docCount?: number;
  };
};

type MiniDocsStats = {
  accessCount?: number;
  likeCount?: number;
  liked?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function minidocsParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

async function minidocsFetch(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    credentials: "same-origin",
    method: init?.method ?? "GET",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("没有阅读该知识库的权限，请先登录。");
    }
    throw new Error(`MiniDocs 请求失败（${response.status}）`);
  }
  return response.json();
}

function minidocsTreeSlugs(nodes: MiniDocsTreeNode[]): string[] {
  const slugs: string[] = [];
  nodes.forEach((node) => {
    if (node.slug) slugs.push(node.slug);
    if (node.children && node.children.length > 0) {
      slugs.push(...minidocsTreeSlugs(node.children));
    }
  });
  return slugs;
}

function formatMiniDocsDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(
    date.getDate()
  )}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function bindMiniDocsNavCollapse(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(".doc-nav-item.has-children").forEach((item) => {
    const toggle = item.querySelector<HTMLElement>(".mdocs-nav-toggle");
    toggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      item.classList.toggle("collapsed");
    });
    const link = item.querySelector<HTMLAnchorElement>(
      ":scope > .doc-nav-row > a.doc-nav-link"
    );
    link?.addEventListener("click", (event) => {
      if (link.classList.contains("active")) {
        event.preventDefault();
        event.stopPropagation();
        item.classList.toggle("collapsed");
      }
    });
    if (pluginPageSettings("minidocs").nav_expanded_all !== true) {
      const hasActiveDescendant =
        item.querySelector<HTMLElement>(".doc-nav-children .doc-nav-link.active") !==
        null;
      if (!hasActiveDescendant) item.classList.add("collapsed");
    }
  });
}

function refreshMiniDocsToc(): void {
  const list = document.getElementById("minidocs-toc-list");
  const article = document.querySelector<HTMLElement>(".minidocs-doc-layout .doc-article-body");
  if (!list || !article) return;
  list.innerHTML = "";
  const headings = article.querySelectorAll<HTMLHeadingElement>("h2, h3");
  if (headings.length === 0) return;
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `minidocs-heading-${index}`;
    const link = document.createElement("a");
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent ?? "";
    link.classList.add(heading.tagName === "H3" ? "level-3" : "level-2");
    list.appendChild(link);
  });
}

async function copyDocText(value: string): Promise<boolean> {
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  textarea.remove();
  return ok;
}

function buildPresetLink(type: string, title: string, url: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const prompt = `请阅读这篇文档并回答相关问题：${title}\n${url}`;
  if (type === "chatgpt") {
    link.href = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    link.textContent = "在 ChatGPT 中打开";
  } else {
    link.href = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    link.textContent = "在 Claude 中打开";
  }
  return link;
}

function buildDocMenuAction(
  type: string | undefined,
  item: {
    type?: string;
    icon?: string;
    title?: string;
    url?: string;
  },
  title: string,
  url: string
): HTMLElement {
  const element = document.createElement(type === "custom" ? "a" : "button");
  if (type === "custom") {
    const anchor = element as HTMLAnchorElement;
    anchor.href = item.url || "#";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    const icon = document.createElement("span");
    icon.className = "mdocs-toolbar-item-icon";
    if (item.icon) icon.innerHTML = item.icon;
    anchor.appendChild(icon);
    anchor.appendChild(document.createTextNode(item.title || "自定义"));
  } else if (type === "chatgpt" || type === "claude") {
    const anchor = buildPresetLink(type, title, url);
    return anchor;
  } else {
    element.textContent = item.title || "自定义";
  }
  return element;
}

type PluginToolbarTarget = {
  plugin: "docsme" | "minidocs" | "docs";
  container: HTMLElement;
  getMarkdown: () => string;
  triggerLike?: () => void;
};

function mountPluginDocToolbar(target: PluginToolbarTarget): void {
  const settings = pluginPageSettings(target.plugin);
  if (settings.toolbar_enabled === false) return;
  if (target.container.querySelector(".mdocs-content-toolbar")) return;

  const toolbar = document.createElement("div");
  toolbar.className = "mdocs-content-toolbar";
  const title = document.querySelector<HTMLElement>(
    ".doc-article-title, .dm-content__body h1"
  )?.textContent ?? "";

  toolbar.innerHTML = `
    <button type="button" class="mdocs-toolbar-copy" data-mdocs-copy>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <span>复制 Markdown</span>
    </button>
    <div class="mdocs-toolbar-menu">
      <button type="button" class="mdocs-toolbar-menu-btn" data-mdocs-menu aria-label="更多操作">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>
      </button>
      <div class="mdocs-toolbar-dropdown" data-mdocs-dropdown hidden></div>
    </div>
  `;

  const copyButton = toolbar.querySelector<HTMLButtonElement>("[data-mdocs-copy]");
  const copyButtonOriginalHtml = copyButton?.innerHTML ?? "";
  let copyRevertTimer: number | undefined;
  copyButton?.addEventListener("click", async () => {
    const copied = await copyDocText(target.getMarkdown());
    if (copied) {
      copyButton.classList.add("mdocs-copied");
      copyButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>复制 Markdown</span>
      `;
      window.clearTimeout(copyRevertTimer);
      copyRevertTimer = window.setTimeout(() => {
        copyButton.classList.remove("mdocs-copied");
        copyButton.innerHTML = copyButtonOriginalHtml;
      }, 500);
    }
  });

  const menuButton = toolbar.querySelector<HTMLButtonElement>("[data-mdocs-menu]");
  const dropdown = toolbar.querySelector<HTMLElement>("[data-mdocs-dropdown]");
  if (!menuButton || !dropdown) return;

  const closeMenu = () => {
    dropdown.hidden = true;
    menuButton.removeAttribute("aria-expanded");
  };
  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = dropdown.hidden;
    closeMenu();
    if (willOpen) {
      dropdown.hidden = false;
      menuButton.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", closeMenu);
  dropdown.addEventListener("click", (event) => event.stopPropagation());

  const fixed = document.createElement("div");
  fixed.className = "mdocs-toolbar-group";

  const copyLink = document.createElement("button");
  copyLink.type = "button";
  copyLink.textContent = "复制 Markdown 链接";
  copyLink.addEventListener("click", () => copyDocText(`[${title}](${window.location.href})`));
  fixed.appendChild(copyLink);

  if (target.triggerLike) {
    const like = document.createElement("button");
    like.type = "button";
    like.textContent = "点赞";
    like.addEventListener("click", () => target.triggerLike?.());
    fixed.appendChild(like);
  }

  const share = document.createElement("button");
  share.type = "button";
  share.textContent = "分享";
  share.addEventListener("click", () => copyDocText(window.location.href));
  fixed.appendChild(share);
  dropdown.appendChild(fixed);

  (settings.toolbar_groups ?? []).forEach((group) => {
    if (!group.items || group.items.length === 0) return;
    const groupEl = document.createElement("div");
    groupEl.className = "mdocs-toolbar-group";
    if (group.title) {
      const label = document.createElement("div");
      label.className = "mdocs-toolbar-group-title";
      label.textContent = group.title;
      groupEl.appendChild(label);
    }
    group.items.forEach((item) => {
      const action = buildDocMenuAction(item.type, item, title, window.location.href);
      action.classList.add("mdocs-toolbar-item");
      groupEl.appendChild(action);
    });
    dropdown.appendChild(groupEl);
  });

  target.container.insertBefore(toolbar, target.container.firstChild);
}

function initDocsmeNavCollapse(): void {
  document
    .querySelectorAll<HTMLDetailsElement>(".mdocs-docsme-page .dm-nav-tree details")
    .forEach((details) => {
      if (pluginPageSettings("docsme").nav_expanded_all === true) {
        details.open = true;
      }
      const summary = details.querySelector<HTMLElement>(
        ":scope > summary.dm-nav-tree__toggle"
      );
      const nested = details.querySelector<HTMLElement>(
        ":scope > ul.dm-nav-tree__nested"
      );
      if (!summary || !nested) return;

      summary.classList.add("mdocs-doc-nav-row");
      if (!summary.querySelector(".mdocs-nav-toggle")) {
        const toggle = document.createElement("span");
        toggle.className = "mdocs-nav-toggle";
        toggle.setAttribute("role", "button");
        toggle.setAttribute("aria-label", "折叠/展开");
        toggle.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
        summary.appendChild(toggle);
        toggle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          details.open = !details.open;
        });
      }

      const link = summary.querySelector<HTMLAnchorElement>(
        ":scope > a.dm-nav-tree__link"
      );
      link?.addEventListener("click", (event) => {
        if (link.classList.contains("dm-nav-tree__link--active")) {
          event.preventDefault();
          event.stopPropagation();
          details.open = !details.open;
        }
      });
    });
}

function minidocsBuildTree(
  nodes: MiniDocsTreeNode[],
  currentSlug: string,
  kbSlug: string
): string {
  return nodes
    .map((node) => {
      const children = node.children && node.children.length > 0;
      const active = node.slug === currentSlug ? " active" : "";
      const link = node.slug
        ? `<a class="doc-nav-link${active}" href="?kb=${encodeURIComponent(
            kbSlug
          )}&docSlug=${encodeURIComponent(node.slug)}" data-doc-slug="${escapeHtml(
            node.slug
          )}">${escapeHtml(node.title ?? "")}</a>`
        : `<span class="doc-nav-link doc-nav-folder">${escapeHtml(node.title ?? "")}</span>`;
      const toggle = children
        ? '<button type="button" class="mdocs-nav-toggle" aria-label="折叠/展开"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>'
        : "";
      const childList =
        children && node.children
          ? `<ul class="doc-nav-list doc-nav-children">${minidocsBuildTree(
              node.children,
              currentSlug,
              kbSlug
            )}</ul>`
          : "";
      return `<li class="doc-nav-item${children ? " has-children" : ""}"><div class="doc-nav-row">${link}${toggle}</div>${childList}</li>`;
    })
    .join("");
}

function initMiniDocsArchive(): void {
  const archive = document.getElementById("minidocs-archive");
  const host = document.getElementById("minidocs-viewer-host");
  if (!archive || !host) return;

  let currentKb = "";
  let currentSlug = "";
  let currentMarkdown = "";
  let treeRoot: HTMLElement | null = null;
  let article: HTMLElement | null = null;
  const viewerPath = window.location.pathname;

  const showArchive = () => {
    archive.hidden = false;
    host.hidden = true;
    host.innerHTML = "";
  };

  const renderDoc = async (docSlug: string, updateUrl: boolean): Promise<void> => {
    if (!currentKb || !docSlug) return;
    try {
      const payload = (await minidocsFetch(
        `/apis/api.minidocs.halo.run/v1alpha1/knowledgebases/${encodeURIComponent(
          currentKb
        )}/docs/${encodeURIComponent(docSlug)}`
      )) as MiniDocsDoc;
      const spec = payload.spec ?? {};
      currentMarkdown = spec.raw ?? spec.content ?? "";
      const titleEl = document.querySelector<HTMLElement>(".minidocs-viewer-title");
      const authorEl = document.querySelector<HTMLElement>(".minidocs-viewer-author");
      const timeEl = document.querySelector<HTMLElement>(".minidocs-viewer-time");
      if (titleEl) titleEl.textContent = spec.title ?? "";
      if (authorEl) {
        authorEl.hidden = !spec.author;
        authorEl.textContent = spec.author ? ` · ${spec.author}` : "";
      }
      if (timeEl) {
        timeEl.hidden = !spec.updateTime;
        timeEl.textContent = spec.updateTime ? spec.updateTime.slice(0, 10) : "";
      }
      if (article) {
        article.innerHTML = spec.content ?? "";
      }
      refreshMiniDocsToc();
      currentSlug = docSlug;
      if (treeRoot) {
        treeRoot.querySelectorAll(".doc-nav-link.active").forEach((el) => {
          el.classList.remove("active");
        });
        treeRoot
          .querySelectorAll<HTMLAnchorElement>(`a[data-doc-slug="${CSS.escape(docSlug)}"]`)
          .forEach((el) => el.classList.add("active"));
      }
      if (updateUrl) {
        history.pushState(
          { mdocsMinidocs: true },
          "",
          `${viewerPath}?kb=${encodeURIComponent(currentKb)}&docSlug=${encodeURIComponent(docSlug)}`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载文档失败";
      if (article) {
        article.innerHTML = `<p class="mdocs-plugin-empty">${escapeHtml(message)}</p>`;
      }
    }
  };

  const openViewer = async (kbSlug: string, targetDocSlug?: string, pushUrl = true): Promise<void> => {
    archive.hidden = true;
    host.hidden = false;
    host.innerHTML = `
      <button class="sidebar-toggle" type="button" aria-label="切换目录">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        <span>目录</span>
      </button>
      <div class="sidebar-backdrop"></div>
      <div class="doc-layout minidocs-doc-layout">
        <aside class="doc-sidebar">
          <div class="mdocs-docsme-sidebar-controls minidocs-toolbar">
            <button type="button" class="mdocs-docsme-back minidocs-back-archive">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>返回</span>
            </button>
            <div class="minidocs-toolbar-actions">
              <a
                href="#"
                class="minidocs-toolbar-btn minidocs-share-btn"
                title="分享"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                <span>分享</span>
              </a>
              <button
                type="button"
                class="minidocs-toolbar-btn minidocs-like-btn"
                title="点赞"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span class="minidocs-like-count">0</span>
              </button>
              <span class="minidocs-view-count" title="浏览次数">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="minidocs-view-count-num">0</span>
                <span>浏览</span>
              </span>
            </div>
          </div>
          <div class="minidocs-kb-heading">
            <span class="minidocs-kb-cover"></span>
            <div class="minidocs-kb-info">
              <div class="doc-sidebar-kb-title minidocs-kb-name">加载中…</div>
              <div class="minidocs-kb-stats">
                <span class="minidocs-doc-count">共 0 篇</span>
                <span class="minidocs-update-time"></span>
              </div>
            </div>
          </div>
          <nav class="doc-sidebar-nav">
            <ul class="doc-nav-list" id="minidocs-tree"></ul>
          </nav>
        </aside>
        <div class="doc-content">
          <article class="doc-article">
            <header class="doc-article-header">
              <h1 class="doc-article-title minidocs-viewer-title"></h1>
            </header>
            <div class="doc-article-meta">
              <time class="minidocs-viewer-time"></time>
              <span class="minidocs-viewer-author"></span>
            </div>
            <div class="doc-article-body">
              <p class="mdocs-plugin-empty">正在加载文档…</p>
            </div>
          </article>
        </div>
        ${
          pluginPageSettings("minidocs").toc_enabled !== false
            ? `<aside class="doc-toc"><div class="toc-title">目录</div><nav class="toc-list" id="minidocs-toc-list"></nav></aside>`
            : ""
        }
      </div>`;

    const viewerLayout = host.querySelector<HTMLElement>(".doc-layout");
    const viewerToggle = host.querySelector<HTMLButtonElement>(".sidebar-toggle");
    const viewerBackdrop = host.querySelector<HTMLElement>(".sidebar-backdrop");
    viewerToggle?.addEventListener("click", () => {
      viewerLayout?.classList.toggle("sidebar-open");
    });
    viewerBackdrop?.addEventListener("click", () => {
      viewerLayout?.classList.remove("sidebar-open");
    });

    const back = host.querySelector<HTMLButtonElement>(".minidocs-back-archive");
    back?.addEventListener("click", () => {
      history.pushState({}, "", viewerPath);
      showArchive();
    });

    const shareBtn = host.querySelector<HTMLAnchorElement>(".minidocs-share-btn");
    const likeBtn = host.querySelector<HTMLButtonElement>(".minidocs-like-btn");
    const viewCountEl = host.querySelector<HTMLElement>(".minidocs-view-count-num");
    const likeCountEl = host.querySelector<HTMLElement>(".minidocs-like-count");

    const updateMeta = (
      kb: MiniDocsKnowledgeBase,
      stats?: MiniDocsStats | null
    ): void => {
      const spec = kb.spec ?? {};
      const coverEl = host.querySelector<HTMLElement>(".minidocs-kb-cover");
      if (coverEl) {
        if (spec.cover) {
          coverEl.innerHTML = `<img src="${escapeHtml(
            spec.cover
          )}" alt="" />`;
        } else {
          const initial = spec.displayName
            ? escapeHtml(spec.displayName.slice(0, 1))
            : "库";
          coverEl.innerHTML = `<span class="minidocs-kb-cover-fallback">${initial}</span>`;
        }
      }
      const docCountEl = host.querySelector<HTMLElement>(".minidocs-doc-count");
      if (docCountEl) {
        const showCount = pluginPageSettings("minidocs").nav_show_count !== false;
        docCountEl.hidden = !showCount;
        if (showCount) {
          docCountEl.textContent = `共 ${kb.status?.docCount ?? 0} 篇`;
        }
      }
      const updateTimeEl = host.querySelector<HTMLElement>(".minidocs-update-time");
      if (updateTimeEl) {
        const formatted = formatMiniDocsDateTime(spec.updateTime);
        updateTimeEl.textContent = formatted ? `更新于 ${formatted}` : "";
      }
      const shareToken =
        spec.shareEnabled === true && spec.shareToken ? spec.shareToken : "";
      if (shareBtn) {
        if (shareToken) {
          shareBtn.href = `/docs/share/${encodeURIComponent(shareToken)}`;
          shareBtn.classList.remove("is-disabled");
          shareBtn.removeAttribute("aria-disabled");
        } else {
          shareBtn.href = "#";
          shareBtn.classList.add("is-disabled");
          shareBtn.setAttribute("aria-disabled", "true");
        }
      }
      const likeCount =
        typeof stats?.likeCount === "number"
          ? stats.likeCount
          : spec.likeCount ?? 0;
      if (likeCountEl) likeCountEl.textContent = String(likeCount);
      if (likeBtn && stats?.liked) likeBtn.classList.add("is-liked");
      const accessCount =
        typeof stats?.accessCount === "number"
          ? stats.accessCount
          : spec.accessCount ?? 0;
      if (viewCountEl) viewCountEl.textContent = String(accessCount);
    };

    shareBtn?.addEventListener("click", (event) => {
      if (shareBtn.classList.contains("is-disabled")) {
        event.preventDefault();
        event.stopPropagation();
      }
    });

    likeBtn?.addEventListener("click", async () => {
      if (!currentKb) return;
      try {
        const result = (await minidocsFetch(
          `/apis/api.minidocs.halo.run/v1alpha1/knowledgebases/${encodeURIComponent(
            currentKb
          )}/like`,
          { method: "POST" }
        )) as { likeCount?: number; liked?: boolean };
        if (typeof result.likeCount === "number" && likeCountEl) {
          likeCountEl.textContent = String(result.likeCount);
        }
        if (result.liked) {
          likeBtn.classList.add("is-liked");
        }
      } catch {
        /* Ignore like failures silently so reading is not interrupted */
      }
    });

    const miniContent = host.querySelector<HTMLElement>(".doc-content");
    if (miniContent) {
      mountPluginDocToolbar({
        plugin: "minidocs",
        container: miniContent,
        getMarkdown: () => currentMarkdown,
        triggerLike: () => likeBtn?.click(),
      });
    }

    currentKb = kbSlug;
    article = host.querySelector<HTMLElement>(".doc-article-body");
    treeRoot = document.getElementById("minidocs-tree");

    try {
      const kb = (await minidocsFetch(
        `/apis/api.minidocs.halo.run/v1alpha1/knowledgebases/${encodeURIComponent(kbSlug)}`
      )) as MiniDocsKnowledgeBase;
      const nameEl = host.querySelector<HTMLElement>(".minidocs-kb-name");
      if (nameEl) nameEl.textContent = kb.spec?.displayName ?? "MiniDocs 知识库";
      let stats: MiniDocsStats | null = null;
      try {
        stats = (await minidocsFetch(
          `/apis/api.minidocs.halo.run/v1alpha1/knowledgebases/${encodeURIComponent(
            kbSlug
          )}/stats`
        )) as MiniDocsStats;
      } catch {
        /* When the stats API is unavailable, render knowledge base fields only */
      }
      updateMeta(kb, stats);

      const tree = (await minidocsFetch(
        `/apis/api.minidocs.halo.run/v1alpha1/knowledgebases/${encodeURIComponent(
          kbSlug
        )}/tree`
      )) as MiniDocsTreeNode[];
      const slugs = minidocsTreeSlugs(tree ?? []);
      if (slugs.length === 0) {
        if (article) {
          article.innerHTML = `<p class="mdocs-plugin-empty">该知识库暂无已发布文档。</p>`;
        }
        return;
      }
      const initial =
        targetDocSlug && slugs.includes(targetDocSlug) ? targetDocSlug : slugs[0];
      if (treeRoot) {
        treeRoot.innerHTML = minidocsBuildTree(tree ?? [], initial, kbSlug);
        bindMiniDocsNavCollapse(treeRoot);
        treeRoot.addEventListener("click", (event) => {
          const target = event.target as HTMLElement;
          const link = target.closest<HTMLAnchorElement>("a[data-doc-slug]");
          if (!link) return;
          event.preventDefault();
          const slug = link.dataset.docSlug;
          if (slug) void renderDoc(slug, true);
        });
      }
      await renderDoc(initial, pushUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载知识库失败";
      if (article) {
        article.innerHTML = `<p class="mdocs-plugin-empty">${escapeHtml(message)}</p>`;
      }
    }
  };

  document
    .querySelectorAll<HTMLAnchorElement>(".mdocs-kb-card[data-kb]")
    .forEach((card) => {
      card.addEventListener("click", (event) => {
        event.preventDefault();
        const kbSlug = card.dataset.kb;
        if (!kbSlug) return;
        void openViewer(kbSlug);
      });
    });

  window.addEventListener("popstate", () => {
    const kbSlug = minidocsParams().get("kb");
    if (kbSlug) {
      void openViewer(kbSlug, minidocsParams().get("docSlug") ?? undefined, false);
    } else {
      showArchive();
    }
  });

  const initialKb = minidocsParams().get("kb");
  if (initialKb) {
    void openViewer(initialKb, minidocsParams().get("docSlug") ?? undefined, false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initBackground();
  initTheme();
  initPrimaryColor();
  initDocsmeVersionSwitchers();
  initHeaderMenu();
  initUserMenu();
  initMobileMenu();
  initSearchShortcut();
  initHeroCarousel();
  initOverviewGroups();
  initToc();
  initSidebarCollapse();
  initSidebarDrawer();
  initMiniDocsArchive();
  initDocsmeNavCollapse();
  const docsmeContent = document.querySelector<HTMLElement>(
    ".mdocs-docsme-page .dm-content"
  );
  const docsmeRaw = document.getElementById("docsme-raw-markdown");
  if (docsmeContent && docsmeRaw) {
    mountPluginDocToolbar({
      plugin: "docsme",
      container: docsmeContent,
      getMarkdown: () => {
        const raw = docsmeRaw.textContent?.trim();
        if (raw) return raw;
        const title =
          document.querySelector<HTMLElement>(".dm-content__body h1")?.textContent ??
          "";
        return `[${title}](${window.location.href})`;
      },
    });
  }
  document.querySelectorAll<HTMLElement>(".doc-content").forEach((content) => {
    const layout = content.closest<HTMLElement>(".doc-layout");
    if (!layout || layout.classList.contains("minidocs-doc-layout")) return;
    if (content.querySelector(".mdocs-content-toolbar")) return;
    const rawElement = document.getElementById("page-md-data");
    mountPluginDocToolbar({
      plugin: "docs",
      container: content,
      getMarkdown: () => {
        const raw = rawElement?.textContent?.trim();
        if (raw) return raw;
        const title =
          document.querySelector<HTMLElement>(".doc-article-title")?.textContent ??
          "";
        return `[${title}](${window.location.href})`;
      },
    });
  });
  document
    .querySelectorAll<HTMLElement>(".minidocs-doc-layout")
    .forEach((layout) => bindMiniDocsNavCollapse(layout));
});
