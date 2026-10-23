import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  Store,
  UserCheck,
} from 'lucide-react';
import { useConvora } from '../../context/ConvoraContext';
import {
  ForgotPasswordSchema,
  LoginInputSchema,
  SignupInputSchema,
} from '../../lib/validation/schemas';

export function AuthScreens() {
  const {
    route,
    navigate,
    locale,
    setLocale,
    dir,
    setIsAuthenticated,
    setActiveUserId,
    setActiveStoreId,
    systemStatus,
  } = useConvora();

  // Forgot password state
  const [recoveryEmail, setRecoveryEmail] = useState('amel@casbah-atelier.dz');
  const [recoveryState, setRecoveryState] = useState<
    'default' | 'loading' | 'error' | 'success' | 'ratelimit' | 'expired'
  >('default');
  const [recoveryErrorMsg, setRecoveryErrorMsg] = useState('');
  const [genericConfirmationMsg, setGenericConfirmationMsg] = useState('');
  const [cooldownSec, setCooldownSec] = useState(0);

  // Login state
  const [loginEmail, setLoginEmail] = useState('amel@casbah-atelier.dz');
  const [loginPassword, setLoginPassword] = useState('ConvoraAlgeria2026!');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupStore, setSignupStore] = useState('');
  const [signupWilaya, setSignupWilaya] = useState('16 - الجزائر العاصمة (Alger)');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryErrorMsg('');

    const validation = ForgotPasswordSchema.safeParse({ email: recoveryEmail });
    if (!validation.success) {
      setRecoveryState('error');
      setRecoveryErrorMsg(
        locale === 'ar'
          ? 'يرجى إدخال عنوان بريد إلكتروني صالح ومكتمل متضمناً اسم النطاق الصحيح (مثل name@store.dz).'
          : 'Veuillez saisir une adresse e-mail valide comprenant un domaine complet (ex. nom@boutique.dz).'
      );
      return;
    }

    setRecoveryState('loading');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: validation.data.email }),
      });
      const json = await res.json();

      if (res.status === 429) {
        setRecoveryState('ratelimit');
        setCooldownSec(json.retryAfterSeconds || 60);
        return;
      }

      if (!res.ok || !json.ok) {
        setRecoveryState('error');
        setRecoveryErrorMsg(
          locale === 'ar' ? json.messageAr : json.messageFr
        );
        return;
      }

      setGenericConfirmationMsg(
        locale === 'ar' ? json.genericMessageAr : json.genericMessageFr
      );
      setRecoveryState('success');
      setCooldownSec(json.cooldownSeconds || 60);
    } catch {
      setRecoveryState('error');
      setRecoveryErrorMsg(
        locale === 'ar'
          ? 'حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
          : 'Erreur de connexion au serveur. Veuillez réessayer.'
      );
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const check = LoginInputSchema.safeParse({
      email: loginEmail,
      password: loginPassword,
    });
    if (!check.success) {
      setLoginError(
        check.error.issues[0]?.message ||
          (locale === 'ar'
            ? 'يرجى التحقق من البريد الإلكتروني وكلمة المرور'
            : 'Veuillez vérifier vos identifiants')
      );
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setLoginError(json.message || 'فشل تسجيل الدخول');
        return;
      }
      setActiveUserId(json.session.userId);
      setActiveStoreId(json.session.storeId);
      setIsAuthenticated(true);
      navigate('/app/inbox');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    const check = SignupInputSchema.safeParse({
      fullName: signupName,
      storeName: signupStore,
      wilaya: signupWilaya,
      email: signupEmail,
      password: signupPassword,
    });
    if (!check.success) {
      setSignupError(
        check.error.issues[0]?.message ||
          (locale === 'ar'
            ? 'يرجى إكمال جميع الحقول المطلوبة بشكل صحيح'
            : 'Veuillez remplir tous les champs obligatoires')
      );
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.data),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setSignupError(json.message || 'تعذر إنشاء الحساب');
        return;
      }
      navigate('/verify-email');
    } finally {
      setSignupLoading(false);
    }
  };

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#F8F7F2] text-[#20231F] flex flex-col justify-between"
    >
      {/* Top Bar */}
      <header className="w-full bg-white border-b border-[#E5E8E2]">
        <div className="h-14 max-w-6xl mx-auto px-6 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => navigate('/app/inbox')}
            className="flex items-center gap-2.5 text-start focus-visible:outline-2 focus-visible:outline-[#202C28] rounded"
          >
            <span className="w-7 h-7 rounded bg-[#202C28] text-white flex items-center justify-center text-sm font-semibold">
              C
            </span>
            <span className="text-sm font-semibold tracking-wider uppercase text-[#202C28]">
              CONVORA
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div
              role="group"
              aria-label="Language switcher"
              className="flex items-center bg-[#F8F7F2] border border-[#E5E8E2] p-0.5 rounded-lg text-xs"
            >
              <button
                type="button"
                onClick={() => setLocale('ar')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  locale === 'ar'
                    ? 'bg-white text-[#20231F] shadow-xs'
                    : 'text-[#737A74] hover:text-[#20231F]'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLocale('fr')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  locale === 'fr'
                    ? 'bg-white text-[#20231F] shadow-xs'
                    : 'text-[#737A74] hover:text-[#20231F]'
                }`}
              >
                FR
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/app/inbox')}
              className="px-3 py-1.5 text-xs font-medium text-[#202C28] bg-[#D9E5D4]/60 hover:bg-[#D9E5D4] rounded-lg transition-colors whitespace-nowrap"
            >
              {locale === 'ar' ? 'فتح مساحة العمل' : 'Ouvrir l’espace marchand'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6">
        <div className="w-full max-w-lg">
          {/* Route Switcher Tabs for Auth Pages */}
          <div className="mb-4 flex items-center justify-between gap-2 bg-white border border-[#E5E8E2] rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors ${
                route === '/login'
                  ? 'bg-[#202C28] text-white'
                  : 'text-[#737A74] hover:text-[#20231F]'
              }`}
            >
              {locale === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors ${
                route === '/signup'
                  ? 'bg-[#202C28] text-white'
                  : 'text-[#737A74] hover:text-[#20231F]'
              }`}
            >
              {locale === 'ar' ? 'إنشاء حساب تاجر' : 'Créer un compte'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors ${
                route === '/forgot-password'
                  ? 'bg-[#202C28] text-white'
                  : 'text-[#737A74] hover:text-[#20231F]'
              }`}
            >
              {locale === 'ar' ? 'استعادة كلمة المرور' : 'Mot de passe oublié'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/verify-email')}
              className={`flex-1 py-1.5 px-2 rounded font-medium transition-colors ${
                route === '/verify-email'
                  ? 'bg-[#202C28] text-white'
                  : 'text-[#737A74] hover:text-[#20231F]'
              }`}
            >
              {locale === 'ar' ? 'تأكيد البريد' : 'Vérification e-mail'}
            </button>
          </div>

          {/* Card Surface */}
          <div className="bg-white border border-[#E5E8E2] rounded-xl overflow-hidden">
            {/* Card Header Strip */}
            <div className="bg-[#F8F7F2] border-b border-[#E5E8E2] px-6 py-3 flex items-center justify-between text-xs text-[#737A74]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-[#202C28]" />
                <span className="font-medium text-[#20231F]">
                  {locale === 'ar'
                    ? 'بوابة مصادقة التجار — CONVORA'
                    : 'Portail d’authentification marchand — CONVORA'}
                </span>
              </div>
              <span className="text-[11px] text-[#737A74]">
                {systemStatus.supabaseConfigured
                  ? locale === 'ar'
                    ? 'Supabase Auth متصل'
                    : 'Supabase Auth actif'
                  : locale === 'ar'
                  ? 'وضع الجلسة المحلية الآمنة'
                  : 'Session locale sécurisée'}
              </span>
            </div>

            {/* ================= FORGOT PASSWORD SCREEN ================= */}
            {route === '/forgot-password' && (
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-[#737A74]">
                    {locale === 'ar'
                      ? 'استرداد وصول التاجر'
                      : 'Récupération d’accès marchand'}
                  </span>
                  <h1 className="text-xl font-semibold text-[#20231F]">
                    {locale === 'ar'
                      ? 'استعادة كلمة المرور'
                      : 'Réinitialisation du mot de passe'}
                  </h1>
                  <p className="text-sm text-[#737A74] leading-relaxed">
                    {locale === 'ar'
                      ? 'أدخل البريد الإلكتروني المسجل لحساب متجرك لإرسال تعليمات إعادة تعيين كلمة المرور.'
                      : 'Saisissez l’adresse e-mail associée à votre boutique pour recevoir les instructions de réinitialisation.'}
                  </p>
                </div>

                {/* State Switcher for Reviewing States */}
                <div
                  role="group"
                  aria-label="Recovery form states"
                  className="flex flex-wrap items-center gap-1 bg-[#F8F7F2] border border-[#E5E8E2] p-1 rounded-lg text-[11px]"
                >
                  {(
                    [
                      { id: 'default', ar: 'النموذج', fr: 'Formulaire' },
                      { id: 'error', ar: 'خطأ التحقق', fr: 'Erreur validation' },
                      { id: 'loading', ar: 'جارٍ المعالجة', fr: 'Chargement' },
                      { id: 'success', ar: 'تأكيد الخصوصية', fr: 'Confirmation' },
                      { id: 'expired', ar: 'رابط منتهي', fr: 'Lien expiré' },
                      { id: 'ratelimit', ar: 'تجاوز الحد', fr: 'Limite atteinte' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setRecoveryState(st.id);
                        if (st.id === 'error' && !recoveryErrorMsg) {
                          setRecoveryErrorMsg(
                            locale === 'ar'
                              ? 'يرجى إدخال عنوان بريد إلكتروني صالح ومكتمل متضمناً اسم النطاق الصحيح.'
                              : 'Veuillez saisir une adresse e-mail valide.'
                          );
                        }
                        if (st.id === 'success' && !genericConfirmationMsg) {
                          setGenericConfirmationMsg(
                            locale === 'ar'
                              ? 'إذا كان هذا البريد الإلكتروني مسجلاً لدينا، ستتلقى رابطاً لإعادة تعيين كلمة المرور خلال دقائق.'
                              : 'Si cette adresse e-mail est associée à un compte, vous recevrez un lien de réinitialisation.'
                          );
                          setCooldownSec(54);
                        }
                      }}
                      className={`px-2 py-1 rounded transition-colors ${
                        recoveryState === st.id
                          ? 'bg-white text-[#20231F] font-semibold shadow-2xs'
                          : 'text-[#737A74] hover:text-[#20231F]'
                      }`}
                    >
                      {locale === 'ar' ? st.ar : st.fr}
                    </button>
                  ))}
                </div>

                {recoveryState === 'error' && (
                  <div
                    role="alert"
                    className="bg-[#DC2626]/8 border border-[#DC2626]/30 text-[#DC2626] p-3.5 rounded-lg flex items-start gap-2.5 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold">
                        {locale === 'ar'
                          ? 'خطأ في صيغة البريد الإلكتروني'
                          : 'Format d’adresse e-mail invalide'}
                      </span>
                      <span>{recoveryErrorMsg}</span>
                    </div>
                  </div>
                )}

                {recoveryState === 'expired' && (
                  <div
                    role="alert"
                    className="bg-[#D97706]/10 border border-[#D97706]/30 text-[#20231F] p-4 rounded-lg flex flex-col gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 font-semibold text-[#D97706]">
                      <Clock className="w-4 h-4" />
                      <span>
                        {locale === 'ar'
                          ? 'انتهت صلاحية رابط الاستعادة'
                          : 'Lien de réinitialisation expiré'}
                      </span>
                    </div>
                    <p className="text-[#737A74] leading-relaxed">
                      {locale === 'ar'
                        ? 'روابط استعادة كلمة المرور صالحة لفترة محدودة فقط وتُستخدم لمرة واحدة. يرجى طلب رابط جديد أدناه.'
                        : 'Les liens de récupération sont à usage unique et expirent rapidement. Veuillez soumettre une nouvelle demande ci-dessous.'}
                    </p>
                  </div>
                )}

                {recoveryState === 'ratelimit' && (
                  <div
                    role="alert"
                    className="bg-[#DC2626]/8 border border-[#DC2626]/30 p-4 rounded-lg flex flex-col gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 font-semibold text-[#DC2626]">
                      <ShieldAlert className="w-4 h-4" />
                      <span>
                        {locale === 'ar'
                          ? 'حماية أمنية: تم تجاوز الحد المسموح من الطلبات'
                          : 'Protection : nombre maximal de tentatives atteint'}
                      </span>
                    </div>
                    <p className="text-[#20231F] leading-relaxed">
                      {locale === 'ar'
                        ? 'تعذر إرسال الطلب مؤقتاً بسبب تكرار المحاولات. يرجى الانتظار قبل المحاولة مجدداً.'
                        : 'Trop de demandes consécutives. Veuillez patienter avant de réessayer.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setRecoveryState('default')}
                      className="h-9 px-3 bg-white border border-[#E5E8E2] rounded-lg font-medium text-[#20231F] hover:bg-[#F8F7F2] flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {locale === 'ar'
                          ? 'العودة إلى النموذج'
                          : 'Retour au formulaire'}
                      </span>
                    </button>
                  </div>
                )}

                {recoveryState === 'loading' && (
                  <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-11 h-11 rounded-full bg-[#D9E5D4] text-[#202C28] flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <span className="text-sm font-semibold text-[#20231F]">
                      {locale === 'ar'
                        ? 'جارٍ التحقق ومعالجة الطلب...'
                        : 'Vérification de la demande en cours...'}
                    </span>
                  </div>
                )}

                {recoveryState === 'success' && (
                  <div className="bg-[#F8F7F2] border border-[#E5E8E2] p-5 rounded-xl flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#D9E5D4] text-[#202C28] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#20231F]">
                          {locale === 'ar'
                            ? 'تم استلام طلب استعادة كلمة المرور'
                            : 'Demande de réinitialisation enregistrée'}
                        </span>
                        <span className="text-xs text-[#737A74]">
                          {systemStatus.supabaseConfigured
                            ? locale === 'ar'
                              ? 'تم تسليم الطلب لمزود المصادقة'
                              : 'Transmis au fournisseur d’authentification'
                            : locale === 'ar'
                            ? 'تم التحقق من الطلب على الخادم (الربط الخارجي للبريد غير مفعّل في هذه البيئة)'
                            : 'Validé côté serveur (envoi d’e-mail externe non configuré dans cet environnement)'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-[#20231F] leading-relaxed">
                      {genericConfirmationMsg}
                    </p>

                    <div className="bg-white border border-[#E5E8E2] p-3 rounded-lg text-xs text-[#737A74] leading-relaxed">
                      <strong className="text-[#20231F]">
                        {locale === 'ar'
                          ? 'حماية خصوصية الحسابات: '
                          : 'Confidentialité des comptes : '}
                      </strong>
                      {locale === 'ar'
                        ? 'لا تكشف CONVORA عما إذا كان البريد الإلكتروني مسجلاً مسبقاً لمنع فحص الحسابات.'
                        : 'CONVORA n’indique jamais si une adresse e-mail est enregistrée afin de prévenir l’énumération des comptes.'}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <span className="text-[#737A74] font-num">
                        {cooldownSec > 0
                          ? locale === 'ar'
                            ? `إعادة المحاولة متاحة بعد ${cooldownSec} ثانية`
                            : `Nouvel envoi possible dans ${cooldownSec}s`
                          : locale === 'ar'
                          ? 'يمكنك طلب رابط جديد الآن'
                          : 'Vous pouvez soumettre une nouvelle demande'}
                      </span>
                      <button
                        type="button"
                        disabled={cooldownSec > 0}
                        onClick={() => setRecoveryState('default')}
                        className="px-3 py-1.5 rounded-lg font-medium border border-[#E5E8E2] bg-white text-[#20231F] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8F7F2]"
                      >
                        {locale === 'ar' ? 'إعادة الإرسال' : 'Renvoyer'}
                      </button>
                    </div>
                  </div>
                )}

                {(recoveryState === 'default' ||
                  recoveryState === 'error' ||
                  recoveryState === 'expired') && (
                  <form
                    onSubmit={handleForgotPasswordSubmit}
                    className="flex flex-col gap-4"
                    noValidate
                  >
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="work-email"
                        className="text-xs font-semibold text-[#20231F] flex items-center justify-between"
                      >
                        <span>
                          {locale === 'ar'
                            ? 'البريد الإلكتروني للعمل'
                            : 'Adresse e-mail professionnelle'}
                        </span>
                        <span className="font-normal text-[#737A74]">
                          {locale === 'ar' ? 'حساب التاجر' : 'Compte marchand'}
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <Mail className="w-4 h-4 text-[#737A74] absolute start-3 pointer-events-none" />
                        <input
                          id="work-email"
                          name="email"
                          type="email"
                          dir="ltr"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="merchant@convora-store.dz"
                          required
                          className="w-full h-10 bg-white border border-[#E5E8E2] rounded-lg ps-9 pe-3 text-sm text-[#20231F] placeholder:text-[#737A74] focus:outline-none focus:ring-2 focus:ring-[#202C28]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-10 bg-[#202C28] hover:bg-[#2C3D38] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span>
                        {locale === 'ar'
                          ? 'إرسال تعليمات استعادة الحساب'
                          : 'Envoyer les instructions de récupération'}
                      </span>
                    </button>
                  </form>
                )}

                <div className="pt-2 border-t border-[#E5E8E2] flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#202C28] hover:underline"
                  >
                    <BackIcon className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'ar'
                        ? 'العودة إلى تسجيل الدخول'
                        : 'Retour à la connexion'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ================= LOGIN SCREEN ================= */}
            {route === '/login' && (
              <div className="p-6 sm:p-8 flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-semibold text-[#20231F]">
                    {locale === 'ar'
                      ? 'تسجيل الدخول إلى متجرك'
                      : 'Connexion à votre boutique'}
                  </h1>
                  <p className="text-sm text-[#737A74]">
                    {locale === 'ar'
                      ? 'إدارة رسائل الزبائن، الردود الذكية، والطلبيات في مكان واحد.'
                      : 'Gérez vos messages clients, brouillons IA et commandes au même endroit.'}
                  </p>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="bg-[#DC2626]/8 border border-[#DC2626]/30 text-[#DC2626] p-3 rounded-lg text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form
                  onSubmit={handleLoginSubmit}
                  className="flex flex-col gap-4"
                  noValidate
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="login-email"
                      className="text-xs font-semibold text-[#20231F]"
                    >
                      {locale === 'ar'
                        ? 'البريد الإلكتروني'
                        : 'Adresse e-mail'}
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      dir="ltr"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E8E2] rounded-lg px-3 text-sm text-[#20231F] focus:outline-none focus:ring-2 focus:ring-[#202C28]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="text-xs font-semibold text-[#20231F]"
                      >
                        {locale === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
                      </label>
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-xs text-[#202C28] hover:underline"
                      >
                        {locale === 'ar'
                          ? 'نسيت كلمة المرور؟'
                          : 'Mot de passe oublié ?'}
                      </button>
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      dir="ltr"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full h-10 bg-white border border-[#E5E8E2] rounded-lg px-3 text-sm text-[#20231F] focus:outline-none focus:ring-2 focus:ring-[#202C28]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full h-10 bg-[#202C28] hover:bg-[#2C3D38] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {locale === 'ar'
                        ? 'دخول إلى صندوق الوارد'
                        : 'Accéder à la boîte de réception'}
                    </span>
                  </button>
                </form>

                {/* Quick Role Demo Presets */}
                <div className="bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3 flex flex-col gap-2 text-xs">
                  <span className="font-medium text-[#20231F]">
                    {locale === 'ar'
                      ? 'حسابات الفريق المتاحة للاختبار (RBAC):'
                      : 'Comptes d’équipe pour tester les permissions (RBAC) :'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLoginEmail('amel@casbah-atelier.dz')}
                      className="px-2.5 py-1 bg-white border border-[#E5E8E2] rounded text-[#20231F] hover:bg-[#D9E5D4]/50"
                    >
                      أمل (Owner — صلاحيات كاملة)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginEmail('karim@casbah-atelier.dz')}
                      className="px-2.5 py-1 bg-white border border-[#E5E8E2] rounded text-[#20231F] hover:bg-[#D9E5D4]/50"
                    >
                      كريم (Agent — محادثات وطلبيات)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginEmail('lina@casbah-atelier.dz')}
                      className="px-2.5 py-1 bg-white border border-[#E5E8E2] rounded text-[#20231F] hover:bg-[#D9E5D4]/50"
                    >
                      لينة (Analyst — قراءة فقط)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SIGNUP SCREEN ================= */}
            {route === '/signup' && (
              <div className="p-6 sm:p-8 flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-semibold text-[#20231F]">
                    {locale === 'ar'
                      ? 'تسجيل متجر إلكتروني جديد'
                      : 'Créer un compte marchand'}
                  </h1>
                  <p className="text-sm text-[#737A74]">
                    {locale === 'ar'
                      ? 'ابدأ بتنظيم رسائل إنستغرام وواتساب لمتجرك في الجزائر.'
                      : 'Centralisez vos messages Instagram et WhatsApp pour votre boutique.'}
                  </p>
                </div>

                {signupError && (
                  <div
                    role="alert"
                    className="bg-[#DC2626]/8 border border-[#DC2626]/30 text-[#DC2626] p-3 rounded-lg text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{signupError}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSignupSubmit}
                  className="flex flex-col gap-3.5"
                  noValidate
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="signup-name"
                        className="text-xs font-semibold text-[#20231F]"
                      >
                        {locale === 'ar' ? 'الاسم الكامل' : 'Nom complet'}
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder={
                          locale === 'ar' ? 'أمل بن يحيى' : 'Amel Benyahia'
                        }
                        className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="signup-store"
                        className="text-xs font-semibold text-[#20231F]"
                      >
                        {locale === 'ar' ? 'اسم المتجر' : 'Nom de la boutique'}
                      </label>
                      <input
                        id="signup-store"
                        type="text"
                        value={signupStore}
                        onChange={(e) => setSignupStore(e.target.value)}
                        placeholder="Casbah Atelier"
                        className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="signup-wilaya"
                      className="text-xs font-semibold text-[#20231F]"
                    >
                      {locale === 'ar' ? 'الولاية' : 'Wilaya'}
                    </label>
                    <input
                      id="signup-wilaya"
                      type="text"
                      value={signupWilaya}
                      onChange={(e) => setSignupWilaya(e.target.value)}
                      className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="signup-email"
                      className="text-xs font-semibold text-[#20231F]"
                    >
                      {locale === 'ar'
                        ? 'البريد الإلكتروني للعمل'
                        : 'Adresse e-mail professionnelle'}
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      dir="ltr"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="contact@mon-atelier.dz"
                      className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="signup-password"
                      className="text-xs font-semibold text-[#20231F]"
                    >
                      {locale === 'ar'
                        ? 'كلمة المرور (8 أحرف على الأقل)'
                        : 'Mot de passe (8 caractères min.)'}
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      dir="ltr"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="h-9 bg-white border border-[#E5E8E2] rounded-lg px-3 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full h-10 mt-1 bg-[#202C28] hover:bg-[#2C3D38] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Store className="w-4 h-4" />
                    <span>
                      {locale === 'ar'
                        ? 'إنشاء حساب المتجر'
                        : 'Créer le compte marchand'}
                    </span>
                  </button>
                </form>
              </div>
            )}

            {/* ================= VERIFY EMAIL SCREEN ================= */}
            {route === '/verify-email' && (
              <div className="p-6 sm:p-8 flex flex-col gap-5 text-center items-center">
                <div className="w-12 h-12 rounded-xl bg-[#D9E5D4] text-[#202C28] flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1.5 max-w-md">
                  <h1 className="text-xl font-semibold text-[#20231F]">
                    {locale === 'ar'
                      ? 'تأكيد عنوان البريد الإلكتروني'
                      : 'Vérification de votre adresse e-mail'}
                  </h1>
                  <p className="text-sm text-[#737A74] leading-relaxed">
                    {locale === 'ar'
                      ? 'لتفعيل مساحة عمل المتجر، يرجى النقر على رابط التأكيد المرسل إلى بريدك الإلكتروني عبر نظام المصادقة.'
                      : 'Pour activer votre espace marchand, cliquez sur le lien de confirmation envoyé par le service d’authentification.'}
                  </p>
                </div>

                <div className="w-full bg-[#F8F7F2] border border-[#E5E8E2] rounded-lg p-3.5 text-xs text-[#737A74] text-start">
                  {systemStatus.supabaseConfigured
                    ? locale === 'ar'
                      ? 'خدمة Supabase Auth متصلة: يرجى مراجعة صندوق الوارد الخاص بك.'
                      : 'Supabase Auth est configuré : vérifiez votre boîte de réception.'
                    : locale === 'ar'
                    ? 'ملاحظة: لم يتم ربط متغيرات بيئة Supabase للبريد الخارجي بعد. يمكنك الانتقال مباشرة إلى مساحة العمل التجريبية.'
                    : 'Note : Supabase Auth externe n’est pas encore configuré dans .env. Vous pouvez accéder directement à l’espace marchand.'}
                </div>

                <div className="flex items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="flex-1 h-10 bg-white border border-[#E5E8E2] text-[#20231F] text-xs font-medium rounded-lg hover:bg-[#F8F7F2]"
                  >
                    {locale === 'ar'
                      ? 'العودة لتسجيل الدخول'
                      : 'Retour à la connexion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/app/inbox')}
                    className="flex-1 h-10 bg-[#202C28] text-white text-xs font-medium rounded-lg hover:bg-[#2C3D38]"
                  >
                    {locale === 'ar'
                      ? 'الدخول إلى مساحة العمل'
                      : 'Ouvrir l’application'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="w-full py-5 border-t border-[#E5E8E2] bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#737A74]">
          <span>
            {locale === 'ar'
              ? '© 2026 CONVORA — منصة إدارة محادثات وطلبيات المتاجر الإلكترونية'
              : '© 2026 CONVORA — Plateforme de messagerie client & commandes'}
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hover:text-[#20231F]"
            >
              {locale === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="hover:text-[#20231F]"
            >
              {locale === 'ar' ? 'استعادة الحساب' : 'Récupération'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
