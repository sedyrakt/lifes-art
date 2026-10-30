// src/pages/LicenseGateScreen.tsx
// ⭐ INDIGO (#4F46E5) + SLATE (#0F172A) DARK MODE
// ⭐ FIX: Left panel background — dark: #0F172A / light: #EEF2FF
// ⭐ FIX: Copyright padding = mt-6 (fa tsy mt-auto) mba tsy hisy malalaka be
// ⭐ FIX: ESORINA ny Support/Acheter buttons, "Code d'activation" display, Conditions/Support links
// ⭐ DESIGN PRO: layout madio, spacing tsara, hiérarchie mazava, badges raffinés

import React, { useEffect, useState } from 'react';
import {
  ArrowRight, Cloud, CreditCard, KeyRound, Loader2,
  Moon, ShieldCheck, Sun, XCircle, Zap, Sparkles, BadgeCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLicense } from '../contexts/LicenseContext';
import { useAuth } from '../contexts/AuthContext';
import SuccessModal from '../components/common/SuccessModal';
import ErrorModal from '../components/common/ErrorModal';

const LOGO_DARK = './images/logodark.png';
const LOGO_LIGHT = './images/logolight.png';
const MINIATURE_DARK_PATH = './images/licensedark.jpeg';
const MINIATURE_LIGHT_PATH = './images/licenselight.jpeg';

// ════════════════════════════════════════════════════════════
// FORM INPUT
// ════════════════════════════════════════════════════════════
const FormInput: React.FC<{
  label: string;
  name?: string;
  value: string;
  placeholder?: string;
  type?: string;
  icon: React.ElementType;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, name, value, placeholder, type = 'text', icon: Icon, error, disabled, autoComplete, onChange }) => {
  const { isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  const borderColor = hasError ? '#FCA5A5' : focused ? '#4F46E5' : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? 'transparent' : '#FFFFFF';

  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={name} className="mb-1.5 block text-[13px] font-semibold leading-tight tracking-wide" style={{ color: mutedColor }}>
          {label}
        </label>
      )}
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors"
          style={{ color: focused ? '#4F46E5' : isDark ? '#64748B' : '#94A3B8' }}
        />
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-11 w-full rounded-lg border pl-10 pr-3 text-[14px] font-medium leading-tight outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: inputBg,
            color: textColor,
            borderColor,
            boxShadow: focused && !hasError ? '0 0 0 3px rgba(79,70,229,0.12)' : 'none',
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-[12.5px] font-medium leading-tight text-red-500">{error}</p>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// SKELETON
// ════════════════════════════════════════════════════════════
const SkeletonLicense = () => {
  const { isDark } = useTheme();
  const bgColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const borderColor = isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1';
  const leftPanelBg = isDark ? '#0F172A' : '#EEF2FF';
  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg ${className}`} style={{ background: bgColor }} />
  );

  return (
    <div className={`flex min-h-screen w-full items-center justify-center p-3 ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
      <div className="flex w-full max-w-[1000px] overflow-hidden rounded-2xl border" style={{ background: isDark ? '#0F172A' : '#FFFFFF', borderColor, boxShadow: isDark ? '0 20px 50px -12px rgba(0,0,0,0.6)' : '0 20px 50px -12px rgba(79,70,229,0.25)' }}>
        <div className="hidden w-1/2 flex-col justify-between border-r p-6 lg:flex" style={{ background: leftPanelBg, borderColor }}>
          <div>
            <div className="mb-4 flex items-center gap-2.5"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-3.5 w-20" /></div>
            <Skeleton className="mb-2 h-7 w-40" /><Skeleton className="h-3.5 w-56" />
          </div>
          <div className="space-y-2.5"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-3.5 w-32" /><Skeleton className="h-9 w-full" /></div>
        </div>
        <div className="flex w-full flex-col justify-center p-6 lg:w-1/2">
          <div className="space-y-3.5"><Skeleton className="h-7 w-40" /><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /><Skeleton className="h-3.5 w-28" /><Skeleton className="h-9 w-full" /></div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
const LicenseGateScreen: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const {
    status: licenseStatus,
    isValid: licenseIsValid,
    isActive: licenseIsActive,
    packageName,
    licenseKey: currentLicenseKey,
    daysRemaining,
    isTest,
    isLifetime,
    expirationDate,
    isLoading: licenseLoading,
    activateWithCode,
    reset,
  } = useLicense();

  const [activationCode, setActivationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);

  const logoSrc = isDark ? LOGO_DARK : LOGO_LIGHT;
  const backgroundImage = "url('./images/abstract3.jpeg')";

  const bgOverlay = isDark
    ? 'linear-gradient(to right, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.55) 100%)'
    : 'linear-gradient(to right, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.35) 100%)';

  const surface = isDark ? '#0F172A' : '#FFFFFF';

  // ⭐ Left panel background — #0F172A (dark) / #EEF2FF (light)
  const leftPanelBg = isDark ? '#0F172A' : '#EEF2FF';

  // ⭐ Left panel text colors (adaptatif dark/light)
  const leftTextPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const leftTextSecondary = isDark ? '#94A3B8' : '#64748B';
  const leftBorderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)';
  const leftBoxBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.55)';
  const leftImageBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.75)';

  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';

  const shadow = isDark ? '0 25px 60px -15px rgba(0,0,0,0.7)' : '0 25px 60px -15px rgba(79,70,229,0.20)';
  const primaryBg = isDark ? 'rgba(79,70,229,0.15)' : 'rgba(79,70,229,0.08)';

  const licenseFeatures = [
    "Activation sécurisée & cryptée.",
    "Packages illimités.",
    "Validité contrôlée en temps réel.",
  ];

  const licenseBadges = [
    { icon: ShieldCheck, title: 'Crypté', color: '#4F46E5' },
    { icon: KeyRound, title: 'Sécurisé', color: '#10B981' },
    { icon: CreditCard, title: 'Valide', color: '#F59E0B' },
    { icon: Zap, title: 'Illimité', color: '#06B6D4' }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isPageLoading || licenseLoading) return;
    if (!licenseIsValid || !licenseIsActive) return;
    navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true });
  }, [licenseIsValid, licenseIsActive, isAuthenticated, isPageLoading, licenseLoading, navigate]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!activationCode.trim()) {
      setError("Veuillez entrer votre code d'activation.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await activateWithCode(activationCode.trim());
      if (result.success) {
        setSuccessMessage('Licence activée avec succès ! Redirection...');
        setShowSuccess(true);
        setTimeout(() => {
          navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true });
        }, 2500);
      } else {
        setError(result.message || "Code d'activation invalide");
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de l'activation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetLicense = async () => {
    try {
      await reset();
      setActivationCode('');
      setError(null);
      setShowSuccess(false);
      setSuccessMessage('');
    } catch {
      setError('Impossible de réinitialiser la licence.');
    }
  };

  if (isPageLoading || (licenseLoading && !licenseIsValid)) {
    return <SkeletonLicense />;
  }

  // ═══════════════════════════════════════════════════════════
  // VUE LICENCE ACTIVE
  // ═══════════════════════════════════════════════════════════
  if (licenseIsValid && licenseIsActive) {
    const expiryDate = expirationDate ? new Date(expirationDate) : null;
    const formattedExpiry = expiryDate
      ? expiryDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Jamais';

    return (
      <div className="relative flex min-h-screen w-full items-center justify-center p-3 bg-cover bg-center" style={{ backgroundImage, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: bgOverlay }} />

        <button
          type="button"
          onClick={toggleTheme}
          className="fixed right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:scale-105"
          style={{ background: surface, borderColor, color: '#4F46E5', boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.4)' : '0 4px 15px rgba(79,70,229,0.1)' }}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative z-10 flex w-full max-w-[1000px] overflow-hidden rounded-2xl border" style={{ background: surface, borderColor, boxShadow: shadow }}>

          {/* LEFT PANEL — #0F172A (dark) / #EEF2FF (light) */}
          <div className="hidden w-1/2 flex-col justify-between border-r p-6 lg:flex" style={{ background: leftPanelBg, borderColor: leftBorderColor }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #4F46E5, #4338CA)', boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }}>
                    <Cloud className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-[16px] font-bold leading-tight" style={{ color: leftTextPrimary }}>Life's Art ERP</h1>
                    <p className="text-[12px] font-medium leading-tight tracking-wide" style={{ color: leftTextSecondary }}>ENTERPRISE SOLUTION</p>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.15)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#10B981' }} />
                    <span className="text-[11.5px] font-semibold leading-none" style={{ color: '#10B981' }}>LICENCE ACTIVE</span>
                  </div>
                  <h2 className="text-[22px] font-bold leading-tight" style={{ color: leftTextPrimary }}>
                    Votre licence est<br />prête à l'emploi
                  </h2>
                  <p className="mt-1.5 text-[13.5px] leading-snug" style={{ color: leftTextSecondary }}>
                    Profitez de toutes les fonctionnalités de Life's Art ERP.
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border mx-auto w-full max-w-[380px]" style={{ borderColor: leftBorderColor, background: leftImageBg, boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.4)' : '0 4px 15px rgba(79,70,229,0.08)' }}>
                <img src={isDark ? MINIATURE_DARK_PATH : MINIATURE_LIGHT_PATH} alt="Dashboard Preview" className="w-full h-auto object-contain max-h-[200px]" />
              </div>

              <div className="space-y-2">
                {licenseFeatures.map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <BadgeCheck size={16} className="mt-0.5 shrink-0" style={{ color: licenseBadges[i % 4].color }} />
                    <span className="text-[13.5px] leading-snug" style={{ color: leftTextSecondary }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {licenseBadges.map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2.5" style={{ borderColor: leftBorderColor, background: leftBoxBg }}>
                  <item.icon size={14} style={{ color: item.color }} />
                  <span className="text-[12.5px] font-semibold leading-tight truncate" style={{ color: leftTextPrimary }}>{item.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="flex w-full flex-col gap-4 p-6 lg:w-1/2" style={{ background: surface }}>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #4F46E5, #4338CA)' }}>
                <Cloud className="h-4 w-4 text-white" />
              </div>
              <span className="text-[15px] font-bold leading-tight" style={{ color: textColor }}>Life's Art</span>
            </div>

            <div className="flex flex-col items-center gap-3">
              {!logoError && (
                <img
                  src={logoSrc}
                  alt="Life's Art"
                  className="h-[52px] w-auto object-contain"
                  onError={() => setLogoError(true)}
                  draggable={false}
                />
              )}

              <div className="text-center">
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)' }}>
                  <Sparkles size={12} style={{ color: '#10B981' }} />
                  <span className="text-[11px] font-bold leading-none tracking-wide" style={{ color: '#10B981' }}>ACTIVÉE</span>
                </div>
                <h1 className="text-[22px] font-bold" style={{ color: textColor }}>Licence Active</h1>
                <p className="mt-1 text-[13.5px]" style={{ color: mutedColor }}>Merci d'utiliser Life's Art ERP</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border p-3.5" style={{ borderColor, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide leading-tight" style={{ color: mutedColor }}>Plan</p>
                  <p className="mt-1 text-[15px] font-bold capitalize leading-tight" style={{ color: '#4F46E5' }}>{packageName || 'Non spécifié'}</p>
                </div>
                <div className="rounded-xl border p-3.5" style={{ borderColor, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide leading-tight" style={{ color: mutedColor }}>Expire le</p>
                  <p className="mt-1 text-[15px] font-bold leading-tight" style={{ color: textColor }}>{isLifetime ? 'Illimitée' : formattedExpiry}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border p-3 text-center" style={{ borderColor, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide leading-tight" style={{ color: mutedColor }}>Type</p>
                  <p className="mt-1 text-[14px] font-bold leading-tight" style={{ color: textColor }}>{isTest ? 'Test' : isLifetime ? 'Lifetime' : 'Standard'}</p>
                </div>
                <div className="rounded-xl border p-3 text-center" style={{ borderColor, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide leading-tight" style={{ color: mutedColor }}>Jours restants</p>
                  <p className="mt-1 text-[14px] font-bold leading-tight" style={{ color: textColor }}>{isLifetime ? '∞' : daysRemaining}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 mt-1">
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true })}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold text-white transition-all hover:opacity-95 bg-brand-500 hover:bg-brand-600"
                style={{ boxShadow: '0 6px 16px rgba(79,70,229,0.28)' }}
              >
                {isAuthenticated ? 'Accéder au Dashboard' : 'Se connecter'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={handleResetLicense}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-medium transition-all hover:opacity-80"
                style={{ background: 'transparent', color: '#EF4444', border: `1px solid rgba(239,68,68,0.25)` }}
              >
                <XCircle className="h-4 w-4" /> Réinitialiser la licence
              </button>
            </div>

            {/* ⭐ Copyright — mt-6 (fa tsy mt-auto) */}
            <div className="flex items-center justify-center border-t pt-4 mt-6" style={{ borderColor }}>
              <span className="text-[12px]" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>© 2026 Life's Art ERP</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VUE ACTIVATION
  // ═══════════════════════════════════════════════════════════
  const isExpired = licenseStatus === 'EXPIRED';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-3 bg-cover bg-center" style={{ backgroundImage, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0" style={{ background: bgOverlay }} />

      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm" style={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)' }}>
          <div className="w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border p-6 text-center" style={{ background: surface, borderColor, boxShadow: shadow }}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: primaryBg }}>
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            </div>
            <div className="text-[15px] font-semibold leading-tight" style={{ color: textColor }}>Activation en cours</div>
            <div className="mt-1 text-[13.5px] leading-snug" style={{ color: mutedColor }}>Vérification de votre licence...</div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleTheme}
        className="fixed right-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:scale-105"
        style={{ background: surface, borderColor, color: '#4F46E5', boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.4)' : '0 4px 15px rgba(79,70,229,0.1)' }}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative z-10 flex w-full max-w-[1000px] overflow-hidden rounded-2xl border" style={{ background: surface, borderColor, boxShadow: shadow }}>

        {/* LEFT PANEL — #0F172A (dark) / #EEF2FF (light) */}
        <div className="hidden w-1/2 flex-col justify-between border-r p-6 lg:flex" style={{ background: leftPanelBg, borderColor: leftBorderColor }}>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #4F46E5, #4338CA)', boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }}>
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-[16px] font-bold leading-tight" style={{ color: leftTextPrimary }}>Life's Art ERP</h1>
                  <p className="text-[12px] font-medium leading-tight tracking-wide" style={{ color: leftTextSecondary }}>ENTERPRISE SOLUTION</p>
                </div>
              </div>

              <div className="pt-1">
                <h2 className="text-[22px] font-bold leading-tight" style={{ color: leftTextPrimary }}>
                  {isExpired ? 'Licence expirée' : 'Activez votre licence'}
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-snug" style={{ color: leftTextSecondary }}>
                  {isExpired
                    ? "Votre licence a expiré. Contactez l'administrateur."
                    : 'Débloquez toutes les fonctionnalités de la plateforme.'}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border mx-auto w-full max-w-[380px]" style={{ borderColor: leftBorderColor, background: leftImageBg, boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.4)' : '0 4px 15px rgba(79,70,229,0.08)' }}>
              <img src={isDark ? MINIATURE_DARK_PATH : MINIATURE_LIGHT_PATH} alt="Dashboard Preview" className="w-full h-auto object-contain max-h-[200px]" />
            </div>

            <div className="space-y-2">
              {licenseFeatures.map((text, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <BadgeCheck size={16} className="mt-0.5 shrink-0" style={{ color: licenseBadges[i % 4].color }} />
                  <span className="text-[13.5px] leading-snug" style={{ color: leftTextSecondary }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {licenseBadges.map((item, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2.5" style={{ borderColor: leftBorderColor, background: leftBoxBg }}>
                <item.icon size={14} style={{ color: item.color }} />
                <span className="text-[12.5px] font-semibold leading-tight truncate" style={{ color: leftTextPrimary }}>{item.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex w-full flex-col gap-4 p-6 lg:w-1/2" style={{ background: surface }}>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #4F46E5, #4338CA)' }}>
              <Cloud className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold leading-tight" style={{ color: textColor }}>Life's Art</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            {!logoError && (
              <img
                src={logoSrc}
                alt="Life's Art"
                className="h-[60px] w-auto object-contain"
                onError={() => setLogoError(true)}
                draggable={false}
              />
            )}

            <div className="text-center">
              <h1 className="text-[22px] font-bold" style={{ color: textColor }}>
                {isExpired ? 'Licence expirée' : 'Activation de licence'}
              </h1>
              <p className="mt-1 text-[13.5px] leading-snug" style={{ color: mutedColor }}>
                {isExpired
                  ? "Contactez l'administrateur pour obtenir un nouveau code."
                  : "Entrez votre code d'activation pour accéder à toutes les fonctionnalités."}
              </p>
            </div>
          </div>

          {showSuccess && successMessage && (
            <div className="flex items-start gap-3 rounded-lg border p-3" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <Sparkles className="h-4 w-4" style={{ color: '#10B981' }} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold leading-tight" style={{ color: '#10B981' }}>Succès</p>
                <p className="mt-0.5 text-[13px] leading-snug" style={{ color: mutedColor }}>{successMessage}</p>
              </div>
            </div>
          )}

          {isExpired && expirationDate && (
            <div className="flex items-center justify-between rounded-lg border p-3" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                <span className="text-[13px] font-medium leading-tight" style={{ color: mutedColor }}>Date d'expiration</span>
              </div>
              <span className="text-[13px] font-bold leading-tight" style={{ color: '#EF4444' }}>
                {new Date(expirationDate).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}

          {!showSuccess ? (
            <form onSubmit={handleActivate} className="space-y-3">
              <FormInput
                label="Code d'activation"
                name="activationCode"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                placeholder="Entrez votre code d'activation"
                icon={KeyRound}
                error={error || undefined}
                disabled={isLoading || licenseLoading}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading || licenseLoading}
                className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold text-white transition-all hover:opacity-95 disabled:opacity-50 bg-brand-500 hover:bg-brand-600"
                style={{ boxShadow: '0 6px 16px rgba(79,70,229,0.28)' }}
              >
                {isLoading || licenseLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Activer ma licence</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true })}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[14.5px] font-semibold text-white transition-all hover:opacity-95 bg-brand-500 hover:bg-brand-600"
                style={{ boxShadow: '0 6px 16px rgba(79,70,229,0.28)' }}
              >
                {isAuthenticated ? 'Accéder au Dashboard' : 'Se connecter'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-1">
            {[{ icon: Zap, text: 'Instantané' }, { icon: ShieldCheck, text: 'Sécurisé' }, { icon: Cloud, text: 'Offline' }].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-1.5 rounded-lg border py-2.5" style={{ borderColor, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}>
                <item.icon size={13} style={{ color: licenseBadges[i % 4].color }} />
                <span className="text-[12.5px] font-medium leading-tight" style={{ color: mutedColor }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* ⭐ Copyright — mt-6 (fa tsy mt-auto) */}
          <div className="flex items-center justify-center border-t pt-4 mt-6" style={{ borderColor }}>
            <span className="text-[12px]" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>© 2026 Life's Art ERP</span>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Licence activée !"
        message="Votre licence a été activée avec succès. Redirection..."
        buttonText="Continuer"
        autoCloseDelay={2000}
      />
      <ErrorModal
        isOpen={!!error}
        onClose={() => setError(null)}
        title="Erreur d'activation"
        message={error || ''}
        buttonText="Réessayer"
        autoCloseDelay={4000}
      />
    </div>
  );
};

export default LicenseGateScreen;