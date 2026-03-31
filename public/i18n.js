const STORAGE_KEY = 'easy-latex:lang';
const LANGUAGES = new Set(['en', 'zh']);

const translations = {
  en: {
    'common.language_toggle': '中文',
    'app.eyebrow': 'Online LaTeX Workspace',
    'app.loading_workspace': 'Loading workspace…',
    'app.project': 'Project',
    'app.project_menu': 'Projects',
    'app.files_menu': 'Files',
    'app.build_menu': 'Build',
    'app.project_select': 'Select',
    'app.project_manage': 'Manage',
    'app.file_actions': 'Actions',
    'app.file_explorer': 'Explorer',
    'app.build_settings': 'Settings',
    'app.build_logs': 'Logs',
    'app.engine': 'Engine',
    'app.main_file': 'Main File',
    'app.project_files': 'Project Files',
    'app.auto_compile': 'Auto compile',
    'app.tex_source': 'TeX Source',
    'app.no_file_selected': 'No file selected',
    'app.open_file': 'Open File',
    'app.read_only': 'Read only',
    'app.compile_output': 'Compile Output',
    'app.pdf_preview': 'PDF Preview',
    'app.no_preview': 'No preview yet',
    'app.preview_placeholder': 'Compile a project to see the generated PDF here.',
    'app.export_title': 'Export Compiled PDF',
    'app.export_description': 'Choose how to handle the latest compiled PDF.',
    'actions.login': 'Log In',
    'actions.logout': 'Log Out',
    'actions.admin': 'Admin',
    'actions.new_project': 'New Project',
    'actions.rename': 'Rename',
    'actions.delete': 'Delete',
    'actions.new_file': 'New File',
    'actions.delete_file': 'Delete File',
    'actions.upload_files': 'Upload Files',
    'actions.upload_folder': 'Upload Folder',
    'actions.save': 'Save',
    'actions.compile': 'Compile',
    'actions.export_pdf': 'Export PDF',
    'actions.help': 'Help',
    'actions.download': 'Download',
    'actions.save_to_cloud': 'Save to Cloud',
    'actions.cancel': 'Cancel',
    'session.signed_in_as': 'Signed in as {username}',
    'session.guest': 'Guest session',
    'session.login_required': 'Login required',
    'quota.storage': 'Storage {used} / {limit}',
    'tree.empty': 'No files yet.',
    'tree.dir': 'DIR',
    'tree.text': 'TXT',
    'tree.binary': 'BIN',
    'main_file.none': 'No .tex files',
    'compile.mode': 'Compile Mode: {mode}',
    'editor.unsaved': 'Unsaved changes',
    'editor.editable': 'Editable',
    'editor.no_output': 'No compile output yet.',
    'preview.ready': 'Preview ready',
    'preview.none': 'No preview yet',
    'summary.compiling': 'Compiling…',
    'summary.success': 'Compile succeeded',
    'summary.success_warnings': 'Compile succeeded with warnings',
    'summary.failed': 'Compile failed',
    'banner.opened_file': 'Opened {path}',
    'banner.binary_file': '{reason} Use the file link above if needed.',
    'banner.saved_file': 'Saved {path}',
    'banner.running_compile': 'Running LaTeX compiler…',
    'banner.compile_success': 'Compile finished successfully.',
    'banner.compile_success_warnings': 'Compile finished with warnings. Check the notes below.',
    'banner.compile_failed': 'Compile failed. Check the log and issue summary below.',
    'banner.created_project': 'Created project {name}',
    'banner.renamed_project': 'Project renamed.',
    'banner.deleted_project': 'Project deleted.',
    'banner.created_file': 'Created {path}',
    'banner.deleted_file': 'File deleted.',
    'banner.upload_complete': 'Upload complete.',
    'banner.download_started': 'Download started.',
    'banner.saved_pdf': 'Saved compiled PDF to {path}',
    'banner.engine_updated': 'Compile engine updated.',
    'banner.engine_auto_switched': 'Switched engine to {engine} based on the main document contents.',
    'banner.main_file_updated': 'Main file updated.',
    'banner.auto_compile_on': 'Auto compile enabled.',
    'banner.auto_compile_off': 'Auto compile disabled.',
    'banner.workspace_ready': 'Workspace ready.',
    'prompt.unsaved_switch': 'The current file has unsaved changes. Click OK to save before switching, or Cancel to discard changes.',
    'prompt.new_project': 'New project name:',
    'prompt.rename_project': 'Rename project:',
    'prompt.delete_project': 'Delete project "{name}"? This cannot be undone.',
    'prompt.new_file': 'New file path (for example: chapter1.tex):',
    'prompt.delete_file': 'Delete {path}?',
    'default.untitled_project': 'Untitled Project',
    'default.new_file': 'chapter1.tex',
    'default.new_section': '\\section{New Section}\n',
    'binary.too_large': 'File is too large for in-browser editing.',
    'binary.not_editable': 'Binary or non-editable file selected.',
    'compile.item.error': 'Error',
    'compile.item.warning': 'Warning',
    'compile.item.hint': 'Hint',
    'compile.warning.missing_glyphs': 'The PDF was created, but the active font setup is missing glyphs for: {chars}',
    'compile.warning.missing_package': 'The server is missing the LaTeX package: {packageName}',
    'compile.hint.switch_to_xelatex': 'This document is better compiled with XeLaTeX because it uses Unicode-aware packages or CJK content.',
    'compile.hint.configure_cjk_support': 'Add Chinese font support, for example `\\documentclass{ctexart}` or `\\usepackage[UTF8]{ctex}` / `\\usepackage{xeCJK}` with `\\setCJKmainfont{...}`.',
    'compile.hint.fontspec_requires_unicode': 'The `fontspec` package requires XeLaTeX or LuaLaTeX. XeLaTeX is recommended here.',
    'compile.warning.latin_fallback': 'The document is falling back to Latin Modern for some CJK text, so those glyphs are missing.',
    'compile.hint.fontspec_not_enough_for_cjk': 'Using `fontspec` alone is not enough for Chinese text. Add `ctex` or `xeCJK`/`luatexja` support as well.',
    'compile.hint.set_cjk_font_family': 'A CJK support package is present, but a usable CJK font is still not being applied. Set a font such as `\\setCJKmainfont{Noto Sans CJK SC}`.',
    'compile.hint.use_installed_cjk_fonts': 'Fonts already installed on this server include `Noto Sans CJK SC`, `Noto Serif CJK SC`, and `WenQuanYi Zen Hei`.',
    'guide.eyebrow': 'First Login Guide',
    'guide.title': 'Welcome to easy-latex',
    'guide.intro': 'This quick guide introduces the main features and the recommended workflow.',
    'guide.step_project': 'Open the top Project menu to switch, create, rename, or delete projects.',
    'guide.step_files': 'Open the Files menu to upload `.tex` files, create new files, and choose the document you want to edit.',
    'guide.step_build': 'Open the Build menu to change the engine, select the main `.tex` file, inspect compile logs, and enable auto compile.',
    'guide.step_export': 'Use Compile to refresh the right-side PDF preview, then Export PDF to download or save the result.',
    'guide.step_shortcuts': 'Shortcuts: `Ctrl/Cmd + S` saves, `Ctrl/Cmd + Enter` compiles, `Ctrl/Cmd + Shift + E` exports, and `Alt + 1/2/3` opens the top menus.',
    'guide.tip': 'For Chinese documents, XeLaTeX is the default and is usually the right choice.',
    'guide.start': 'Start Using easy-latex',
    'login.eyebrow': 'Username + Password Only',
    'login.title': 'User Login',
    'login.description': 'Sign in to access your projects and save compiled PDFs into cloud storage.',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.back': 'Back to Editor',
    'login.status.checking': 'Checking current access mode…',
    'login.status.guest_enabled': 'Guest access is currently enabled.',
    'login.status.required': 'User login is required to enter the editor.',
    'login.description.optional': 'User login is optional right now because the admin has disabled mandatory login. You can still sign in here to access your cloud projects.',
    'login.status.signing_in': 'Signing in…',
    'admin.eyebrow': 'System Control',
    'admin.title': 'easy-latex Admin',
    'admin.editor': 'Editor',
    'admin.loading': 'Loading admin state…',
    'admin.setup_title': 'Create First Admin',
    'admin.setup_desc': 'This setup runs only once. After the first admin account exists, this page becomes the standard admin login.',
    'admin.admin_username': 'Admin Username',
    'admin.password': 'Password',
    'admin.create_admin': 'Create Admin',
    'admin.login_title': 'Admin Login',
    'admin.settings_title': 'System Settings',
    'admin.user_system': 'User System',
    'admin.user_system_desc': 'When disabled, visitors can enter the editor directly as guests.',
    'admin.online_users': 'Online Users',
    'admin.concurrent_cap': 'Concurrent Cap',
    'admin.normal_users': 'Normal Users',
    'admin.create_user': 'Create User',
    'admin.user': 'User',
    'admin.status': 'Status',
    'admin.projects': 'Projects',
    'admin.usage': 'Usage',
    'admin.actions': 'Actions',
    'admin.project': 'Project',
    'admin.owner': 'Owner',
    'admin.engine': 'Engine',
    'admin.main_file': 'Main File',
    'admin.compile_mode': 'Compile Mode',
    'admin.online': 'Online',
    'admin.offline': 'Offline',
    'admin.delete': 'Delete',
    'admin.bootstrap_setup': 'Create the initial admin account to activate the admin console.',
    'admin.login_required': 'Admin login required.',
    'admin.identity': 'Admin: {username}',
    'admin.enabled': 'Enabled',
    'admin.disabled': 'Disabled',
    'admin.ready': 'Admin dashboard ready.',
    'admin.creating_admin': 'Creating admin account…',
    'admin.signing_in': 'Signing in…',
    'admin.auth_enabled': 'User system enabled.',
    'admin.auth_disabled': 'User system disabled.',
    'admin.user_created': 'User created.',
    'admin.user_deleted': 'Deleted user {username}.',
    'admin.project_mode_updated': 'Compile mode updated for {name}.',
    'admin.delete_user_prompt': 'Delete user "{username}" and all of their projects?'
  },
  zh: {
    'common.language_toggle': 'EN',
    'app.eyebrow': '在线 LaTeX 工作台',
    'app.loading_workspace': '正在加载工作区…',
    'app.project': '项目',
    'app.project_menu': '项目菜单',
    'app.files_menu': '文件菜单',
    'app.build_menu': '编译菜单',
    'app.project_select': '选择项目',
    'app.project_manage': '项目管理',
    'app.file_actions': '文件操作',
    'app.file_explorer': '文件浏览',
    'app.build_settings': '编译设置',
    'app.build_logs': '日志输出',
    'app.engine': '编译引擎',
    'app.main_file': '主文件',
    'app.project_files': '项目文件',
    'app.auto_compile': '自动编译',
    'app.tex_source': 'TeX 源码',
    'app.no_file_selected': '未选择文件',
    'app.open_file': '打开文件',
    'app.read_only': '只读',
    'app.compile_output': '编译输出',
    'app.pdf_preview': 'PDF 预览',
    'app.no_preview': '暂无预览',
    'app.preview_placeholder': '编译后会在这里显示生成的 PDF 预览。',
    'app.export_title': '导出编译后的 PDF',
    'app.export_description': '请选择如何处理最新一次编译生成的 PDF。',
    'actions.login': '登录',
    'actions.logout': '退出登录',
    'actions.admin': '管理后台',
    'actions.new_project': '新建项目',
    'actions.rename': '重命名',
    'actions.delete': '删除',
    'actions.new_file': '新建文件',
    'actions.delete_file': '删除文件',
    'actions.upload_files': '上传文件',
    'actions.upload_folder': '上传文件夹',
    'actions.save': '保存',
    'actions.compile': '编译',
    'actions.export_pdf': '导出 PDF',
    'actions.help': '帮助',
    'actions.download': '下载到本地',
    'actions.save_to_cloud': '保存到云空间',
    'actions.cancel': '取消',
    'session.signed_in_as': '已登录：{username}',
    'session.guest': '游客会话',
    'session.login_required': '需要登录',
    'quota.storage': '存储空间 {used} / {limit}',
    'tree.empty': '当前没有文件。',
    'tree.dir': '目录',
    'tree.text': '文本',
    'tree.binary': '二进制',
    'main_file.none': '没有可选的 .tex 文件',
    'compile.mode': '编译模式：{mode}',
    'editor.unsaved': '有未保存修改',
    'editor.editable': '可编辑',
    'editor.no_output': '暂无编译输出。',
    'preview.ready': '预览已就绪',
    'preview.none': '暂无预览',
    'summary.compiling': '正在编译…',
    'summary.success': '编译成功',
    'summary.success_warnings': '编译成功，但有警告',
    'summary.failed': '编译失败',
    'banner.opened_file': '已打开 {path}',
    'banner.binary_file': '{reason} 如有需要，可使用上方文件链接直接打开。',
    'banner.saved_file': '已保存 {path}',
    'banner.running_compile': '正在运行 LaTeX 编译器…',
    'banner.compile_success': '编译成功。',
    'banner.compile_success_warnings': '编译完成，但有警告，请检查下方说明。',
    'banner.compile_failed': '编译失败，请检查下方日志和问题摘要。',
    'banner.created_project': '已创建项目 {name}',
    'banner.renamed_project': '项目已重命名。',
    'banner.deleted_project': '项目已删除。',
    'banner.created_file': '已创建 {path}',
    'banner.deleted_file': '文件已删除。',
    'banner.upload_complete': '上传完成。',
    'banner.download_started': '已开始下载。',
    'banner.saved_pdf': '编译后的 PDF 已保存到 {path}',
    'banner.engine_updated': '编译引擎已更新。',
    'banner.engine_auto_switched': '系统已根据主文档内容自动切换到 {engine}。',
    'banner.main_file_updated': '主文件已更新。',
    'banner.auto_compile_on': '已开启自动编译。',
    'banner.auto_compile_off': '已关闭自动编译。',
    'banner.workspace_ready': '工作区已就绪。',
    'prompt.unsaved_switch': '当前文件有未保存修改。点击“确定”先保存后切换，点击“取消”则丢弃这些修改。',
    'prompt.new_project': '请输入新项目名称：',
    'prompt.rename_project': '请输入新的项目名称：',
    'prompt.delete_project': '确定删除项目“{name}”吗？此操作不可撤销。',
    'prompt.new_file': '请输入新文件路径，例如：chapter1.tex',
    'prompt.delete_file': '确定删除 {path} 吗？',
    'default.untitled_project': '未命名项目',
    'default.new_file': 'chapter1.tex',
    'default.new_section': '\\section{新章节}\n',
    'binary.too_large': '文件过大，无法直接在浏览器中编辑。',
    'binary.not_editable': '当前文件是二进制文件或不可直接编辑。',
    'compile.item.error': '错误',
    'compile.item.warning': '警告',
    'compile.item.hint': '提示',
    'compile.warning.missing_glyphs': 'PDF 已生成，但当前字体配置缺少这些字符的字形：{chars}',
    'compile.warning.missing_package': '服务器缺少 LaTeX 宏包：{packageName}',
    'compile.hint.switch_to_xelatex': '该文档使用了 Unicode 相关宏包或中日韩字符，更适合使用 XeLaTeX 编译。',
    'compile.hint.configure_cjk_support': '请为中文配置 CJK 支持，例如使用 `\\documentclass{ctexart}`，或添加 `\\usepackage[UTF8]{ctex}` / `\\usepackage{xeCJK}` 并设置 `\\setCJKmainfont{...}`。',
    'compile.hint.fontspec_requires_unicode': '`fontspec` 只能在 XeLaTeX 或 LuaLaTeX 下工作，这里建议使用 XeLaTeX。',
    'compile.warning.latin_fallback': '文档中的部分中日韩文本回退到了 Latin Modern 字体，因此这些字符没有对应字形。',
    'compile.hint.fontspec_not_enough_for_cjk': '仅使用 `fontspec` 还不足以正确处理中文，请额外加入 `ctex` 或 `xeCJK`/`luatexja` 支持。',
    'compile.hint.set_cjk_font_family': '文档已经有 CJK 宏包，但仍未成功套用可用的中文字体。请显式设置，例如 `\\setCJKmainfont{Noto Sans CJK SC}`。',
    'compile.hint.use_installed_cjk_fonts': '这台服务器已经安装了 `Noto Sans CJK SC`、`Noto Serif CJK SC` 和 `WenQuanYi Zen Hei`，可直接用于中文字体配置。',
    'guide.eyebrow': '首次登录指引',
    'guide.title': '欢迎使用 easy-latex',
    'guide.intro': '这个快速指引会介绍主要功能和推荐使用流程。',
    'guide.step_project': '打开顶部“项目菜单”可以切换、新建、重命名或删除项目。',
    'guide.step_files': '打开“文件菜单”可以上传 `.tex` 文件、新建文件，并选择当前要编辑的文档。',
    'guide.step_build': '打开“编译菜单”可以切换引擎、指定主 `.tex` 文件、查看编译日志，并开启自动编译。',
    'guide.step_export': '点击“编译”刷新右侧 PDF 预览，再通过“导出 PDF”下载或保存结果。',
    'guide.step_shortcuts': '快捷键：`Ctrl/Cmd + S` 保存，`Ctrl/Cmd + Enter` 编译，`Ctrl/Cmd + Shift + E` 导出，`Alt + 1/2/3` 打开顶部菜单。',
    'guide.tip': '对于中文文档，系统默认使用 XeLaTeX，这通常也是最合适的选择。',
    'guide.start': '开始使用 easy-latex',
    'login.eyebrow': '仅支持用户名 + 密码',
    'login.title': '普通用户登录',
    'login.description': '登录后可以访问个人项目，并将编译后的 PDF 保存到云空间。',
    'login.username': '用户名',
    'login.password': '密码',
    'login.back': '返回编辑器',
    'login.status.checking': '正在检查当前访问模式…',
    'login.status.guest_enabled': '当前已启用游客访问。',
    'login.status.required': '进入编辑器前需要先登录普通用户。',
    'login.description.optional': '管理员当前已关闭强制登录，因此游客也可以直接访问编辑器。你仍然可以在这里登录以访问自己的云空间项目。',
    'login.status.signing_in': '正在登录…',
    'admin.eyebrow': '系统控制台',
    'admin.title': 'easy-latex 管理后台',
    'admin.editor': '编辑器',
    'admin.loading': '正在加载管理后台状态…',
    'admin.setup_title': '创建首个管理员',
    'admin.setup_desc': '该初始化只执行一次。首个管理员创建完成后，本页将作为标准管理员登录页面使用。',
    'admin.admin_username': '管理员用户名',
    'admin.password': '密码',
    'admin.create_admin': '创建管理员',
    'admin.login_title': '管理员登录',
    'admin.settings_title': '系统设置',
    'admin.user_system': '用户系统',
    'admin.user_system_desc': '关闭后，访客可以直接以游客身份进入编辑器。',
    'admin.online_users': '在线用户数',
    'admin.concurrent_cap': '并发上限',
    'admin.normal_users': '普通用户',
    'admin.create_user': '创建用户',
    'admin.user': '用户',
    'admin.status': '状态',
    'admin.projects': '项目数',
    'admin.usage': '空间占用',
    'admin.actions': '操作',
    'admin.project': '项目',
    'admin.owner': '归属者',
    'admin.engine': '引擎',
    'admin.main_file': '主文件',
    'admin.compile_mode': '编译模式',
    'admin.online': '在线',
    'admin.offline': '离线',
    'admin.delete': '删除',
    'admin.bootstrap_setup': '请先创建首个管理员账号以启用管理后台。',
    'admin.login_required': '需要管理员登录。',
    'admin.identity': '管理员：{username}',
    'admin.enabled': '已启用',
    'admin.disabled': '已关闭',
    'admin.ready': '管理后台已就绪。',
    'admin.creating_admin': '正在创建管理员账号…',
    'admin.signing_in': '正在登录…',
    'admin.auth_enabled': '用户系统已启用。',
    'admin.auth_disabled': '用户系统已关闭。',
    'admin.user_created': '普通用户已创建。',
    'admin.user_deleted': '已删除用户 {username}。',
    'admin.project_mode_updated': '项目 {name} 的编译模式已更新。',
    'admin.delete_user_prompt': '确定删除用户“{username}”以及其全部项目吗？'
  }
};

let currentLanguage = (() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return LANGUAGES.has(stored) ? stored : 'zh';
})();

const listeners = new Set();

function interpolate(template, variables = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_match, key) => (
    variables[key] === undefined ? `{${key}}` : String(variables[key])
  ));
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, variables = {}) {
  const template = translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
  return interpolate(template, variables);
}

export function applyTranslations(root = document) {
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';

  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of root.querySelectorAll('[data-i18n-placeholder]')) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
}

function updateToggleLabel(toggle) {
  if (!toggle) {
    return;
  }
  toggle.textContent = t('common.language_toggle');
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLanguage(language) {
  if (!LANGUAGES.has(language) || language === currentLanguage) {
    return;
  }
  currentLanguage = language;
  localStorage.setItem(STORAGE_KEY, currentLanguage);
  applyTranslations();
  for (const listener of listeners) {
    listener(currentLanguage);
  }
}

export function initLanguageToggle(toggleId = 'languageToggle') {
  const toggle = document.getElementById(toggleId);
  applyTranslations();
  updateToggleLabel(toggle);

  if (!toggle) {
    return;
  }

  toggle.addEventListener('click', () => {
    setLanguage(currentLanguage === 'zh' ? 'en' : 'zh');
    updateToggleLabel(toggle);
  });

  onLanguageChange(() => {
    updateToggleLabel(toggle);
  });
}
