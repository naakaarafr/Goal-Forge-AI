'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Save, 
  RotateCcw,
  CheckCircle,
  Mail,
  Cpu,
  Link2
} from 'lucide-react';
import { 
  PageHeader, 
  FormField, 
  FormTextarea, 
  FormSelect, 
  FormSection,
  LoadingState,
  ErrorState
} from '@/components/shared';
import { useSettingsAdmin, useUpdateSettings, SystemSettings } from '@/hooks/api/useAdmin';

const DEFAULT_SETTINGS: SystemSettings = {
  orgName: 'GoalForge AI Corp',
  domainRestriction: 'goalforge.ai',
  defaultCurrency: 'USD',
  autoProvision: true,
  maxGoals: '8',
  minWeightage: '10',
  requireManagerLock: true,
  enableSelfEvaluation: true,
  lateCheckinDays: '7',
  escalationDays: '3',
  autoPingManager: true,
  webhookUrl: 'https://outlook.office.com/webhook/example-entra-integration',
  aiModel: 'gemini-2.0-flash',
  aiTemperature: 0.4,
  aiSystemPrompt: 'You are an elite enterprise goal coaching agent. Help employees construct SMART goals that align with their core thrust areas, ensuring precision, clarity, and metric relevance.',
  enableEntraId: false,
  clientId: '00000000-0000-0000-0000-000000000000',
  tenantId: '11111111-1111-1111-1111-111111111111',
};

export default function SettingsPage() {
  const { data: serverSettings, isLoading, error } = useSettingsAdmin();
  const { mutateAsync: saveSettings } = useUpdateSettings();

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<'org' | 'cycle' | 'escalation' | 'ai' | 'sso'>('org');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Sync settings when loaded from server
  useEffect(() => {
    if (serverSettings) {
      setSettings(serverSettings);
    }
  }, [serverSettings]);

  const handleChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(settings);
      setToastMessage('System settings saved successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setToastMessage('Failed to save settings to database.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (confirm('Are you sure you want to restore default settings? This will overwrite your current configuration.')) {
      setIsSaving(true);
      try {
        await saveSettings(DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
        setToastMessage('Restored to system default settings.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
        setToastMessage('Failed to restore default settings.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const tabs = [
    { id: 'org', label: 'Organization Settings', icon: <Building2 className="w-4 h-4" /> },
    { id: 'cycle', label: 'Goal Cycles & Constraints', icon: <Calendar className="w-4 h-4" /> },
    { id: 'escalation', label: 'Automated Escalations', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'ai', label: 'Gemini AI Configurations', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'sso', label: 'Identity Sync & SSO', icon: <ShieldCheck className="w-4 h-4" /> },
  ] as const;

  if (isLoading) {
    return <LoadingState message="Fetching system settings from database..." />;
  }

  if (error) {
    return <ErrorState message="Could not fetch system settings from database." />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 relative">
      {/* Toast Alert */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl border border-emerald-400/20 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <PageHeader 
        title="Platform Governance & Control" 
        description="Manage organization parameters, enforcement limits, Gemini AI templates, and SSO attributes."
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-2.5 space-y-1 md:col-span-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 text-xs font-black rounded-xl text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Settings Configuration Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:col-span-3 space-y-8 min-h-[460px]">
          
          {/* TAB 1: Organization Settings */}
          {activeTab === 'org' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-250">
              <FormSection 
                title="Profile Details" 
                description="General identity credentials and target registration rules of the organization."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Organization Name"
                    value={settings.orgName}
                    onChange={e => handleChange('orgName', e.target.value)}
                    placeholder="Enter Org Name"
                    required
                  />
                  <FormField
                    label="Target Email Domain Filter"
                    value={settings.domainRestriction}
                    onChange={e => handleChange('domainRestriction', e.target.value)}
                    placeholder="e.g. goalforge.ai"
                    hint="Only members matching this domain extension can join the platform"
                  />
                </div>
              </FormSection>

              <FormSection
                title="Localization & Regional"
                description="Default values used for metrics calculation and reports."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Primary Regional Currency"
                    value={settings.defaultCurrency}
                    onChange={e => handleChange('defaultCurrency', e.target.value)}
                    options={[
                      { value: 'USD', label: 'USD - United States Dollar ($)' },
                      { value: 'EUR', label: 'EUR - Euro (€)' },
                      { value: 'GBP', label: 'GBP - British Pound (£)' },
                      { value: 'INR', label: 'INR - Indian Rupee (₹)' },
                    ]}
                  />
                </div>
              </FormSection>

              <FormSection
                title="Member Provisioning"
                description="Rules for assigning managers and roles to newly added employees."
              >
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-all">
                  <div className="space-y-0.5 max-w-[80%]">
                    <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Auto-Provision SSO Users</span>
                    <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">
                      Automatically create database credentials for users who sign in via SSO if they do not exist already.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.autoProvision}
                      onChange={e => handleChange('autoProvision', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </FormSection>
            </div>
          )}

          {/* TAB 2: Cycle Settings */}
          {activeTab === 'cycle' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-250">
              <FormSection
                title="System Constraints"
                description="Strict platform-enforced compliance boundaries for employees during goal planning phase."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Maximum Goals per Quarter"
                    value={settings.maxGoals}
                    onChange={e => handleChange('maxGoals', e.target.value)}
                    options={[
                      { value: '5', label: '5 Goals max' },
                      { value: '8', label: '8 Goals max (Standard)' },
                      { value: '10', label: '10 Goals max' },
                      { value: '12', label: '12 Goals max' },
                    ]}
                  />
                  <FormSelect
                    label="Minimum Weightage per Goal"
                    value={settings.minWeightage}
                    onChange={e => handleChange('minWeightage', e.target.value)}
                    options={[
                      { value: '5', label: '5% Minimum weightage' },
                      { value: '10', label: '10% Minimum weightage (Standard)' },
                      { value: '15', label: '15% Minimum weightage' },
                      { value: '20', label: '20% Minimum weightage' },
                    ]}
                  />
                </div>
              </FormSection>

              <FormSection
                title="Goal Approval Cycle Workflows"
                description="Define review locks and employee-level editing rules."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-all">
                    <div className="space-y-0.5 max-w-[80%]">
                      <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Manager (L1) Lock Control</span>
                      <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">
                        Goals are automatically locked upon manager approval. Admins are required to force-unlock any goals post-approval.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.requireManagerLock}
                        onChange={e => handleChange('requireManagerLock', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-all">
                    <div className="space-y-0.5 max-w-[80%]">
                      <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Enable Self-Evaluation Phase</span>
                      <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">
                        Prompt employees to log performance self-summaries and rate check-ins before manager review locks.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.enableSelfEvaluation}
                        onChange={e => handleChange('enableSelfEvaluation', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </FormSection>
            </div>
          )}

          {/* TAB 3: Escalation Settings */}
          {activeTab === 'escalation' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-250">
              <FormSection
                title="Overdue Check-in Rules"
                description="Configuration for flagging stale employee milestone goals and triggering automatic email nudges."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Stale Threshold (Days since last Check-in)"
                    value={settings.lateCheckinDays}
                    onChange={e => handleChange('lateCheckinDays', e.target.value)}
                    options={[
                      { value: '5', label: '5 Days without update' },
                      { value: '7', label: '7 Days without update (Standard)' },
                      { value: '10', label: '10 Days without update' },
                      { value: '14', label: '14 Days without update' },
                    ]}
                  />
                  <FormSelect
                    label="Level 1 Escalation Timeout"
                    value={settings.escalationDays}
                    onChange={e => handleChange('escalationDays', e.target.value)}
                    options={[
                      { value: '1', label: '1 Day past overdue' },
                      { value: '3', label: '3 Days past overdue (Standard)' },
                      { value: '5', label: '5 Days past overdue' },
                      { value: '7', label: '7 Days past overdue' },
                    ]}
                  />
                </div>
              </FormSection>

              <FormSection
                title="Integrations & Delivery Channels"
                description="Configure automated alerting platforms for platform governance escalations."
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-all">
                    <div className="flex gap-3 max-w-[80%]">
                      <Mail className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Direct Manager Email Pings</span>
                        <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">
                          Send direct SMTP alert emails to Level 1 and Level 2 managers when an escalation is officially logged.
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.autoPingManager}
                        onChange={e => handleChange('autoPingManager', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <Link2 className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Enterprise Webhook Integration URL</span>
                    </div>
                    <FormField
                      label="Incoming Webhook URL"
                      value={settings.webhookUrl}
                      onChange={e => handleChange('webhookUrl', e.target.value)}
                      placeholder="e.g. https://outlook.office.com/webhook/..."
                      hint="Supports Microsoft Teams and Slack payloads for active cycle updates."
                    />
                  </div>
                </div>
              </FormSection>
            </div>
          )}

          {/* TAB 4: Gemini AI Settings */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-250">
              <FormSection
                title="Model Configuration"
                description="Select downstream LLM specifications powering the AI Goal Generation Assistant."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Gemini Model Class"
                    value={settings.aiModel}
                    onChange={e => handleChange('aiModel', e.target.value)}
                    options={[
                      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
                      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
                      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                    ]}
                  />

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="block text-xs font-black text-slate-600 uppercase tracking-wider">Creative Temperature</span>
                      <span className="text-[10px] font-bold text-indigo-600">{settings.aiTemperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={settings.aiTemperature}
                      onChange={e => handleChange('aiTemperature', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                      Lower values enforce strict goal formats, while higher values generate diverse metrics.
                    </p>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="System Prompt Preamble"
                description="Custom directives embedded inside AI assistant requests to enforce unique org-wide goal-writing parameters."
              >
                <FormTextarea
                  label="Core System Directive"
                  value={settings.aiSystemPrompt}
                  onChange={e => handleChange('aiSystemPrompt', e.target.value)}
                  maxLength={400}
                  rows={4}
                  hint="Instruct the AI generator on organization alignment, naming constraints, or metric standards."
                />
              </FormSection>
            </div>
          )}

          {/* TAB 5: SSO / Entra ID Settings */}
          {activeTab === 'sso' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-250">
              <FormSection
                title="Identity Provider Settings"
                description="Direct configuration linking GoalForge AI to your Microsoft Azure Active Directory or custom SSO."
              >
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-all mb-4">
                  <div className="flex gap-3 max-w-[80%]">
                    <Cpu className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <span className="block text-xs font-black text-slate-700 uppercase tracking-wider">Enable Microsoft Entra ID (Azure AD)</span>
                      <span className="block text-[10px] text-slate-400 font-semibold leading-relaxed">
                        Route organization identity syncs and user provisioning streams securely through Microsoft Entra ID endpoints.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.enableEntraId}
                      onChange={e => handleChange('enableEntraId', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {settings.enableEntraId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-3 duration-250">
                    <FormField
                      label="Application (Client) ID"
                      value={settings.clientId}
                      onChange={e => handleChange('clientId', e.target.value)}
                      placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                      required
                    />
                    <FormField
                      label="Directory (Tenant) ID"
                      value={settings.tenantId}
                      onChange={e => handleChange('tenantId', e.target.value)}
                      placeholder="e.g. 11111111-1111-1111-1111-111111111111"
                      required
                    />
                  </div>
                )}
              </FormSection>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
