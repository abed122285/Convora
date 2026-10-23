import React, { useState } from 'react';
import {
  BarChart3,
  Bot,
  Box,
  CheckCircle2,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Radio,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sliders,
  Sparkles,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { type AppRoute, useConvora } from '../../context/ConvoraContext';
import { UI_COPY } from '../../lib/i18n/translations';

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    route,
    navigate,
    locale,
    setLocale,
    dir,
    activeUserId,
    setActiveUserId,
    activeStoreId,
    setActiveStoreId,
    snapshot,
    accessDeniedError,
    actionFeedback,
    clearFeedback,
  } = useConvora();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copy = UI_COPY[locale];
  const unreadTotal =
    snapshot?.conversations.reduce((acc, c) => acc + c.unread_count, 0) ?? 0;
  const draftOrdersCount =
    snapshot?.orders.filter((o) => o.status === 'draft').length ?? 0;

  const navItems: Array<{
    path: AppRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    counter?: number;
  }> = [
    {
      path: '/app/inbox',
      label: copy.nav.inbox,
      icon: Inbox,
      counter: unreadTotal > 0 ? unreadTotal : undefined,
    },
    {
      path: '/app/dashboard',
      label: copy.nav.dashboard,
      icon: LayoutDashboard,
    },
    {
      path: '/app/ai-assistant',
      label: copy.nav.aiAssistant,
      icon: Sparkles,
    },
    {
      path: '/app/orders',
      label: copy.nav.orders,
      icon: ShoppingBag,
      counter: draftOrdersCount > 0 ? draftOrdersCount : undefined,
    },
    {
      path: '/app/leads',
      label: copy.nav.leads,
      icon: Users,
    },
    {
      path: '/app/customers',
      label: copy.nav.customers,
      icon: Users,
    },
    {
      path: '/app/products',
      label: copy.nav.products,
      icon: Box,
    },
    {
      path: '/app/ai-settings',
      label: copy.nav.aiSettings,
      icon: Bot,
    },
    {
      path: '/app/automations',
      label: copy.nav.automations,
      icon: Workflow,
    },
    {
      path: '/app/channels',
      label: copy.nav.channels,
      icon: Radio,
    },
    {
      path: '/app/analytics',
      label: copy.nav.analytics,
      icon: BarChart3,
    },
    {
      path: '/app/settings',
      label: copy.nav.settings,
      icon: Settings,
    },
  ];

  const handleNavClick = (path: AppRoute) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#F8F7F2] text-[#20231F] flex flex-col md:flex-row"
    >
      {/* Desktop Sidebar (Rightmost in RTL, Leftmost in LTR) */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 bg-white border-e border-[#E5E8E2] flex-col justify-between select-none">
        <div className="p-4 flex flex-col gap-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={() => handleNavClick('/app/inbox')}
              className="flex items-center gap-2.5 text-start focus-visible:outline-2 focus-visible:outline-[#202C28] rounded"
            >
              <span className="w-7 h-7 rounded bg-[#202C28] text-white flex items-center justify-center text-sm font-semibold">
                C
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-wider text-[#202C28] leading-none">
                  CONVORA
                </span>
                <span className="text-[11px] text-[#737A74] mt-0.5">
                  {copy.brandPromise}
                </span>
              </div>
            </button>
          </div>

          {/* Active Tenant / Store Card */}
          <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-2.5 flex flex-col gap-1.5">
            <label
              htmlFor="tenant-select"
              className="text-[11px] font-medium text-[#737A74]"
            >
              {locale === 'ar'
                ? 'المتجر الحالي (عزل المستأجرين)'
                : 'Boutique active (Locataire)'}
            </label>
            <select
              id="tenant-select"
              value={activeStoreId}
              onChange={(e) => setActiveStoreId(e.target.value)}
              className="w-full h-8 bg-white border border-[#E5E8E2] rounded px-2 text-xs font-medium text-[#20231F] focus:outline-none focus:ring-1 focus:ring-[#202C28]"
            >
              <option value="store_casbah_atelier">
                دار القصبة — Casbah Atelier (Alger)
              </option>
              <option value="store_oran_beaute">
                Maison Oran (اختبار عزل المتاجر)
              </option>
            </select>
          </div>

          {/* Primary Navigation */}
          <nav
            aria-label={locale === 'ar' ? 'القائمة الرئيسية' : 'Navigation principale'}
            className="flex flex-col gap-0.5"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = route === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#202C28] text-white'
                      : 'text-[#20231F] hover:bg-[#D9E5D4]/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#737A74]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.counter !== undefined && (
                    <span
                      className={`font-num text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                        isActive
                          ? 'bg-[#D9E5D4] text-[#202C28]'
                          : 'bg-[#D9E5D4] text-[#202C28]'
                      }`}
                    >
                      {item.counter}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Role & Auth Switcher */}
        <div className="p-4 border-t border-[#E5E8E2] flex flex-col gap-2.5 bg-[#F8F7F2]/60">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="role-select"
              className="text-[11px] font-medium text-[#737A74]"
            >
              {locale === 'ar'
                ? 'المستخدم الحالي والصلاحية (RBAC)'
                : 'Membre actif & Rôle (RBAC)'}
            </label>
            <select
              id="role-select"
              value={activeUserId}
              onChange={(e) => setActiveUserId(e.target.value)}
              className="w-full h-8 bg-white border border-[#E5E8E2] rounded px-2 text-xs text-[#20231F] focus:outline-none focus:ring-1 focus:ring-[#202C28]"
            >
              <option value="user_amel_owner">
                أمل بن يحيى — Owner (كامل الصلاحيات)
              </option>
              <option value="user_karim_agent">
                كريم منصوري — Agent (الردود والطلبيات)
              </option>
              <option value="user_lina_analyst">
                لينة زروقي — Analyst (قراءة فقط)
              </option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => handleNavClick('/forgot-password')}
              className="text-[11px] text-[#737A74] hover:text-[#20231F] flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>
                {locale === 'ar' ? 'استعادة كلمة المرور' : 'Récupération'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('/login')}
              className="text-[11px] text-[#737A74] hover:text-[#20231F] flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>{locale === 'ar' ? 'تبديل الحساب' : 'Connexion'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Application Header */}
        <header className="h-14 bg-white border-b border-[#E5E8E2] px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label={locale === 'ar' ? 'فتح القائمة' : 'Ouvrir le menu'}
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg border border-[#E5E8E2] text-[#20231F] hover:bg-[#F8F7F2]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="text-sm font-semibold text-[#20231F] truncate">
                {snapshot?.store.name || 'CONVORA'}
              </span>
              {snapshot?.currentMember && (
                <>
                  <span className="text-[#737A74]" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs text-[#737A74] hidden sm:inline">
                    {snapshot.currentMember.full_name} ({snapshot.currentMember.role.toUpperCase()})
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Language & Direction Switcher */}
            <div
              role="group"
              aria-label="Language and direction switcher"
              className="flex items-center bg-[#F8F7F2] border border-[#E5E8E2] p-0.5 rounded-lg text-xs"
            >
              <button
                type="button"
                onClick={() => setLocale('ar')}
                className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                  locale === 'ar'
                    ? 'bg-[#202C28] text-white'
                    : 'text-[#737A74] hover:text-[#20231F]'
                }`}
              >
                العربية (RTL)
              </button>
              <button
                type="button"
                onClick={() => setLocale('fr')}
                className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                  locale === 'fr'
                    ? 'bg-[#202C28] text-white'
                    : 'text-[#737A74] hover:text-[#20231F]'
                }`}
              >
                Français (LTR)
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/app/inbox')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#202C28] hover:bg-[#2C3D38] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>{copy.nav.inbox}</span>
            </button>
          </div>
        </header>

        {/* Global Action Feedback Banner */}
        {actionFeedback && (
          <div
            role="status"
            className={`px-4 py-2.5 border-b text-xs flex items-center justify-between gap-3 ${
              actionFeedback.type === 'error'
                ? 'bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]'
                : 'bg-[#D9E5D4]/70 border-[#202C28]/20 text-[#202C28]'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {actionFeedback.type === 'error' ? (
                <ShieldAlert className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E7D32]" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={clearFeedback}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              {locale === 'ar' ? 'إغلاق' : 'Fermer'}
            </button>
          </div>
        )}

        {/* Cross-Tenant Access Denied Protection State */}
        {accessDeniedError ? (
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="max-w-md w-full bg-white border border-[#DC2626]/40 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 text-[#DC2626]">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <h2 className="text-base font-semibold">
                  {locale === 'ar'
                    ? 'تم حظر الوصول عبر المستأجرين (403 Forbidden)'
                    : 'Accès inter-locataires refusé (403 Forbidden)'}
                </h2>
              </div>
              <p className="text-xs text-[#737A74] leading-relaxed">
                {accessDeniedError}
              </p>
              <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 text-xs text-[#20231F]">
                {locale === 'ar'
                  ? 'حسابك الحالي عضو في "دار القصبة — Casbah Atelier" فقط، ولا يملك عضوية في "Maison Oran Cosmétiques". تم منع الوصول على مستوى الخادم.'
                  : 'Votre compte est uniquement membre de "Casbah Atelier" et ne possède aucun droit sur "Maison Oran Cosmétiques".'}
              </div>
              <button
                type="button"
                onClick={() => setActiveStoreId('store_casbah_atelier')}
                className="h-9 px-4 bg-[#202C28] text-white text-xs font-medium rounded-lg hover:bg-[#2C3D38]"
              >
                {locale === 'ar'
                  ? 'العودة إلى متجري المصرح به (Casbah Atelier)'
                  : 'Revenir à ma boutique autorisée (Casbah Atelier)'}
              </button>
            </div>
          </main>
        ) : (
          <main className="flex-1 flex flex-col min-h-0 overflow-x-hidden">
            {children}
          </main>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full border-e border-[#E5E8E2] p-4 flex flex-col justify-between z-10 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#202C28]">
                  CONVORA
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#737A74] hover:text-[#20231F]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = route === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                        isActive
                          ? 'bg-[#202C28] text-white'
                          : 'text-[#20231F] hover:bg-[#F8F7F2]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.counter !== undefined && (
                        <span className="font-num text-[11px] px-1.5 py-0.5 rounded bg-[#D9E5D4] text-[#202C28] font-semibold">
                          {item.counter}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="pt-4 border-t border-[#E5E8E2] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleNavClick('/forgot-password')}
                className="w-full py-2 text-xs text-start text-[#737A74] hover:text-[#20231F]"
              >
                {locale === 'ar'
                  ? 'شاشة استعادة كلمة المرور'
                  : 'Écran mot de passe oublié'}
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('/login')}
                className="w-full py-2 text-xs text-start text-[#737A74] hover:text-[#20231F]"
              >
                {locale === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
