const DICT = {
  en: {
    'nav.badge': 'READ-ONLY · DSH NATIVE',
    'nav.features': 'Capabilities',
    'nav.showcase': 'Workbench',
    'nav.benchmarks': 'Benchmarks',
    'nav.install': 'Quick Start',
    'nav.github': 'GitHub',
    'hero.eyebrow': '@clew/dsh-plugin v0.1.0 · Zero-LSP · Web Tree-sitter WASM',
    'hero.title': 'Find your way through complex codebases.',
    'hero.lead':
      'Clew turns unfamiliar Python, C, C++, Go, Rust, and TypeScript/JavaScript repositories into verified implementation trace graphs, zero-config definition navigation, and persistent reading notes inside DeepSeek Harness.',
    'hero.ctaInstall': 'Install in DeepSeek Harness',
    'hero.ctaDocs': 'Read Architecture Spec',
    'hero.stat1v': '7 Languages',
    'hero.stat1k': 'WASM Tree-sitter',
    'hero.stat2v': '0 Native Builds',
    'hero.stat2k': 'No node-gyp / LSP',
    'hero.stat3v': '100% Read-Only',
    'hero.stat3k': 'Verified source citations',
    'features.title': 'Built for systematic source comprehension',
    'features.subtitle':
      'Deterministic indexing first, bounded AI reasoning second — every graph edge and AI citation is cross-checked against real repository lines.',
    'features.c1tag': 'ZERO-CONFIG NAVIGATION',
    'features.c1title': 'Go to Definition & AST-Filtered References',
    'features.c1body':
      '4-tier symbol ranking (lexical scope, resolved imports, module siblings, global index) plus ripgrep word-boundary search pruned with Tree-sitter AST to drop comment and string false positives.',
    'features.c2tag': 'EVIDENCE VERIFICATION',
    'features.c2title': 'Trace Graphs That Distinguish Proof from Guess',
    'features.c2body':
      'Reading goals trigger bounded subgraph retrieval laid out in an ELK Web Worker, clearly tagging every edge as source-verified call, static dependency, inferred dynamic, or unverified.',
    'features.c3tag': 'DEEP READING ERGONOMICS',
    'features.c3title': 'Split Compare, Peek Cards & Git History',
    'features.c3body':
      'Compare callers and callees side-by-side in dual-pane view, inspect struct/interface definitions inline via non-blocking Peek Cards, view read-only line commit logs, and track per-file reading statuses.',
    'features.c4tag': 'SECURITY BOUNDARY',
    'features.c4title': 'Strict Read-Only & Untrusted Repo Isolation',
    'features.c4body':
      'Clew never writes files or executes imported repo scripts (core.hooksPath=/dev/null), enforces symlink containment checks, escapes untrusted output, and anchors persistent notes safely across sessions.',
    'showcase.title': 'Real DeepSeek Harness Runtime Views',
    'showcase.subtitle':
      'Captured directly from live browser verification runs across Dark/Light host themes and English/Simplified Chinese locales.',
    'showcase.t1': '3-Column Workbench (Dark)',
    'showcase.t2': 'Split Compare + Peek + Git',
    'showcase.t3': 'Light Theme (1280×800)',
    'showcase.t4': 'Chinese UI',
    'showcase.t5': 'Diagnostics & Cache',
    'showcase.c1':
      'Left repository tree & exploration trail, center ELK trace graph + virtualized code reader, right contextual Ask AI with clickable citations.',
    'showcase.c2':
      'Dual-pane side-by-side file comparison, non-blocking struct SearchWorker Peek Card, and read-only git log -L line history.',
    'showcase.c3':
      'Compact laptop viewport (1280×800) inheriting DeepSeek Harness light tokens with high-contrast graph edges.',
    'showcase.c4':
      'Full Simplified Chinese localization with mixed monospace code and CJK typography.',
    'showcase.c5':
      'Real disk cache footprint, snapshot count, telemetry timings, and host diagnostic logs.',
    'bench.title': 'Validated on Real Multi-Language OSS Codebases',
    'bench.subtitle':
      'Measured end-to-end on Node v26.13.1 with SHA-256 incremental disk caching and zero native compilation.',
    'bench.hRepo': 'Repository',
    'bench.hStack': 'Languages',
    'bench.hScale': 'Files / Symbols',
    'bench.hCold': 'Cold Index',
    'bench.hWarm': 'Warm Cache Hit',
    'install.title': 'Install & Start Reading in 60 Seconds',
    'install.subtitle':
      'Clew plugs straight into DeepSeek Harness — no separate API gateway or per-repo IDE indexing required.',
    'install.s1t': 'Build & Register Plugin',
    'install.s2t': 'Launch DSH & Import Repo',
    'install.s2d':
      'Open Clew from the left navigation rail, click + Import Repo, and point to any local directory or HTTPS/SSH Git URL.',
    'install.s3t': 'Trace, Compare & Annotate',
    'install.s3a': 'Submit a reading goal to generate a verified call/dependency graph.',
    'install.s3b': 'Press Cmd/Ctrl+P for symbol jump or Cmd/Ctrl+Shift+F for ripgrep search.',
    'install.s3c': 'Highlight lines to Peek structs, inspect Git history, Ask AI, or save Reading Paths.',
  },
  zh: {
    'nav.badge': '只读工作台 · DSH 原生插件',
    'nav.features': '核心能力',
    'nav.showcase': '真实界面',
    'nav.benchmarks': '多语言实测',
    'nav.install': '快速安装',
    'nav.github': 'GitHub',
    'hero.eyebrow': '@clew/dsh-plugin v0.1.0 · 零 LSP 依赖 · Web Tree-sitter WASM',
    'hero.title': '循着线索，读懂复杂源码。',
    'hero.lead':
      'Clew 将复杂的 Python、C、C++、Go、Rust 与 TypeScript/JavaScript 代码库转化为可验证的实现链路图谱、零配置定义跳转与持久化阅读笔记，原生运行于 DeepSeek Harness。',
    'hero.ctaInstall': '在 DeepSeek Harness 中安装',
    'hero.ctaDocs': '阅读架构规范',
    'hero.stat1v': '7 大主流语言',
    'hero.stat1k': 'WASM Tree-sitter',
    'hero.stat2v': '0 原生编译',
    'hero.stat2k': '无需 node-gyp / LSP',
    'hero.stat3v': '100% 只读安全',
    'hero.stat3k': '源码证据反向核验',
    'features.title': '专为系统级源码理解而设计',
    'features.subtitle':
      '确定性索引先行、受控 AI 推理在后——每一条图谱调用边与问答引用均经源码与 AST 反向核验。',
    'features.c1tag': '零配置导航',
    'features.c1title': '四级定义跳转与 AST 过滤引用查找',
    'features.c1body':
      '融合文件作用域、解析导入、同级模块与全局符号表的 4 级跳转排序，结合 Tree-sitter AST 剔除注释与字符串中的 ripgrep 引用误报。',
    'features.c2tag': '证据分级校验',
    'features.c2title': '明确区分「源码证实」与「动态推断」的链路图谱',
    'features.c2body':
      '阅读目标触发有界子图检索并在 Web Worker 中完成 ELK 自动布局，严格标注源码证实、静态依赖、推断调用与未证实边。',
    'features.c3tag': '深度阅读增强',
    'features.c3title': '双栏对照、数据结构速览卡与行级 Git 历史',
    'features.c3body':
      '支持两文件并排只读对比、非阻塞 Peek 速览卡查看结构体与接口定义、只读行级提交历史追踪，以及文件阅读状态标签沉淀。',
    'features.c4tag': '只读安全红线',
    'features.c4title': '严格只读与不可信源码沙盒隔离',
    'features.c4body':
      '绝不改写源码或执行目标仓库脚本（core.hooksPath=/dev/null），校验符号链接防逃逸，所有代码渲染经安全转义并支持跨会话笔记恢复。',
    'showcase.title': 'DeepSeek Harness 真实运行实景',
    'showcase.subtitle':
      '全部来自真实浏览器验收截图，覆盖深/浅色宿主主题、不同视口与中英文界面。',
    'showcase.t1': '三栏核心工作台（深色）',
    'showcase.t2': '双栏对照 + Peek + Git 历史',
    'showcase.t3': '浅色主题（1280×800）',
    'showcase.t4': '简体中文界面',
    'showcase.t5': '诊断与磁盘缓存面板',
    'showcase.c1':
      '左侧仓库文件树与探索轨迹，中间 ELK 实现链路图与虚拟化源码阅读器，右侧带可点击引用徽章的上下文 Ask AI。',
    'showcase.c2':
      '双栏代码对比阅读、SearchWorker 结构体非阻塞 Peek 速览卡，以及行级 git log -L 只读提交上下文。',
    'showcase.c3':
      '1280×800 紧凑笔记本视口继承 DSH 浅色主题变量，同时保持高对比度链路图边界线条。',
    'showcase.c4':
      '完整简体中文本地化与等宽源码/汉字混排排版体验。',
    'showcase.c5':
      '展示真实磁盘缓存体积、快照数量、分析耗时遥测与宿主结构化日志。',
    'bench.title': '真实多语言开源仓库端到端实测',
    'bench.subtitle':
      '在 Node v26.13.1 下通过 SHA-256 增量磁盘缓存与零原生编译架构实测验证。',
    'bench.hRepo': '开源仓库',
    'bench.hStack': '技术栈',
    'bench.hScale': '文件 / 符号规模',
    'bench.hCold': '冷构建索引',
    'bench.hWarm': '热缓存复用',
    'install.title': '60 秒完成安装并开始阅读',
    'install.subtitle':
      'Clew 直接挂载至 DeepSeek Harness，无需独立后端或繁琐的语言服务器配置。',
    'install.s1t': '构建并注册插件',
    'install.s2t': '启动 DSH 并导入仓库',
    'install.s2d':
      '在左侧栏打开 Clew，点击「导入仓库」，选择任意本地源码路径或 HTTPS/SSH Git 地址。',
    'install.s3t': '追踪、对照与批注沉淀',
    'install.s3a': '输入自然语言阅读目标，生成经源码核验的调用链路图。',
    'install.s3b': '使用 Cmd/Ctrl+P 极速跳符号，或 Cmd/Ctrl+Shift+F 进行 ripgrep 全文搜索。',
    'install.s3c': '选中代码即可触发结构速览、Git 提交上下文、上下文问答或保存阅读路径。',
  },
};

const SHOT_CAPTION_KEYS = {
  'workbench-dark-en': 'showcase.c1',
  'split-peek-git': 'showcase.c2',
  'workbench-light-en': 'showcase.c3',
  'workbench-dark-zh': 'showcase.c4',
  diagnostics: 'showcase.c5',
};

let currentLang = 'en';
let activeShot = 'workbench-dark-en';

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  const dict = DICT[lang];
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) {
      el.textContent = dict[key];
    }
  }
  const captionEl = document.getElementById('showcase-caption');
  const capKey = SHOT_CAPTION_KEYS[activeShot];
  if (captionEl && capKey && dict[capKey]) {
    captionEl.textContent = dict[capKey];
  }
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) langBtn.textContent = lang === 'en' ? '中文' : 'EN';
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = next === 'dark' ? 'Light' : 'Dark';
}

document.getElementById('lang-toggle')?.addEventListener('click', () => {
  applyLanguage(currentLang === 'en' ? 'zh' : 'en');
});

document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

for (const btn of document.querySelectorAll('.tab-btn')) {
  btn.addEventListener('click', () => {
    const shot = btn.getAttribute('data-shot');
    if (!shot) return;
    activeShot = shot;
    for (const other of document.querySelectorAll('.tab-btn')) {
      other.classList.toggle('active', other === btn);
    }
    const img = document.getElementById('showcase-img');
    if (img) img.setAttribute('src', `./assets/screenshots/${shot}.png`);
    applyLanguage(currentLang);
  });
}

applyLanguage('en');
