'use client';

import React from 'react';
import { Search, Bell, MessageSquare } from 'lucide-react';

export default function TopNavbar() {
  return (
    <header className="bg-surface/80 backdrop-blur-md fixed top-0 right-0 h-[64px] left-[280px] border-b border-outline-variant shadow-sm flex justify-between items-center px-6 w-[calc(100%-280px)] z-40">
      <nav className="flex h-full">
        <div className="h-full flex items-center px-4 text-primary font-bold border-b-2 border-primary text-sm">
          Q3 FY24
        </div>
      </nav>

      <div className="flex-1 max-w-md mx-4 relative group focus-within:ring-2 focus-within:ring-primary/20 rounded-lg">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-on-surface-variant w-5 h-5" />
        </div>
        <input 
          type="text" 
          placeholder="Ask AI or search goals..."
          className="w-full bg-surface-container-low border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block pl-10 p-2 transition-colors shadow-sm outline-none"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-[10px] text-outline font-medium border border-outline-variant rounded px-1.5 py-0.5 bg-surface">⌘K</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:text-primary transition-all relative">
          <Bell className="w-6 h-6" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-error ring-2 ring-surface"></span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-all">
          <MessageSquare className="w-6 h-6" />
        </button>
        <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center border border-outline-variant cursor-pointer overflow-hidden">
          <img 
            alt="User Avatar" 
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150"
          />
        </div>
      </div>
    </header>
  );
}
