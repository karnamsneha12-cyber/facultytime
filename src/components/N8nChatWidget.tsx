import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Settings, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink,
  Palette,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export type AssistantTheme = 'midnight' | 'emerald' | 'light' | 'cyberpunk';

interface ThemeConfig {
  id: AssistantTheme;
  name: string;
  tagline: string;
  dotColor: string;
  // Window styling
  windowBg: string;
  windowBorder: string;
  windowShadow: string;
  // Header styling
  headerBg: string;
  headerBorder: string;
  headerTitle: string;
  headerSub: string;
  // Bot avatar
  avatarGradient: string;
  avatarRing: string;
  // Message bubbles
  userBubble: string;
  userText: string;
  botBubble: string;
  botBorder: string;
  botText: string;
  botMeta: string;
  // Input
  inputContainer: string;
  inputBg: string;
  inputText: string;
  inputPlaceholder: string;
  sendBtn: string;
  // Floating trigger
  triggerBg: string;
  triggerBorder: string;
  triggerShadow: string;
  triggerText: string;
  triggerBadge: string;
  // Accent color for icons/links
  accentColor: string;
}

const THEMES: Record<AssistantTheme, ThemeConfig> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight Sapphire',
    tagline: 'Collegiate Navy & Electric Cyan',
    dotColor: 'bg-cyan-400',
    windowBg: 'bg-slate-950/95 backdrop-blur-xl',
    windowBorder: 'border-slate-800/90',
    windowShadow: 'shadow-2xl shadow-cyan-950/30',
    headerBg: 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950',
    headerBorder: 'border-slate-800/80',
    headerTitle: 'text-white',
    headerSub: 'text-slate-400',
    avatarGradient: 'bg-gradient-to-tr from-cyan-500 to-blue-600',
    avatarRing: 'ring-cyan-500/30',
    userBubble: 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-md shadow-blue-500/20',
    userText: 'text-white',
    botBubble: 'bg-slate-900/90 shadow-sm',
    botBorder: 'border-slate-800/90',
    botText: 'text-slate-100',
    botMeta: 'text-slate-400',
    inputContainer: 'bg-slate-950/90 border-slate-800/90 focus-within:border-cyan-500 focus-within:ring-cyan-500/20',
    inputBg: 'bg-slate-900/80',
    inputText: 'text-slate-100',
    inputPlaceholder: 'placeholder-slate-500',
    sendBtn: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-cyan-500/20',
    triggerBg: 'bg-slate-900/95 backdrop-blur-md',
    triggerBorder: 'border-cyan-500/40 hover:border-cyan-400',
    triggerShadow: 'shadow-xl shadow-cyan-950/60',
    triggerText: 'text-white',
    triggerBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentColor: 'text-cyan-400'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Matrix',
    tagline: 'Deep Charcoal & Vivid Mint',
    dotColor: 'bg-emerald-400',
    windowBg: 'bg-zinc-950/95 backdrop-blur-xl',
    windowBorder: 'border-zinc-800/90',
    windowShadow: 'shadow-2xl shadow-emerald-950/30',
    headerBg: 'bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950',
    headerBorder: 'border-zinc-800/80',
    headerTitle: 'text-white',
    headerSub: 'text-zinc-400',
    avatarGradient: 'bg-gradient-to-tr from-emerald-500 to-teal-600',
    avatarRing: 'ring-emerald-500/30',
    userBubble: 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-500/20',
    userText: 'text-white',
    botBubble: 'bg-zinc-900/90 shadow-sm',
    botBorder: 'border-zinc-800/90',
    botText: 'text-zinc-100',
    botMeta: 'text-zinc-400',
    inputContainer: 'bg-zinc-950/90 border-zinc-800/90 focus-within:border-emerald-500 focus-within:ring-emerald-500/20',
    inputBg: 'bg-zinc-900/80',
    inputText: 'text-zinc-100',
    inputPlaceholder: 'placeholder-zinc-500',
    sendBtn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20',
    triggerBg: 'bg-zinc-900/95 backdrop-blur-md',
    triggerBorder: 'border-emerald-500/40 hover:border-emerald-400',
    triggerShadow: 'shadow-xl shadow-emerald-950/60',
    triggerText: 'text-white',
    triggerBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentColor: 'text-emerald-400'
  },
  light: {
    id: 'light',
    name: 'Executive Minimalist',
    tagline: 'Clean White & Oxford Slate',
    dotColor: 'bg-blue-600',
    windowBg: 'bg-white/98 backdrop-blur-xl',
    windowBorder: 'border-slate-200 shadow-2xl',
    windowShadow: 'shadow-2xl shadow-slate-300/40',
    headerBg: 'bg-slate-50/95 border-b border-slate-200',
    headerBorder: 'border-slate-200',
    headerTitle: 'text-slate-900',
    headerSub: 'text-slate-500',
    avatarGradient: 'bg-gradient-to-tr from-blue-600 to-indigo-700',
    avatarRing: 'ring-blue-500/30',
    userBubble: 'bg-blue-600 shadow-md shadow-blue-600/20',
    userText: 'text-white',
    botBubble: 'bg-slate-100/90 shadow-sm',
    botBorder: 'border-slate-200/90',
    botText: 'text-slate-800',
    botMeta: 'text-slate-500',
    inputContainer: 'bg-white border-slate-300 focus-within:border-blue-600 focus-within:ring-blue-600/20',
    inputBg: 'bg-slate-50',
    inputText: 'text-slate-900',
    inputPlaceholder: 'placeholder-slate-400',
    sendBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20',
    triggerBg: 'bg-white/95 backdrop-blur-md',
    triggerBorder: 'border-slate-300 hover:border-blue-600',
    triggerShadow: 'shadow-xl shadow-slate-300/50',
    triggerText: 'text-slate-900',
    triggerBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: 'text-blue-600'
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyber Violet',
    tagline: 'Obsidian & Neon Fuchsia',
    dotColor: 'bg-fuchsia-400',
    windowBg: 'bg-[#0b0816]/95 backdrop-blur-xl',
    windowBorder: 'border-purple-900/50',
    windowShadow: 'shadow-2xl shadow-purple-950/40',
    headerBg: 'bg-gradient-to-r from-[#0b0816] via-[#140c29] to-[#0b0816]',
    headerBorder: 'border-purple-900/50',
    headerTitle: 'text-white',
    headerSub: 'text-purple-300/70',
    avatarGradient: 'bg-gradient-to-tr from-fuchsia-500 to-indigo-600',
    avatarRing: 'ring-fuchsia-500/30',
    userBubble: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-md shadow-purple-500/20',
    userText: 'text-white',
    botBubble: 'bg-[#170e30]/90 shadow-sm',
    botBorder: 'border-purple-900/50',
    botText: 'text-purple-50',
    botMeta: 'text-purple-300/60',
    inputContainer: 'bg-[#0b0816]/90 border-purple-900/50 focus-within:border-fuchsia-500 focus-within:ring-fuchsia-500/20',
    inputBg: 'bg-[#140c29]/80',
    inputText: 'text-purple-100',
    inputPlaceholder: 'placeholder-purple-400/40',
    sendBtn: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20',
    triggerBg: 'bg-[#140c29]/95 backdrop-blur-md',
    triggerBorder: 'border-purple-500/40 hover:border-fuchsia-400',
    triggerShadow: 'shadow-xl shadow-purple-950/60',
    triggerText: 'text-white',
    triggerBadge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    accentColor: 'text-fuchsia-400'
  }
};

const DEFAULT_WEBHOOK_URL = 'https://sneha2330.app.n8n.cloud/webhook/3fd6a8d2-0f01-4c19-a4e2-3ef6731a61c9/chat';
const STORAGE_CHAT_KEY = 'facultyflow_n8n_chat_messages';
const STORAGE_SESSION_KEY = 'facultyflow_n8n_session_id';
const STORAGE_WEBHOOK_KEY = 'facultyflow_n8n_webhook_url';
const STORAGE_MODE_KEY = 'facultyflow_n8n_mode'; // 'prod' | 'test'
const STORAGE_THEME_KEY = 'facultyflow_ai_assistant_theme';

const QUICK_SUGGESTIONS = [
  'What is the timetable for Monday?',
  'Who teaches Computer Networks (CN)?',
  'What time does Period 1 start?',
  'Which subjects are taught in CSM-A?',
  'Give me the room numbers for IRS and CN'
];

export const N8nChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);

  // Assistant theme selection
  const [currentTheme, setCurrentTheme] = useState<AssistantTheme>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY) as AssistantTheme;
    return saved && THEMES[saved] ? saved : 'midnight';
  });

  const theme = THEMES[currentTheme] || THEMES.midnight;

  const handleSelectTheme = (newTheme: AssistantTheme) => {
    setCurrentTheme(newTheme);
    localStorage.setItem(STORAGE_THEME_KEY, newTheme);
    setShowThemePicker(false);
  };
  
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_WEBHOOK_KEY) || DEFAULT_WEBHOOK_URL;
  });
  const [isTestMode, setIsTestMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_MODE_KEY) === 'test' || webhookUrl.includes('/webhook-test/');
  });

  const [sessionId, setSessionId] = useState<string>(() => {
    const existing = localStorage.getItem(STORAGE_SESSION_KEY);
    if (existing) return existing;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_SESSION_KEY, newId);
    return newId;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved chat messages', e);
    }
    return [
      {
        id: 'welcome',
        sender: 'bot',
        text: '👋 **Hello! I am your FacultyFlow Assistant.**\n\nI am connected to your n8n workflow. Ask me anything about faculty schedules, room assignments, bell timings, or classes!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [workflowStatusWarning, setWorkflowStatusWarning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat messages', e);
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Listen to open-n8n-chat event
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      setIsOpen(true);
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      if (customEvent.detail?.prompt) {
        sendMessage(customEvent.detail.prompt);
      }
    };
    window.addEventListener('open-n8n-chat', handleOpenEvent);
    return () => window.removeEventListener('open-n8n-chat', handleOpenEvent);
  }, []);

  // Toggle between production and test webhook URLs
  const handleToggleMode = (testMode: boolean) => {
    setIsTestMode(testMode);
    localStorage.setItem(STORAGE_MODE_KEY, testMode ? 'test' : 'prod');
    
    let newUrl = webhookUrl;
    if (testMode) {
      newUrl = newUrl.replace('/webhook/', '/webhook-test/');
    } else {
      newUrl = newUrl.replace('/webhook-test/', '/webhook/');
    }
    setWebhookUrl(newUrl);
    localStorage.setItem(STORAGE_WEBHOOK_KEY, newUrl);
  };

  const handleResetSession = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newId);
    localStorage.setItem(STORAGE_SESSION_KEY, newId);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: '🔄 **New conversation started.**\n\nHow can I help you with your faculty schedule or classes today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setWorkflowStatusWarning(null);
  };

  const handleClearHistory = () => {
    localStorage.removeItem(STORAGE_CHAT_KEY);
    handleResetSession();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setWorkflowStatusWarning(null);

    try {
      // Determine active target URL
      let targetUrl = webhookUrl.trim();
      if (isTestMode && !targetUrl.includes('/webhook-test/')) {
        targetUrl = targetUrl.replace('/webhook/', '/webhook-test/');
      } else if (!isTestMode && targetUrl.includes('/webhook-test/')) {
        targetUrl = targetUrl.replace('/webhook-test/', '/webhook/');
      }

      const payload = {
        action: 'sendMessage',
        sessionId: sessionId,
        chatInput: query,
        message: query
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'X-Instance-Id': '600571b99d4ef60cc0560477facd9b741ad1871162ba7fcb195ff8858dd78b88'
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMsg = '';
        try {
          const parsed = JSON.parse(responseText);
          errorMsg = parsed.message || parsed.error || responseText;
        } catch {
          errorMsg = responseText;
        }

        if (response.status === 404) {
          const hint = isTestMode
            ? 'n8n test webhook is waiting for execution. Click "Execute workflow" in your n8n canvas.'
            : 'Your n8n workflow is currently INACTIVE. Please toggle the "Active" switch to ON in your n8n workflow top right corner.';
          setWorkflowStatusWarning(hint);
          throw new Error(`HTTP 404: Webhook not found or workflow is inactive.\n\n👉 **To fix**: In your n8n workflow canvas, switch the top-right toggle from **Inactive** to **Active**.`);
        }

        if (response.status === 500) {
          throw new Error(
            `**n8n Workflow Execution Error (Status 500)**: "${errorMsg || 'Error in workflow'}"\n\n` +
            `The message reached your n8n cloud server, but a node inside your canvas encountered an issue.\n\n` +
            `🔍 **How to check and fix in 30 seconds:**\n` +
            `- 1. Open your n8n dashboard: **[sneha2330.app.n8n.cloud](https://sneha2330.app.n8n.cloud)**\n` +
            `- 2. In the left navigation, click **Executions**\n` +
            `- 3. Click the latest item marked in **RED** (Failed)\n` +
            `- 4. Check the red highlighted node (usually AI Model API Key, quota limit, or missing input)`
          );
        }

        throw new Error(`Server returned HTTP ${response.status}: ${errorMsg || response.statusText}`);
      }

      // Parse successful response
      const rawText = await response.text();
      let reply = '';

      try {
        const data = JSON.parse(rawText);
        if (typeof data === 'string') {
          reply = data;
        } else if (Array.isArray(data)) {
          if (data.length > 0) {
            const first = data[0];
            reply = first.output || first.text || first.message || first.response || JSON.stringify(first, null, 2);
          } else {
            reply = 'Received empty response from n8n.';
          }
        } else if (typeof data === 'object' && data !== null) {
          reply = data.output || data.text || data.message || data.response || data.result || JSON.stringify(data, null, 2);
        }
      } catch {
        reply = rawText;
      }

      if (!reply || reply.trim() === '') {
        reply = '✅ Received empty confirmation from n8n.';
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown network error';
      const isWorkflow500 = errorMessage.includes('Status 500');

      const botErrorMessage: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        isError: true,
        text: isWorkflow500
          ? errorMessage
          : `⚠️ **Unable to reach n8n Chatbot**\n\n${errorMessage}\n\n*Check the settings button (⚙️) above to switch between Production and Test webhook mode.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Helper to format simple markdown (bold, lists, code, linebreaks)
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className={`font-bold text-sm ${theme.accentColor} mt-2 mb-1`}>{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className={`font-bold text-base ${theme.headerTitle} mt-2 mb-1`}>{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className={`font-bold text-lg ${theme.headerTitle} mt-2 mb-1`}>{line.replace('# ', '')}</h2>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-2 my-1">
            <span className={`${theme.accentColor} mt-0.5 text-xs`}>•</span>
            <span className="leading-relaxed">{parseInline(bulletText)}</span>
          </div>
        );
      }

      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'my-1 leading-relaxed'}>
          {parseInline(line)}
        </p>
      );
    });
  };

  const parseInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic opacity-90">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
            currentTheme === 'light' ? 'bg-slate-200 text-blue-700' : 'bg-slate-800 text-cyan-300'
          }`}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Chat Button Launcher with New Theme */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-full border transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer ${theme.triggerBg} ${theme.triggerBorder} ${theme.triggerShadow} ${theme.triggerText}`}
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <div className={`w-9 h-9 rounded-full ${theme.avatarGradient} flex items-center justify-center text-white shadow-md group-hover:rotate-12 transition-transform duration-300`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold tracking-wider uppercase flex items-center gap-1 opacity-90">
              <Sparkles className="w-3 h-3 text-amber-400" />
              AI Assistant
            </span>
            <span className="text-xs font-extrabold leading-tight">FacultyFlow Agent</span>
          </div>
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col border rounded-3xl overflow-hidden ${theme.windowBg} ${theme.windowBorder} ${theme.windowShadow} ${
            isExpanded
              ? 'inset-3 sm:inset-6 w-auto h-auto max-w-none'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[430px] h-[620px] max-h-[88vh]'
          }`}
        >
          {/* Header Bar */}
          <div className={`flex items-center justify-between px-4 py-3.5 border-b select-none ${theme.headerBg} ${theme.headerBorder}`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-9 h-9 rounded-2xl ${theme.avatarGradient} flex items-center justify-center shadow-md ring-2 ${theme.avatarRing}`}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-sm tracking-tight ${theme.headerTitle}`}>
                    FacultyFlow AI
                  </h3>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide border ${
                    isTestMode 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {isTestMode ? 'TEST' : 'n8n CLOUD'}
                  </span>
                </div>
                <p className={`text-[11px] ${theme.headerSub}`}>
                  Theme: <span className="font-semibold">{theme.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Theme Picker Switcher Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowThemePicker(!showThemePicker);
                    setShowSettings(false);
                  }}
                  title="Change AI Assistant Theme"
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                    showThemePicker 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : currentTheme === 'light'
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Palette className="w-4 h-4" />
                </button>

                {/* Dropdown for Themes */}
                {showThemePicker && (
                  <div className={`absolute right-0 top-9 w-52 p-2 rounded-2xl border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
                    currentTheme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}>
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700/50 mb-1">
                      Choose Assistant Theme
                    </div>
                    {Object.values(THEMES).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTheme(t.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer text-left ${
                          currentTheme === t.id 
                            ? 'bg-blue-600 text-white font-bold' 
                            : currentTheme === 'light'
                            ? 'hover:bg-slate-100 text-slate-700'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${t.dotColor} border border-white/30`} />
                          <span>{t.name}</span>
                        </div>
                        {currentTheme === t.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Webhook Settings Toggle */}
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowThemePicker(false);
                }}
                title="Webhook settings & mode"
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  showSettings 
                    ? 'bg-blue-600 text-white' 
                    : currentTheme === 'light'
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Refresh / Clear Chat */}
              <button
                onClick={handleResetSession}
                title="Restart conversation"
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  currentTheme === 'light'
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Expand Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore window size' : 'Expand full size'}
                className={`hidden sm:block p-1.5 rounded-xl transition-colors cursor-pointer ${
                  currentTheme === 'light'
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Drawer (Collapsible) */}
          {showSettings && (
            <div className={`p-3.5 border-b text-xs space-y-2.5 animate-fadeIn ${
              currentTheme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950/95 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Webhook Connection Mode</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleMode(false)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                      !isTestMode 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Active / Prod
                  </button>
                  <button
                    onClick={() => handleToggleMode(true)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                      isTestMode 
                        ? 'bg-amber-600 text-white shadow-sm' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Test Mode
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Target Webhook URL:</label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => {
                    setWebhookUrl(e.target.value);
                    localStorage.setItem(STORAGE_WEBHOOK_KEY, e.target.value);
                  }}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                    currentTheme === 'light' 
                      ? 'bg-white border border-slate-300 text-slate-800 focus:border-blue-500' 
                      : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-cyan-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleClearHistory}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear Chat History
                </button>
                <button
                  onClick={() => {
                    setWebhookUrl(DEFAULT_WEBHOOK_URL);
                    localStorage.setItem(STORAGE_WEBHOOK_KEY, DEFAULT_WEBHOOK_URL);
                    setIsTestMode(false);
                    localStorage.setItem(STORAGE_MODE_KEY, 'prod');
                  }}
                  className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                >
                  Reset URL to default
                </button>
              </div>
            </div>
          )}

          {/* Workflow Status Warning banner */}
          {workflowStatusWarning && (
            <div className="bg-amber-950/90 border-b border-amber-600/40 p-3 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-300">n8n Workflow Inactive</p>
                <p className="text-[11px] text-amber-200/90 leading-tight mt-0.5">{workflowStatusWarning}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleMode(true)}
                    className="text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/40 cursor-pointer"
                  >
                    Switch to Test Mode
                  </button>
                  <a
                    href="https://sneha2330.app.n8n.cloud"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-300 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    Open n8n Canvas <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scroll-smooth">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm relative leading-relaxed ${
                      isUser
                        ? `${theme.userBubble} ${theme.userText} rounded-br-xs`
                        : msg.isError
                        ? 'bg-rose-950/80 border border-rose-700/60 text-rose-200 rounded-bl-xs'
                        : `${theme.botBubble} border ${theme.botBorder} ${theme.botText} rounded-bl-xs`
                    }`}
                  >
                    {renderFormattedText(msg.text)}

                    {!isUser && (
                      <div className={`mt-2.5 pt-1.5 border-t border-slate-700/30 flex items-center justify-between text-[11px] ${theme.botMeta}`}>
                        <span>{msg.timestamp}</span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex items-center gap-1 ml-2 cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {isUser && (
                      <div className="text-[10px] text-white/75 text-right mt-1 font-medium">
                        {msg.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Loading indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className={`rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-2 border ${theme.botBubble} ${theme.botBorder}`}>
                  <div className={`w-2 h-2 rounded-full ${theme.dotColor} animate-bounce`} style={{ animationDelay: '0ms' }} />
                  <div className={`w-2 h-2 rounded-full ${theme.dotColor} animate-bounce`} style={{ animationDelay: '150ms' }} />
                  <div className={`w-2 h-2 rounded-full ${theme.dotColor} animate-bounce`} style={{ animationDelay: '300ms' }} />
                  <span className={`text-xs ml-1 font-medium ${theme.botMeta}`}>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          {messages.length <= 2 && !isLoading && (
            <div className={`px-4 py-2.5 border-t ${
              currentTheme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Suggested Prompts:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors text-left cursor-pointer ${
                      currentTheme === 'light'
                        ? 'bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border-slate-200'
                        : 'bg-slate-800/90 hover:bg-slate-700 hover:text-cyan-300 text-slate-300 border-slate-700/80'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form Bar */}
          <div className={`p-3.5 border-t ${theme.headerBg} ${theme.headerBorder}`}>
            <div className={`flex items-center gap-2 border rounded-2xl px-3.5 py-2 transition-all ${theme.inputContainer}`}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about faculty, timetable, rooms..."
                disabled={isLoading}
                className={`flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50 ${theme.inputText} ${theme.inputPlaceholder}`}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className={`p-2 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center cursor-pointer ${theme.sendBtn}`}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className={`flex items-center justify-between mt-2 px-1 text-[11px] ${theme.botMeta}`}>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${theme.dotColor} inline-block`} />
                <span>n8n Assistant Active</span>
              </span>
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
