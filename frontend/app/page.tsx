'use client';

import React from 'react';
import { ArrowRight, Wand2, BarChart3, AlertTriangle, CheckSquare, Globe, Server, Brain, Target } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-panel h-[64px] px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-primary w-7 h-7" />
          <span className="text-2xl font-bold tracking-tight text-primary">GoalForge AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-on-surface-variant">
          <Link href="#" className="hover:text-primary transition-colors">Platform</Link>
          <Link href="#" className="hover:text-primary transition-colors">Solutions</Link>
          <Link href="#" className="hover:text-primary transition-colors">Resources</Link>
          <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-container hidden md:block">
            Log In
          </Link>
          <Link 
            href="/signup" 
            className="bg-primary text-on-primary text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-primary-container transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="flex-grow pt-[100px] md:pt-[140px] px-4 md:px-8 max-w-[1440px] mx-auto w-full">
        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-16 md:mb-[120px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant text-primary text-xs font-medium mb-6">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>GoalForge AI 2.0 is now live</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-on-background mb-6 leading-tight">
            Transform Goal Tracking Into <br className="hidden md:block"/> Intelligent Performance Execution.
          </h1>
          <p className="text-lg md:text-xl text-on-surface-variant mb-10 max-w-2xl mx-auto">
            Move beyond static OKRs. GoalForge AI actively monitors, predicts risks, and generates actionable insights to ensure your enterprise hits its targets with absolute precision.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link 
              href="/signup" 
              className="w-full md:w-auto bg-primary text-on-primary font-medium px-6 py-3 rounded-lg shadow-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-2 text-center"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/login" 
              className="w-full md:w-auto bg-surface text-primary font-medium px-6 py-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors text-center"
            >
              View Demo
            </Link>
          </div>
        </section>

        {/* Dashboard Preview Hero Image */}
        <section className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-outline-variant mb-[120px]">
          <img 
            alt="Dashboard Preview" 
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBl1rFL0BHkoEQPAMJCDcj9WgeoFMnAqQZZNP3k6eIG2CLVaS2Zc6cx6zNCUn5SLMaKhesYwtUodYW9RL9XB28hTxKLMLxyINRNhmqWQGKjH7zzRpO5anDfKrLxE-aM33ysVz6ws2vf85Ab3n5BoDTuhkXKs495bmYYiWlPLODITKwlaqpevT0AHZEzEpr6AOZCoULrKoB9dZfA081bcBH3wmmRM3AM4zGYH3HtcW85qgvBBFbiS2k8tWuB4epUqIef38xdLCq8Og"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none"></div>
        </section>

        {/* Bento Grid Features */}
        <section className="mb-[120px]">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-on-background mb-4">Intelligence at every node.</h2>
            <p className="text-lg text-on-surface-variant">The systems you need to align, track, and execute with clarity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
            {/* Feature 1: AI Goal Generator */}
            <div className="md:col-span-2 bg-surface rounded-2xl border border-outline-variant p-8 flex flex-col relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="mb-auto z-10">
                <span className="material-symbols-outlined text-primary mb-4 text-[32px]">auto_fix</span>
                <h3 className="text-2xl font-semibold text-on-background mb-2">AI Goal Generator</h3>
                <p className="text-sm text-on-surface-variant max-w-sm">Translate strategic vision into measurable OKRs instantly. Our model structures vague objectives into precise, trackable metrics.</p>
              </div>
              <div className="mt-8 bg-surface-container-lowest rounded-lg border border-outline-variant p-4 shadow-sm z-10 w-3/4 self-end">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">electric_bolt</span>
                  <span className="text-xs font-medium text-on-surface">Suggested Metric:</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-primary w-[75%]"></div>
                </div>
                <p className="text-sm text-on-surface-variant">Increase Q3 Enterprise retention by 15%</p>
              </div>
            </div>

            {/* Feature 2: Risk Prediction */}
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-8 flex flex-col relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
              <div className="mb-auto z-10">
                <span className="material-symbols-outlined text-error mb-4 text-[32px]">warning</span>
                <h3 className="text-2xl font-semibold text-on-background mb-2">Risk Prediction</h3>
                <p className="text-sm text-on-surface-variant">Identify blockers before they derail your timeline.</p>
              </div>
              <div className="mt-8 z-10 flex flex-col gap-2">
                <div className="bg-surface rounded-md p-3 border border-error/20 border-l-2 border-l-error flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-[18px]">trending_down</span>
                  <div className="text-xs font-medium text-on-surface">Resource bottleneck detected in Dev-Team Alpha.</div>
                </div>
              </div>
            </div>

            {/* Feature 3: Smart Reviews */}
            <div className="bg-surface rounded-2xl border border-outline-variant p-8 flex flex-col relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
              <div className="mb-auto z-10">
                <span className="material-symbols-outlined text-secondary mb-4 text-[32px]">fact_check</span>
                <h3 className="text-2xl font-semibold text-on-background mb-2">Smart Reviews</h3>
                <p className="text-sm text-on-surface-variant">Automated performance summaries.</p>
              </div>
            </div>

            {/* Analytics Showcase */}
            <div className="md:col-span-2 bg-surface rounded-2xl border border-outline-variant p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden shadow-sm hover:-translate-y-1 transition-transform duration-300">
              <div className="z-10 flex-1">
                <BarChart3 className="text-primary mb-4 w-8 h-8" />
                <h3 className="text-2xl font-semibold text-on-background mb-2">Deep Analytics</h3>
                <p className="text-sm text-on-surface-variant mb-6">Visualize progress across every layer of your organization. Heatmaps and predictive trend lines replace static spreadsheets.</p>
                <button className="text-primary font-medium hover:underline flex items-center gap-1">
                  Explore Analytics <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-xl border border-outline-variant p-4 flex items-center justify-center relative">
                <div className="w-full h-full flex items-end gap-2 px-2 pb-2">
                  <div className="w-1/6 bg-primary-fixed-dim rounded-t-sm" style={{ height: '40%' }}></div>
                  <div className="w-1/6 bg-primary-fixed-dim rounded-t-sm" style={{ height: '60%' }}></div>
                  <div className="w-1/6 bg-primary rounded-t-sm" style={{ height: '90%' }}></div>
                  <div className="w-1/6 bg-secondary-container rounded-t-sm" style={{ height: '75%' }}></div>
                  <div className="w-1/6 bg-surface-variant rounded-t-sm" style={{ height: '50%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="mb-[120px] py-[80px] bg-surface-container-lowest border-y border-outline-variant relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl font-bold text-on-background mb-16">Built for Scale. Engineered for Speed.</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
              <div className="bg-surface border border-outline-variant rounded-xl p-6 w-full md:w-1/3 shadow-sm relative">
                <Globe className="text-on-surface-variant w-6 h-6 mb-2 mx-auto" />
                <h4 className="text-xl font-semibold text-on-surface mb-1">React Frontend</h4>
                <p className="text-sm text-on-surface-variant">Lightning-fast UI optimized for data-dense rendering.</p>
              </div>
              <ArrowRight className="text-outline w-8 h-8 hidden md:block" />
              <div className="bg-surface border border-outline-variant rounded-xl p-6 w-full md:w-1/3 shadow-sm relative">
                <Server className="text-on-surface-variant w-6 h-6 mb-2 mx-auto" />
                <h4 className="text-xl font-semibold text-on-surface mb-1">FastAPI Backend</h4>
                <p className="text-sm text-on-surface-variant">High-throughput architecture for real-time state sync.</p>
              </div>
              <ArrowRight className="text-outline w-8 h-8 hidden md:block" />
              <div className="bg-surface-container-low border border-primary/30 rounded-xl p-6 w-full md:w-1/3 shadow-sm relative overflow-hidden group">
                <Brain className="text-primary w-6 h-6 mb-2 mx-auto relative z-10" />
                <h4 className="text-xl font-semibold text-primary mb-1 relative z-10">GoalForge AI Layer</h4>
                <p className="text-sm text-on-surface-variant relative z-10">Proprietary LLMs fine-tuned on strategic execution models.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-outline-variant py-8 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Target className="text-on-surface-variant w-5 h-5" />
            <span className="text-sm font-medium text-on-surface-variant">GoalForge AI</span>
          </div>
          <div className="flex gap-6 text-sm text-on-surface-variant">
            <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="#" className="hover:text-primary transition-colors">System Status</Link>
          </div>
        </div>
      </footer>

      {/* Google Fonts & Material Icons - Usually handled in layout.tsx but included for reference */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
    </div>
  );
}
