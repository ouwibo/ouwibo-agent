// static/i18n.js — Ouwibo Agent Global Internationalization
(function (global) {
  'use strict';

  const LANGS = {
    id: { name: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
    en: { name: 'English',          flag: '🇬🇧', dir: 'ltr' },
    ar: { name: 'العربية',          flag: '🇸🇦', dir: 'rtl' },
    zh: { name: '中文',              flag: '🇨🇳', dir: 'ltr' },
    ja: { name: '日本語',            flag: '🇯🇵', dir: 'ltr' },
    fr: { name: 'Français',         flag: '🇫🇷', dir: 'ltr' },
    de: { name: 'Deutsch',          flag: '🇩🇪', dir: 'ltr' },
    es: { name: 'Español',          flag: '🇪🇸', dir: 'ltr' },
  };

  const T = {
    // ── Bahasa Indonesia ──────────────────────────────────────────────────────
    id: {
      'nav.section.chat'    : 'Chat',
      'nav.chat'            : 'Chat',
      'nav.new_chat'        : 'Chat Baru',
      'nav.search'          : 'Pencarian',
      'nav.section.control' : 'Kontrol',
      'nav.overview'        : 'Ikhtisar',
      'nav.channels'        : 'Saluran',
      'nav.instances'       : 'Instansi',
      'nav.sessions'        : 'Sesi',
      'nav.usage'           : 'Penggunaan',
      'nav.cron_jobs'       : 'Cron Jobs',
      'nav.section.agent'   : 'Agent',
      'nav.agents'          : 'Agents',
      'nav.skills'          : 'Kemampuan',
      'nav.nodes'           : 'Node',
      'nav.section.settings': 'Pengaturan',
      'nav.config'          : 'Konfigurasi',
      'nav.communications'  : 'Komunikasi',
      'nav.appearance'      : 'Tampilan',
      'nav.automation'      : 'Otomasi',
      'nav.debug'           : 'Debug',
      'nav.docs'            : 'Dokumentasi',
      'nav.system_active'   : 'Sistem Aktif',
      'breadcrumb.chat'     : 'Chat',
      'breadcrumb.search'   : 'Pencarian',
      'header.search_ph'    : 'Cari',
      'chat.placeholder'    : 'Ketik pesan… (Enter kirim, Shift+Enter baris baru)',
      'chat.welcome_title'  : 'Ouwibo Agent siap menerima instruksi.',
      'chat.welcome_body'   : 'Saya dapat membantu pencarian web dan kalkulasi matematika. Bagaimana saya bisa membantu?',
      'chat.footer'         : 'Ouwibo Agent dapat membuat kesalahan. Verifikasi informasi penting secara mandiri.',
      'chat.new_session'    : 'Sesi baru dimulai.',
      'chat.copy'           : 'Salin',
      'chat.assistant'      : 'Asisten',
      'chat.you'            : 'Anda',
      'chat.new_chat_btn'   : 'Chat Baru',
      'chat.err.connect'    : 'Tidak dapat terhubung ke server. Pastikan server berjalan.',
      'chat.err.server'     : 'Gagal mendapat respons: {detail}',
      'chat.err.invalid'    : 'Respons server tidak valid.',
      'chat.err.clipboard'  : 'Gagal menyalin ke clipboard.',
      'search.placeholder'  : 'Cari apa saja…',
      'search.btn'          : 'Ouwibo Telusuri',
      'search.lucky'        : 'Saya Sedang Beruntung',
      'search.results'      : 'Sekitar {count} hasil ({time} detik)',
      'search.no_results'   : 'Tidak ada hasil untuk "{query}"',
      'search.error'        : 'Pencarian gagal. Silakan coba lagi.',
      'search.more'         : 'Muat lebih banyak',
      'search.loading'      : 'Sedang mencari…',
      'search.filter.all'   : 'Semua',
      'search.filter.news'  : 'Berita',
      'search.filter.images': 'Gambar',
      'search.filter.videos': 'Video',
      'search.back_chat'    : 'Kembali ke Chat',
      'lang.label'          : 'Bahasa',
    },

    // ── English ───────────────────────────────────────────────────────────────
    en: {
      'nav.section.chat'    : 'Chat',
      'nav.chat'            : 'Chat',
      'nav.new_chat'        : 'New Chat',
      'nav.search'          : 'Search',
      'nav.section.control' : 'Control',
      'nav.overview'        : 'Overview',
      'nav.channels'        : 'Channels',
      'nav.instances'       : 'Instances',
      'nav.sessions'        : 'Sessions',
      'nav.usage'           : 'Usage',
      'nav.cron_jobs'       : 'Cron Jobs',
      'nav.section.agent'   : 'Agent',
      'nav.agents'          : 'Agents',
      'nav.skills'          : 'Skills',
      'nav.nodes'           : 'Nodes',
      'nav.section.settings': 'Settings',
      'nav.config'          : 'Configuration',
      'nav.communications'  : 'Communications',
      'nav.appearance'      : 'Appearance',
      'nav.automation'      : 'Automation',
      'nav.debug'           : 'Debug',
      'nav.docs'            : 'Documentation',
      'nav.system_active'   : 'System Active',
      'breadcrumb.chat'     : 'Chat',
      'breadcrumb.search'   : 'Search',
      'header.search_ph'    : 'Search',
      'chat.placeholder'    : 'Message Ouwibo… (Enter to send, Shift+Enter new line)',
      'chat.welcome_title'  : 'Ouwibo Agent is ready.',
      'chat.welcome_body'   : 'I can help with web search and math calculations. How can I help you today?',
      'chat.footer'         : 'Ouwibo Agent can make mistakes. Verify important information independently.',
      'chat.new_session'    : 'New session started.',
      'chat.copy'           : 'Copy',
      'chat.assistant'      : 'Assistant',
      'chat.you'            : 'You',
      'chat.new_chat_btn'   : 'New Chat',
      'chat.err.connect'    : 'Cannot connect to server. Make sure the server is running.',
      'chat.err.server'     : 'Failed to get response: {detail}',
      'chat.err.invalid'    : 'Invalid response from server.',
      'chat.err.clipboard'  : 'Failed to copy to clipboard.',
      'search.placeholder'  : 'Search anything…',
      'search.btn'          : 'Ouwibo Search',
      'search.lucky'        : "I'm Feeling Lucky",
      'search.results'      : 'About {count} results ({time} seconds)',
      'search.no_results'   : 'No results found for "{query}"',
      'search.error'        : 'Search failed. Please try again.',
      'search.more'         : 'Load more',
      'search.loading'      : 'Searching…',
      'search.filter.all'   : 'All',
      'search.filter.news'  : 'News',
      'search.filter.images': 'Images',
      'search.filter.videos': 'Videos',
      'search.back_chat'    : 'Back to Chat',
      'lang.label'          : 'Language',
    },

    // ── العربية ───────────────────────────────────────────────────────────────
    ar: {
      'nav.section.chat'    : 'المحادثة',
      'nav.chat'            : 'محادثة',
      'nav.new_chat'        : 'محادثة جديدة',
      'nav.search'          : 'بحث',
      'nav.section.control' : 'التحكم',
      'nav.overview'        : 'نظرة عامة',
      'nav.channels'        : 'القنوات',
      'nav.instances'       : 'المثيلات',
      'nav.sessions'        : 'الجلسات',
      'nav.usage'           : 'الاستخدام',
      'nav.cron_jobs'       : 'Cron Jobs',
      'nav.section.agent'   : 'العميل',
      'nav.agents'          : 'العملاء',
      'nav.skills'          : 'المهارات',
      'nav.nodes'           : 'العقد',
      'nav.section.settings': 'الإعدادات',
      'nav.config'          : 'التهيئة',
      'nav.communications'  : 'التواصل',
      'nav.appearance'      : 'المظهر',
      'nav.automation'      : 'الأتمتة',
      'nav.debug'           : 'تشخيص',
      'nav.docs'            : 'التوثيق',
      'nav.system_active'   : 'النظام نشط',
      'breadcrumb.chat'     : 'محادثة',
      'breadcrumb.search'   : 'بحث',
      'header.search_ph'    : 'بحث',
      'chat.placeholder'    : 'اكتب رسالة… (Enter للإرسال، Shift+Enter لسطر جديد)',
      'chat.welcome_title'  : '.Ouwibo Agent جاهز',
      'chat.welcome_body'   : 'يمكنني مساعدتك في البحث على الويب والحسابات الرياضية.',
      'chat.footer'         : '.قد يخطئ Ouwibo Agent. تحقق من المعلومات المهمة بنفسك',
      'chat.new_session'    : '.بدأت جلسة جديدة',
      'chat.copy'           : 'نسخ',
      'chat.assistant'      : 'المساعد',
      'chat.you'            : 'أنت',
      'chat.new_chat_btn'   : 'محادثة جديدة',
      'chat.err.connect'    : '.لا يمكن الاتصال بالخادم',
      'chat.err.server'     : 'فشل الحصول على استجابة: {detail}',
      'chat.err.invalid'    : '.استجابة غير صالحة من الخادم',
      'chat.err.clipboard'  : '.فشل النسخ إلى الحافظة',
      'search.placeholder'  : '…ابحث عن أي شيء',
      'search.btn'          : 'بحث Ouwibo',
      'search.lucky'        : 'أشعر بالحظ',
      'search.results'      : 'حوالي {count} نتيجة ({time} ثانية)',
      'search.no_results'   : 'لا توجد نتائج لـ "{query}"',
      'search.error'        : '.فشل البحث. حاول مرة أخرى',
      'search.more'         : 'تحميل المزيد',
      'search.loading'      : '…جاري البحث',
      'search.filter.all'   : 'الكل',
      'search.filter.news'  : 'الأخبار',
      'search.filter.images': 'الصور',
      'search.filter.videos': 'الفيديو',
      'search.back_chat'    : 'العودة إلى المحادثة',
      'lang.label'          : 'اللغة',
    },

    // ── 中文 ──────────────────────────────────────────────────────────────────
    zh: {
      'nav.section.chat'    : '聊天',
      'nav.chat'            : '聊天',
      'nav.new_chat'        : '新对话',
      'nav.search'          : '搜索',
      'nav.section.control' : '控制',
      'nav.overview'        : '概览',
      'nav.channels'        : '频道',
      'nav.instances'       : '实例',
      'nav.sessions'        : '会话',
      'nav.usage'           : '使用情况',
      'nav.cron_jobs'       : '定时任务',
      'nav.section.agent'   : '助手',
      'nav.agents'          : '助手',
      'nav.skills'          : '技能',
      'nav.nodes'           : '节点',
      'nav.section.settings': '设置',
      'nav.config'          : '配置',
      'nav.communications'  : '通信',
      'nav.appearance'      : '外观',
      'nav.automation'      : '自动化',
      'nav.debug'           : '调试',
      'nav.docs'            : '文档',
      'nav.system_active'   : '系统运行中',
      'breadcrumb.chat'     : '聊天',
      'breadcrumb.search'   : '搜索',
      'header.search_ph'    : '搜索',
      'chat.placeholder'    : '输入消息…（Enter 发送，Shift+Enter 换行）',
      'chat.welcome_title'  : 'Ouwibo Agent 已就绪。',
      'chat.welcome_body'   : '我可以帮助您进行网络搜索和数学计算。今天我能为您做什么？',
      'chat.footer'         : 'Ouwibo Agent 可能出错。请独立核实重要信息。',
      'chat.new_session'    : '新会话已开始。',
      'chat.copy'           : '复制',
      'chat.assistant'      : '助手',
      'chat.you'            : '您',
      'chat.new_chat_btn'   : '新对话',
      'chat.err.connect'    : '无法连接到服务器。请确保服务器正在运行。',
      'chat.err.server'     : '获取响应失败：{detail}',
      'chat.err.invalid'    : '服务器响应无效。',
      'chat.err.clipboard'  : '复制到剪贴板失败。',
      'search.placeholder'  : '搜索任何内容…',
      'search.btn'          : 'Ouwibo 搜索',
      'search.lucky'        : '手气不错',
      'search.results'      : '约 {count} 条结果（{time} 秒）',
      'search.no_results'   : '"{query}" 没有搜索结果',
      'search.error'        : '搜索失败。请重试。',
      'search.more'         : '加载更多',
      'search.loading'      : '搜索中…',
      'search.filter.all'   : '全部',
      'search.filter.news'  : '新闻',
      'search.filter.images': '图片',
      'search.filter.videos': '视频',
      'search.back_chat'    : '返回聊天',
      'lang.label'          : '语言',
    },

    // ── 日本語 ────────────────────────────────────────────────────────────────
    ja: {
      'nav.section.chat'    : 'チャット',
      'nav.chat'            : 'チャット',
      'nav.new_chat'        : '新しいチャット',
      'nav.search'          : '検索',
      'nav.section.control' : 'コントロール',
      'nav.overview'        : '概要',
      'nav.channels'        : 'チャンネル',
      'nav.instances'       : 'インスタンス',
      'nav.sessions'        : 'セッション',
      'nav.usage'           : '使用状況',
      'nav.cron_jobs'       : 'Cron Jobs',
      'nav.section.agent'   : 'エージェント',
      'nav.agents'          : 'エージェント',
      'nav.skills'          : 'スキル',
      'nav.nodes'           : 'ノード',
      'nav.section.settings': '設定',
      'nav.config'          : '設定',
      'nav.communications'  : '通信',
      'nav.appearance'      : '外観',
      'nav.automation'      : '自動化',
      'nav.debug'           : 'デバッグ',
      'nav.docs'            : 'ドキュメント',
      'nav.system_active'   : 'システム稼働中',
      'breadcrumb.chat'     : 'チャット',
      'breadcrumb.search'   : '検索',
      'header.search_ph'    : '検索',
      'chat.placeholder'    : 'メッセージを入力… (Enter で送信、Shift+Enter で改行)',
      'chat.welcome_title'  : 'Ouwibo Agent の準備ができました。',
      'chat.welcome_body'   : 'ウェブ検索や数学の計算をお手伝いします。何かご用はありますか？',
      'chat.footer'         : 'Ouwibo Agent は誤りを犯す場合があります。重要な情報は独自に確認してください。',
      'chat.new_session'    : '新しいセッションが始まりました。',
      'chat.copy'           : 'コピー',
      'chat.assistant'      : 'アシスタント',
      'chat.you'            : 'あなた',
      'chat.new_chat_btn'   : '新しいチャット',
      'chat.err.connect'    : 'サーバーに接続できません。サーバーが起動しているか確認してください。',
      'chat.err.server'     : '応答の取得に失敗しました: {detail}',
      'chat.err.invalid'    : 'サーバーからの応答が無効です。',
      'chat.err.clipboard'  : 'クリップボードへのコピーに失敗しました。',
      'search.placeholder'  : '何でも検索…',
      'search.btn'          : 'Ouwibo 検索',
      'search.lucky'        : 'ラッキーを感じる',
      'search.results'      : '約 {count} 件の結果（{time} 秒）',
      'search.no_results'   : '"{query}" の検索結果はありません',
      'search.error'        : '検索に失敗しました。もう一度お試しください。',
      'search.more'         : 'さらに読み込む',
      'search.loading'      : '検索中…',
      'search.filter.all'   : 'すべて',
      'search.filter.news'  : 'ニュース',
      'search.filter.images': '画像',
      'search.filter.videos': '動画',
      'search.back_chat'    : 'チャットに戻る',
      'lang.label'          : '言語',
    },

    // ── Français ──────────────────────────────────────────────────────────────
    fr: {
      'nav.section.chat'    : 'Chat',
      'nav.chat'            : 'Chat',
      'nav.new_chat'        : 'Nouveau Chat',
      'nav.search'          : 'Recherche',
      'nav.section.control' : 'Contrôle',
      'nav.overview'        : 'Aperçu',
      'nav.channels'        : 'Canaux',
      'nav.instances'       : 'Instances',
      'nav.sessions'        : 'Sessions',
      'nav.usage'           : 'Utilisation',
      'nav.cron_jobs'       : 'Cron Jobs',
      'nav.section.agent'   : 'Agent',
      'nav.agents'          : 'Agents',
      'nav.skills'          : 'Compétences',
      'nav.nodes'           : 'Nœuds',
      'nav.section.settings': 'Paramètres',
      'nav.config'          : 'Configuration',
      'nav.communications'  : 'Communications',
      'nav.appearance'      : 'Apparence',
      'nav.automation'      : 'Automatisation',
      'nav.debug'           : 'Débogage',
      'nav.docs'            : 'Documentation',
      'nav.system_active'   : 'Système Actif',
      'breadcrumb.chat'     : 'Chat',
      'breadcrumb.search'   : 'Recherche',
      'header.search_ph'    : 'Rechercher',
      'chat.placeholder'    : 'Message Ouwibo… (Entrée pour envoyer, Shift+Entrée nouvelle ligne)',
      'chat.welcome_title'  : 'Ouwibo Agent est prêt.',
      'chat.welcome_body'   : 'Je peux vous aider avec des recherches web et des calculs mathématiques.',
      'chat.footer'         : 'Ouwibo Agent peut faire des erreurs. Vérifiez les informations importantes indépendamment.',
      'chat.new_session'    : 'Nouvelle session démarrée.',
      'chat.copy'           : 'Copier',
      'chat.assistant'      : 'Assistant',
      'chat.you'            : 'Vous',
      'chat.new_chat_btn'   : 'Nouveau Chat',
      'chat.err.connect'    : 'Impossible de se connecter au serveur.',
      'chat.err.server'     : 'Échec de la réponse: {detail}',
      'chat.err.invalid'    : 'Réponse du serveur invalide.',
      'chat.err.clipboard'  : 'Échec de la copie dans le presse-papiers.',
      'search.placeholder'  : "Rechercher n'importe quoi…",
      'search.btn'          : 'Recherche Ouwibo',
      'search.lucky'        : "J'ai de la chance",
      'search.results'      : 'Environ {count} résultats ({time} secondes)',
      'search.no_results'   : 'Aucun résultat pour "{query}"',
      'search.error'        : 'Recherche échouée. Veuillez réessayer.',
      'search.more'         : 'Charger plus',
      'search.loading'      : 'Recherche en cours…',
      'search.filter.all'   : 'Tout',
      'search.filter.news'  : 'Actualités',
      'search.filter.images': 'Images',
      'search.filter.videos': 'Vidéos',
      'search.back_chat'    : 'Retour au Chat',
      'lang.label'          : 'Langue',
    },

    // ── Deutsch ───────────────────────────────────────────────────────────────
    de: {
      'nav.section.chat'    : 'Chat',
      'nav.chat'            : 'Chat',
      'nav.new_chat'        : 'Neuer Chat',
      'nav.search'          : 'Suche',
      'nav.section.control' : 'Steuerung',
      'nav.overview'        : 'Übersicht',
      'nav.channels'        : 'Kanäle',
      'nav.instances'       : 'Instanzen',
      'nav.sessions'        : 'Sitzungen',
      'nav.usage'           : 'Nutzung',
      'nav.cron_jobs'       : 'Cron Jobs',
      'nav.section.agent'   : 'Agent',
      'nav.agents'          : 'Agenten',
      'nav.skills'          : 'Fähigkeiten',
      'nav.nodes'           : 'Knoten',
      'nav.section.settings': 'Einstellungen',
      'nav.config'          : 'Konfiguration',
      'nav.communications'  : 'Kommunikation',
      'nav.appearance'      : 'Erscheinungsbild',
      'nav.automation'      : 'Automatisierung',
      'nav.debug'           : 'Debuggen',
      'nav.docs'            : 'Dokumentation',
      'nav.system_active'   : 'System Aktiv',
      'breadcrumb.chat'     : 'Chat',
      'breadcrumb.search'   : 'Suche',
      'header.search_ph'    : 'Suchen',
      'chat.placeholder'    : 'Nachricht eingeben… (Enter senden, Shift+Enter neue Zeile)',
      'chat.welcome_title'  : 'Ouwibo Agent ist bereit.',
      'chat.welcome_body'   : 'Ich kann bei Websuchen und mathematischen Berechnungen helfen.',
      'chat.footer'         : 'Ouwibo Agent kann Fehler machen. Überprüfen Sie wichtige Informationen unabhängig.',
      'chat.new_session'    : 'Neue Sitzung gestartet.',
      'chat.copy'           : 'Kopieren',
      'chat.assistant'      : 'Assistent',
      'chat.you'            : 'Sie',
      'chat.new_chat_btn'   : 'Neuer Chat',
      'chat.err.connect'    : 'Keine Verbindung zum Server.',
      'chat.err.server'     : 'Antwort fehlgeschlagen: {detail}',
      'chat.err.invalid'    : 'Ungültige Serverantwort.',
      'chat.err.clipboard'  : 'Kopieren in die Zwischenablage fehlgeschlagen.',
      'search.placeholder'  : 'Beliebiges suchen…',
      'search.btn'          : 'Ouwibo Suche',
      'search.lucky'        : 'Auf gut Glück',
      'search.results'      : 'Etwa {count} Ergebnisse ({time} Sekunden)',
      'search.no_results'   : 'Keine Ergebnisse für "{query}"',
      'search.error'        : 'Suche fehlgeschlagen. Bitte erneut versuchen.',
      'search.more'         : 'Mehr laden',
      'search.loading'      : 'Suche läuft…',
      'search.filter.all'   : 'Alle',
      'search.filter.news'  : 'Nachrichten',
      'search.filter.images': 'Bilder',
      'search.filter.videos': 'Videos',
      'search.back_chat'    : 'Zurück zum Chat',
      'lang.label'          : 'Sprache',
    },

    // ── Español ───────────────────────────────────────────────────────────────
    es: {
      'nav.section.chat'    : 'Chat',
      'nav.chat'            : 'Chat',
      'nav.new_chat'        : 'Nuevo Chat',
      'nav.search'          : 'Búsqueda',
      'nav.section.control' : 'Control',
      'nav.overview'        : 'Resumen',
      'nav.channels'        : 'Canales',
      'nav.instances'       : 'Instancias',
      'nav.sessions'        : 'Sesiones',
      'nav.usage'           : 'Uso',
      'nav.cron_jobs'       : 'Cron Jobs',
      'nav.section.agent'   : 'Agente',
      'nav.agents'          : 'Agentes',
      'nav.skills'          : 'Habilidades',
      'nav.nodes'           : 'Nodos',
      'nav.section.settings': 'Configuración',
      'nav.config'          : 'Configuración',
      'nav.communications'  : 'Comunicaciones',
      'nav.appearance'      : 'Apariencia',
      'nav.automation'      : 'Automatización',
      'nav.debug'           : 'Depuración',
      'nav.docs'            : 'Documentación',
      'nav.system_active'   : 'Sistema Activo',
      'breadcrumb.chat'     : 'Chat',
      'breadcrumb.search'   : 'Búsqueda',
      'header.search_ph'    : 'Buscar',
      'chat.placeholder'    : 'Mensaje Ouwibo… (Enter para enviar, Shift+Enter nueva línea)',
      'chat.welcome_title'  : 'Ouwibo Agent está listo.',
      'chat.welcome_body'   : 'Puedo ayudar con búsquedas web y cálculos matemáticos.',
      'chat.footer'         : 'Ouwibo Agent puede cometer errores. Verifica la información importante de forma independiente.',
      'chat.new_session'    : 'Nueva sesión iniciada.',
      'chat.copy'           : 'Copiar',
      'chat.assistant'      : 'Asistente',
      'chat.you'            : 'Usted',
      'chat.new_chat_btn'   : 'Nuevo Chat',
      'chat.err.connect'    : 'No se puede conectar al servidor.',
      'chat.err.server'     : 'Error al obtener respuesta: {detail}',
      'chat.err.invalid'    : 'Respuesta del servidor no válida.',
      'chat.err.clipboard'  : 'Error al copiar al portapapeles.',
      'search.placeholder'  : 'Busca cualquier cosa…',
      'search.btn'          : 'Búsqueda Ouwibo',
      'search.lucky'        : 'Voy a tener suerte',
      'search.results'      : 'Aproximadamente {count} resultados ({time} segundos)',
      'search.no_results'   : 'No hay resultados para "{query}"',
      'search.error'        : 'Búsqueda fallida. Por favor inténtalo de nuevo.',
      'search.more'         : 'Cargar más',
      'search.loading'      : 'Buscando…',
      'search.filter.all'   : 'Todo',
      'search.filter.news'  : 'Noticias',
      'search.filter.images': 'Imágenes',
      'search.filter.videos': 'Vídeos',
      'search.back_chat'    : 'Volver al Chat',
      'lang.label'          : 'Idioma',
    },
  };

  // ── Engine ────────────────────────────────────────────────────────────────
  let _lang = localStorage.getItem('ouwibo_lang') || 'en';

  function t(key, vars) {
    const src = T[_lang] || T.en;
    let str = (src[key] !== undefined) ? src[key] : (T.en[key] !== undefined ? T.en[key] : key);
    if (vars) {
      str = str.replace(/\{(\w+)\}/g, function(_, k) {
        return vars[k] !== undefined ? vars[k] : '{' + k + '}';
      });
    }
    return str;
  }

  function getLang()      { return _lang; }
  function getLanguages() { return LANGS; }

  function setLang(lang) {
    if (!LANGS[lang]) return;
    _lang = lang;
    localStorage.setItem('ouwibo_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir  = LANGS[lang].dir;
    applyAll();
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } }));
  }

  function applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      el.placeholder = t(el.dataset.i18nPh);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  // ── Language Switcher UI ─────────────────────────────────────────────────
  function buildSwitcher(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let open = false;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-[12px] ' +
      'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-colors';

    const dropdown = document.createElement('div');
    dropdown.className = 'hidden absolute bottom-full left-0 right-0 mb-1 bg-zinc-950 ' +
      'border border-zinc-800 rounded-lg overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto';

    function render() {
      const meta = LANGS[_lang];
      btn.innerHTML =
        '<span class="text-base leading-none">' + meta.flag + '</span>' +
        '<span class="flex-1 text-left truncate">' + meta.name + '</span>' +
        '<i class="fa-solid fa-chevron-' + (open ? 'down' : 'up') + ' text-[9px] opacity-60"></i>';

      dropdown.innerHTML = Object.entries(LANGS).map(function(entry) {
        const code = entry[0], info = entry[1];
        const active = code === _lang;
        return '<button type="button" data-lang="' + code + '" ' +
          'class="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-left ' +
          'hover:bg-zinc-800 transition-colors ' + (active ? 'text-zinc-100 bg-zinc-900' : 'text-zinc-400') + '">' +
          '<span class="text-base leading-none">' + info.flag + '</span>' +
          '<span>' + info.name + '</span>' +
          (active ? '<i class="fa-solid fa-check text-[9px] ml-auto text-accent"></i>' : '') +
          '</button>';
      }).join('');
    }

    btn.addEventListener('click', function() {
      open = !open;
      dropdown.classList.toggle('hidden', !open);
      render();
    });

    dropdown.addEventListener('click', function(e) {
      const target = e.target.closest('[data-lang]');
      if (!target) return;
      setLang(target.dataset.lang);
      open = false;
      dropdown.classList.add('hidden');
      render();
    });

    document.addEventListener('click', function(e) {
      if (!container.contains(e.target)) {
        open = false;
        dropdown.classList.add('hidden');
        render();
      }
    });

    container.className = (container.className || '') + ' relative';
    container.appendChild(btn);
    container.appendChild(dropdown);
    render();

    document.addEventListener('i18n:change', render);
  }

  // ── Auto-apply on DOM ready ───────────────────────────────────────────────
  function init() {
    document.documentElement.lang = _lang;
    document.documentElement.dir  = LANGS[_lang] ? LANGS[_lang].dir : 'ltr';
    applyAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  global.i18n = {
    t            : t,
    setLang      : setLang,
    getLang      : getLang,
    getLanguages : getLanguages,
    applyAll     : applyAll,
    buildSwitcher: buildSwitcher,
  };

}(window));
