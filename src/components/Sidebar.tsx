'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatSession } from '@/utils/db';
import Image from 'next/image';

interface SidebarProps {
  isVisible: boolean;
  onToggle: () => void;
  onNewChat?: () => void;
  chatSessions: ChatSession[];
  currentChatId: string | null;
  onSelectChat: (sessionId: string) => void;
  onDeleteChat: (sessionId: string) => void;
}

export default function Sidebar({
  isVisible,
  onToggle,
  onNewChat,
  chatSessions,
  currentChatId,
  onSelectChat,
  onDeleteChat
}: SidebarProps) {
  const [width, setWidth] = useState(300);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = () => {
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-4 z-10 p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-r-lg hover:bg-blue-700 dark:hover:bg-blue-600"
      >
        ☰
      </button>
    );
  }

  return (
    <div
      ref={sidebarRef}
      className="fixed md:relative h-screen bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-60"
      style={{ width: `${width}px` }}
    >
      <div className="flex justify-between items-center p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Image src="/favicon.ico" alt="BEST" width={64} height={64} />
        </div>
        <div className="flex items-center space-x-2">

          <button
            onClick={onNewChat}
            className="p-1 hover:bg-blue-700 dark:hover:bg-blue-600 rounded"
            title="New Chat"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-blue-700 dark:hover:bg-blue-600 rounded"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-6">
            <Image src="/favicon.ico" alt="BEST" width={128} height={128} className="mb-4" />
            <p>Start a new chat!</p>
          </div>
        ) : (
          chatSessions.map((session) => (
            <div
              key={session.id}
              className={`p-3 rounded-lg cursor-pointer transition-all ${currentChatId === session.id
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              onClick={() => onSelectChat(session.id)}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium truncate flex-1">{session.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(session.id);
                  }}
                  className="ml-2 p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(session.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      <div
        className="absolute right-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-400 dark:hover:bg-blue-500"
        onMouseDown={startResizing}
      />
    </div>
  );
}