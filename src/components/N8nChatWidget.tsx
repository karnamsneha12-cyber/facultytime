import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  Trash2, 
  Settings, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  ChevronDown, 
  HelpCircle,
  ExternalLink,
  MessageCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  isError?: boolean;
}

const DEFAULT_WEBHOOK_URL = 'https://sneha2330.app.n8n.cloud/webhook/3fd6a8d2-0f01-4c19-a4e2-3ef6731a61c9/chat';
const STORAGE_CHAT_KEY = 'facultyflow_n8n_chat_messages';
const STORAGE_SESSION_KEY = 'facultyflow_n8n_session_id';
const STORAGE_WEBHOOK_KEY = 'facultyflow_n8n_webhook_url';
const STORAGE_MODE_KEY = 'facultyflow_n8n_mode'; // 'prod' | 'test'

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
        text: '👋 **Hello! I am your FacultyFlow AI Assistant.**\n\nI am connected to your n8n workflow. Ask me anything about faculty schedules, room assignments, bell timings, or classes!',
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

  // Allow triggering chat open from other components via custom event
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

      // n8n Chat Trigger accepts either action/chatInput or message/sessionId
      const payload = {
        action: 'sendMessage',
        sessionId: sessionId,
        chatInput: query,
        message: query
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 404) {
          const hint = isTestMode
            ? 'n8n test webhook is waiting for execution. Click "Execute workflow" in your n8n canvas.'
            : 'Your n8n workflow is currently INACTIVE. Please toggle the "Active" switch to ON in your n8n workflow top right corner.';
          setWorkflowStatusWarning(hint);
          throw new Error(`HTTP 404: Webhook not found or workflow is inactive.\n\n👉 **To fix**: In your n8n workflow canvas, switch the top-right toggle from **Inactive** to **Active**.`);
        }
        throw new Error(`n8n responded with status ${response.status} (${response.statusText})`);
      }

      // Try parsing JSON or text response
      const responseText = await response.text();
      let botResponseText = '';

      try {
        const data = JSON.parse(responseText);
        if (typeof data === 'string') {
          botResponseText = data;
        } else if (Array.isArray(data) && data.length > 0) {
          // Check for output or text property in first element
          botResponseText = data[0].output || data[0].text || data[0].response || data[0].message || JSON.stringify(data[0], null, 2);
        } else if (typeof data === 'object' && data !== null) {
          botResponseText = data.output || data.text || data.response || data.message || data.content || JSON.stringify(data, null, 2);
        } else {
          botResponseText = String(data);
        }
      } catch {
        botResponseText = responseText;
      }

      if (!botResponseText.trim()) {
        botResponseText = "Received empty response from n8n workflow. Make sure your n8n workflow's final node outputs text or an 'output' field.";
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error('n8n Chat Error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: `⚠️ **Unable to reach n8n Chatbot**\n\n${err?.message || 'Network error occurred'}\n\n*Check the settings button (⚙️) above to switch between Production and Test webhook mode.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
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
      // Bold handling
      let formattedLine: React.ReactNode = line;
      
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-sm text-blue-300 mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-base text-blue-200 mt-2 mb-1">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="font-bold text-lg text-white mt-2 mb-1">{line.replace('# ', '')}</h2>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-2 my-0.5">
            <span className="text-blue-400 mt-1">•</span>
            <span>{parseInline(bulletText)}</span>
          </div>
        );
      }

      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'my-0.5 leading-relaxed'}>
          {parseInline(line)}
        </p>
      );
    });
  };

  const parseInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="text-slate-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-slate-800/80 px-1 py-0.5 rounded text-xs text-blue-300 font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20"
          aria-label="Open n8n AI Chatbot"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold tracking-wider uppercase text-blue-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              AI Assistant
            </span>
            <span className="text-sm font-bold leading-tight">Ask n8n Bot</span>
          </div>
        </button>
      )}

      {/* Chat Window Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-8 w-auto h-auto'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border-b border-slate-800 select-none">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm">FacultyFlow AI</h3>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                    isTestMode 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {isTestMode ? 'TEST MODE' : 'n8n CLOUD'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Timetable & Schedule Agent</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                title="Webhook settings & mode"
                className={`p-1.5 rounded-lg transition-colors ${
                  showSettings ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetSession}
                title="Restart conversation"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Restore window size' : 'Expand full screen'}
                className="hidden sm:block p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Drawer (Collapsible) */}
          {showSettings && (
            <div className="bg-slate-950/90 border-b border-slate-800 p-3 text-xs text-slate-300 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Webhook Connection</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleMode(false)}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      !isTestMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Active / Prod
                  </button>
                  <button
                    onClick={() => handleToggleMode(true)}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      isTestMode 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Test Mode
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target Webhook URL:</label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => {
                    setWebhookUrl(e.target.value);
                    localStorage.setItem(STORAGE_WEBHOOK_KEY, e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={sessionId}>
                  Session ID: <code className="text-slate-300">{sessionId.slice(0, 16)}...</code>
                </span>
                <button
                  onClick={() => {
                    setWebhookUrl(DEFAULT_WEBHOOK_URL);
                    localStorage.setItem(STORAGE_WEBHOOK_KEY, DEFAULT_WEBHOOK_URL);
                    setIsTestMode(false);
                    localStorage.setItem(STORAGE_MODE_KEY, 'prod');
                  }}
                  className="text-[11px] text-blue-400 hover:underline"
                >
                  Reset to default
                </button>
              </div>
            </div>
          )}

          {/* Workflow Status Notice (if 404/Inactive detected) */}
          {workflowStatusWarning && (
            <div className="bg-amber-950/80 border-b border-amber-600/40 p-2.5 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-300">n8n Workflow Inactive</p>
                <p className="text-[11px] text-amber-200/90 leading-tight mt-0.5">{workflowStatusWarning}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleMode(true)}
                    className="text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40"
                  >
                    Switch to Test Mode
                  </button>
                  <a
                    href="https://sneha2330.app.n8n.cloud"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-300 hover:underline inline-flex items-center gap-1"
                  >
                    Open n8n Cloud <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm relative ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : msg.isError
                        ? 'bg-rose-950/70 border border-rose-700/60 text-rose-200 rounded-bl-xs'
                        : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {renderFormattedText(msg.text)}

                    {!isUser && (
                      <div className="mt-2 pt-1 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{msg.timestamp}</span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity flex items-center gap-1 ml-2"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
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
                      <div className="text-[10px] text-blue-200/80 text-right mt-1">
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
                <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-slate-400 ml-1">n8n is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Suggestions (if only welcome message) */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80">
              <p className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Suggested Questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 hover:text-blue-300 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700/70 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about faculty, timetable, rooms..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Powered by n8n Workflow
              </span>
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
