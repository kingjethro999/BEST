'use client';

import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-latex';

import { useState, useEffect, useCallback } from 'react';
import { Message, ChatResponse, ChatError } from '@/types/chat';
import { apiConfig } from '@/config/api';
import { FileHandler } from '@/utils/fileHandler';
import { chatDB, ChatSession } from '@/utils/db';
import Sidebar from '@/components/Sidebar';
import Image from 'next/image';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('currentMessages');
      return savedMessages ? JSON.parse(savedMessages) : [];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('currentChatId');
    }
    return null;
  });

  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Theme management
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Theme initialization function
  const initializeTheme = useCallback(() => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'system') {
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [theme]);

  useEffect(() => {
    Prism.highlightAll();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setTheme(savedTheme);
    }
    initializeTheme();

    const loadChatSessions = async () => {
      try {
        const sessions = await chatDB.getAllSessions();
        setChatSessions(sessions);
      } catch (err) {
        console.error('Failed to load chat sessions:', err);
      }
    };

    loadChatSessions();
  }, [initializeTheme]);

  // Theme toggle function
  const toggleTheme = () => {
    const themeOrder: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(theme);
    const newTheme = themeOrder[(currentIndex + 1) % themeOrder.length];

    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Apply theme immediately
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (newTheme === 'system') {
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  // Memoize the saveChatSession function with useCallback
  const saveChatSession = useCallback(async () => {
    if (!currentChatId) return;

    try {
      const session: ChatSession = {
        id: currentChatId,
        title: messages[0]?.content.slice(0, 30) + '...' || 'New Chat',
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await chatDB.saveSession(session);
      const sessions = await chatDB.getAllSessions();
      setChatSessions(sessions);
    } catch (err) {
      console.error('Failed to save chat session:', err);
    }
  }, [currentChatId, messages]);

  // Add saveChatSession to the dependency array
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      saveChatSession();
      localStorage.setItem('currentMessages', JSON.stringify(messages));
      localStorage.setItem('currentChatId', currentChatId);
    }
  }, [messages, currentChatId, saveChatSession]);

  const loadChatSession = async (sessionId: string) => {
    try {
      const sessions = await chatDB.getAllSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setMessages(session.messages);
        setCurrentChatId(session.id);
      }
    } catch (err) {
      console.error('Failed to load chat session:', err);
    }
  };

  const deleteChatSession = async (sessionId: string) => {
    try {
      await chatDB.deleteSession(sessionId);
      if (sessionId === currentChatId) {
        handleNewChat();
      }
      const sessions = await chatDB.getAllSessions();
      setChatSessions(sessions);
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && uploadedFiles.length === 0) return;

    if (!currentChatId) {
      setCurrentChatId(Date.now().toString());
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim() + (uploadedFiles.length > 0 ? '\n\nFiles attached: ' +
        uploadedFiles.map(file => `${file.name}`).join(', ')
        : '')
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Process files first
      const fileContents = await Promise.all(
        uploadedFiles.map(async file => {
          const content = await FileHandler.readFileContent(file);
          return { name: file.name, content };
        })
      );

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.openRouterApiKey}`,
          'HTTP-Referer': apiConfig.siteUrl,
          'X-Title': apiConfig.siteName,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages: [...messages, userMessage,
          ...fileContents.map(file => ({
            role: 'user',
            content: `Content of ${file.name}:\n${file.content}`
          }))
          ]
        })
      });

      if (!response.ok) {
        const errorData: ChatError = await response.json();
        const errorMessage = errorData.message || errorData.error || 'Failed to get response';

        // Add error message to chat
        const errorAssistantMessage: Message = {
          role: 'assistant',
          content: `⚠️ Error: ${errorMessage}\n\nPlease try again. If the problem persists, check your internet connection or try again later.`
        };
        setMessages(prev => [...prev, errorAssistantMessage]);
        throw new Error(errorMessage);
      }

      const data: ChatResponse = await response.json();
      const assistantMessage = data.choices[0].message;

      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);
      setUploadedFiles([]);

    } catch (err) {
      console.error('Chat submission error:', err);
      // Only add error message if it wasn't already added in the response.ok check
      if (err instanceof Error && !err.message.includes('Failed to get response')) {
        const errorAssistantMessage: Message = {
          role: 'assistant',
          content: `⚠️ Error: An unexpected error occurred.\n\nPlease try again. If the problem persists, check your internet connection or try again later.`
        };
        setMessages(prev => [...prev, errorAssistantMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const validation = FileHandler.validateFile(file);
    if (!validation.isValid) {
      console.error(validation.error || 'Invalid file');
      return;
    }

    try {
      setUploadedFiles(prev => [...prev, file]);
    } catch {
      console.error('Failed to process file');
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setInput('');
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    localStorage.removeItem('currentMessages');
    localStorage.removeItem('currentChatId');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow-md"
        aria-label="Toggle Theme"
      >
        {theme === 'light' ? '🌞' : theme === 'dark' ? '🌙' : '💻'}
      </button>

      <Sidebar
        isVisible={isSidebarVisible}
        onToggle={() => setIsSidebarVisible(!isSidebarVisible)}
        onNewChat={handleNewChat}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        onSelectChat={loadChatSession}
        onDeleteChat={deleteChatSession}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 sticky top-0 w-full">
          <div className="flex-1"></div>
          <h1 className="text-2xl font-bold flex-1 text-center">BEST</h1>
          <div className="flex-1"></div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          <div className="max-w-3xl mx-auto w-full">
            <div className="p-4 space-y-4 pb-32 h-full">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-200px)] text-center text-gray-600 dark:text-gray-300 space-y-4">
                  <Image src="/favicon.ico" alt="BEST" width={128} height={128} className="mb-4" />
                  <h3 className="text-xl font-semibold">Hey there! 👋</h3>
                  <p className="text-lg">Get started with BEST</p>
                  <div className="space-y-2">
                    <p className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span><strong>B</strong>eyond</span>
                    </p>
                    <p className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span><strong>E</strong>fficient</span>
                    </p>
                    <p className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span><strong>S</strong>mart</span>
                    </p>
                    <p className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.176 0l-3.976 2.888c-.783.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span><strong>T</strong>echnology</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-2xl ${message.role === 'user'
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                    >
                      <div className="font-medium mb-2">
                        {message.role === 'user' ? 'You ' : 'BEST '}:
                      </div>
                      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                        {(() => {
                          const content = message.content;
                          const formattedContent = [];
                          let key = 0;

                          // Split by code blocks first
                          const parts = content.split(/(```[\s\S]*?```)/);

                          for (let i = 0; i < parts.length; i++) {
                            const part = parts[i];

                            // Check if this part is a code block
                            if (part.startsWith('```') && part.endsWith('```')) {
                              // It's a code block
                              const lines = part.split('\n');
                              const langLine = lines[0];
                              const lang = langLine.slice(3).trim();
                              const codeContent = lines.slice(1, -1).join('\n');

                              const highlightedCode = lang && Prism.languages[lang]
                                ? Prism.highlight(codeContent, Prism.languages[lang], lang)
                                : codeContent;

                              formattedContent.push(
                                <pre key={key++} className="!bg-gray-800 !p-4 !rounded-lg overflow-x-auto">
                                  <code
                                    className={`language-${lang}`}
                                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                                  />
                                </pre>
                              );
                            } else if (part.trim()) {
                              // It's regular text - process line by line
                              const lines = part.split('\n');
                              const textContent = [];

                              for (let j = 0; j < lines.length; j++) {
                                const line = lines[j];

                                // Handle headers
                                const headerMatch = line.match(/^(#{1,6})\s(.+)$/);
                                if (headerMatch) {
                                  const level = headerMatch[1].length;
                                  const text = headerMatch[2];

                                  // Instead of dynamic header tags, use className for styling
                                  const headerClass = level === 1 ? 'text-2xl' :
                                    level === 2 ? 'text-xl' :
                                      level === 3 ? 'text-lg' :
                                        level === 4 ? 'text-base font-bold' :
                                          level === 5 ? 'text-sm font-bold' : 'text-xs font-bold';

                                  textContent.push(
                                    <div key={`h-${j}`} className={`${headerClass} font-bold my-2`}>
                                      {text}
                                    </div>
                                  );
                                  continue;
                                }

                                // Handle normal text with inline formatting
                                let formattedLine = line;
                                // Bold
                                formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                // Italic
                                formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
                                // Inline code
                                formattedLine = formattedLine.replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">$1</code>');

                                // Add line with proper handling of empty lines
                                if (formattedLine) {
                                  textContent.push(
                                    <div key={`t-${j}`} dangerouslySetInnerHTML={{ __html: formattedLine }} />
                                  );
                                } else {
                                  textContent.push(<br key={`br-${j}`} />);
                                }
                              }

                              formattedContent.push(
                                <div key={`text-${key++}`} className="space-y-1">
                                  {textContent}
                                </div>
                              );
                            }
                          }

                          return formattedContent;
                        })()}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`sticky bottom-0 bg-white dark:bg-gray-900 p-4 ${!isSidebarVisible ? 'max-w-3xl mx-auto mb-4 rounded-2xl shadow-lg animate-bounce-subtle' : 'border-t border-gray-200 dark:border-gray-700'}`}>
            {/* Horizontal file preview */}
            {uploadedFiles.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Redesigned input form with fixed-position icons */}
            <div className="flex">
              {/* File upload button on the left - fixed height */}
              <div className="flex-shrink-0 self-start">
                <label className="mr-2 cursor-pointer inline-flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" style={{ height: '44px', width: '44px' }}>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </label>
              </div>

              {/* Form with auto-growing text area and fixed send button */}
              <form onSubmit={handleSubmit} className="flex-1 flex">
                {/* Enhanced text area that grows */}
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Auto-resize the textarea
                      e.target.style.height = "44px"; // Reset to default height first
                      // If content exists, grow based on content
                      if (e.target.value) {
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                      }
                      // If empty, it will stay at the default 44px height
                    }}
                    onFocus={(e) => {
                      // Ensure proper height when focused
                      e.target.style.height = "44px";
                      if (e.target.value) {
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                      }
                    }}
                    placeholder="Type your message..."
                    className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
                    rows={1}
                    style={{
                      minHeight: '44px',
                      maxHeight: '200px',
                      overflow: 'auto',
                      transition: 'height 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out'
                    }}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
                    {input.length > 0 && input.length}
                  </div>
                </div>

                {/* Send button on the right - fixed height */}
                <div className="flex-shrink-0 self-start">
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
                    className="ml-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 dark:hover:bg-blue-400 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                    style={{ height: '44px', width: '44px' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}