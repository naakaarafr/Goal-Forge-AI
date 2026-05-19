'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '@/store';

export default function ToastContainer() {
  const notifications = useAppStore(state => state.notifications);
  const removeNotification = useAppStore(state => state.removeNotification);

  // Auto-dismiss logic
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.duration !== 0) { // 0 means persistent
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, notification.duration || 5000);
        return () => clearTimeout(timer);
      }
    });
  }, [notifications, removeNotification]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => {
          const isSuccess = notification.type === 'success';
          const isError = notification.type === 'error';
          const isWarning = notification.type === 'warning';
          const isInfo = notification.type === 'info';

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md ${
                isSuccess ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' :
                isError ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400' :
                isWarning ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isSuccess && <CheckCircle className="w-5 h-5" />}
                {isError && <AlertCircle className="w-5 h-5" />}
                {isWarning && <AlertTriangle className="w-5 h-5" />}
                {isInfo && <Info className="w-5 h-5" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold">{notification.title}</h4>
                {notification.message && (
                  <p className="text-sm opacity-90 mt-0.5">{notification.message}</p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
