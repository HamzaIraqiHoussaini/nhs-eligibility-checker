import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AuthModal } from './components/auth/AuthModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import type { UserRole } from './types/nhs';
import { MemberDashboard } from './components/member/MemberDashboard';
import { MyProjectsView } from './components/member/MyProjectsView';
import { ChapterRules } from './components/member/ChapterRules';
import { ScreenerView } from './components/screener/ScreenerView';
import { TwoStageReviewDesk } from './components/leadership/TwoStageReviewDesk';
import { AttendanceSheet } from './components/leadership/AttendanceSheet';
import { MemberRosterManager } from './components/leadership/MemberRosterManager';
import { SemesterSettings } from './components/leadership/SemesterSettings';
import { AllowlistManager } from './components/leadership/AllowlistManager';
import { ChapterTreasuryLedger } from './components/treasury/ChapterTreasuryLedger';
import { AnnualProjectsManager } from './components/leadership/AnnualProjectsManager';
import { RulesManagementDesk } from './components/leadership/RulesManagementDesk';
import { PublicHomepage } from './components/public/PublicHomepage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TermsAndPrivacyView } from './components/legal/TermsAndPrivacyView';
import { NotificationBell } from './components/common/NotificationBell';
import {
  LayoutDashboard,
  FileText,
  CheckCircle2,
  BookOpen,
  ClipboardCheck,
  CalendarCheck,
  Users,
  Calendar,
  ShieldCheck,
  LogIn,
  LogOut,
  AlertTriangle,
  ShieldAlert,
  Key,
  Coins,
  Star,
  Award,
  Scale,
} from 'lucide-react';
import './index.css';

type ActiveTab =
  | 'home'
  | 'dashboard'
  | 'projects'
  | 'screener'
  | 'rules'
  | 'rules_management'
  | 'review'
  | 'annual_projects_desk'
  | 'attendance'
  | 'treasury'
  | 'semesters'
  | 'allowlist'
  | 'roster'
  | 'legal';

const TAB_ROUTES: Record<ActiveTab, string> = {
  home: '/',
  dashboard: '/dashboard',
  projects: '/project_hub',
  screener: '/screener',
  rules: '/rules',
  rules_management: '/rules_management',
  review: '/review_desk',
  annual_projects_desk: '/annual_projects_desk',
  attendance: '/attendance',
  treasury: '/treasury',
  semesters: '/semesters',
  roster: '/members',
  allowlist: '/access_control',
  legal: '/terms',
};

const PATH_TO_TAB: Record<string, ActiveTab> = {
  '/': 'home',
  '/home': 'home',
  '/dashboard': 'dashboard',
  '/project_hub': 'projects',
  '/projects': 'projects',
  '/annual_projects': 'projects', // All member attempts redirect directly to Project Hub
  '/yearly_projects': 'projects',
  '/annual_projects_desk': 'annual_projects_desk',
  '/screener': 'screener',
  '/eligibility': 'screener',
  '/rules': 'rules',
  '/bylaws': 'rules',
  '/rules_management': 'rules_management',
  '/rules/manage': 'rules_management',
  '/governance/rules': 'rules_management',
  '/review': 'review',
  '/review_desk': 'review',
  '/attendance': 'attendance',
  '/treasury': 'treasury',
  '/semesters': 'semesters',
  '/members': 'roster',
  '/roster': 'roster',
  '/access_control': 'allowlist',
  '/allowlist': 'allowlist',
  '/terms': 'legal',
  '/privacy': 'legal',
  '/terms_of_use': 'legal',
  '/privacy_policy': 'legal',
  '/legal': 'legal',
};

function getTabFromPath(path: string): ActiveTab {
  const normalized = path.replace(/\/$/, '') || '/';
  return PATH_TO_TAB[normalized] || 'home';
}

function PortalContent() {
  const { user, profile, role, isLeadership, isSupervisor, isAdministrator, isRestricted, isGraduated, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getTabFromPath(window.location.pathname));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeAcademicYear, setActiveAcademicYear] = useState<string>('');

  const navigateTo = (tab: ActiveTab) => {
    // If account is administrator, strictly lock down to review only (and legal terms if clicked)
    if (isAdministrator && tab !== 'review' && tab !== 'legal') {
      setActiveTab('review');
      const path = TAB_ROUTES['review'] || '/review_desk';
      if (window.location.pathname !== path) {
        window.history.pushState({ tab: 'review' }, '', path);
      }
      return;
    }

    // If account is restricted, lock down navigation to dashboard only (and legal terms if clicked)
    if (isRestricted && tab !== 'dashboard' && tab !== 'legal') {
      setActiveTab('dashboard');
      const path = TAB_ROUTES['dashboard'] || '/dashboard';
      if (window.location.pathname !== path) {
        window.history.pushState({ tab: 'dashboard' }, '', path);
      }
      return;
    }

    setActiveTab(tab);
    const path = TAB_ROUTES[tab] || `/${tab}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ tab }, '', path);
    }
  };

  const handleAuthSuccess = (resolvedRole?: UserRole) => {
    setIsAuthModalOpen(false);
    const targetRole = resolvedRole || role || (user?.user_metadata?.role as UserRole);
    if (targetRole === 'administrator' || targetRole === 'supervisor') {
      navigateTo('review');
    } else {
      navigateTo('dashboard');
    }
  };

  // Automatically direct newly authenticated users to the member dashboard (or review desk for supervisor / administrator)
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (!prevUserRef.current && user) {
      const targetRole = role || (user?.user_metadata?.role as UserRole);
      if (targetRole === 'administrator' || targetRole === 'supervisor') {
        navigateTo('review');
      } else {
        navigateTo('dashboard');
      }
    }
    prevUserRef.current = user;
  }, [user, role, isAdministrator, isSupervisor]);

  // Strict route containment for Administrator role (Final Reviews & Legal only)
  useEffect(() => {
    if (user && isAdministrator) {
      const allowedAdminTabs: ActiveTab[] = ['review', 'legal'];
      if (!allowedAdminTabs.includes(activeTab)) {
        navigateTo('review');
      }
    }
  }, [user, isAdministrator, activeTab]);

  // Strict route containment for Supervisor role
  useEffect(() => {
    if (user && isSupervisor) {
      const allowedSupervisorTabs: ActiveTab[] = ['screener', 'review', 'roster', 'legal'];
      if (!allowedSupervisorTabs.includes(activeTab)) {
        navigateTo('review');
      }
    }
  }, [user, isSupervisor, activeTab]);

  // Strict route containment for Restricted accounts: Dashboard only
  useEffect(() => {
    if (user && isRestricted) {
      if (activeTab !== 'dashboard' && activeTab !== 'legal') {
        navigateTo('dashboard');
      }
    }
  }, [user, isRestricted, activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [isSemester2, setIsSemester2] = useState(false);

  useEffect(() => {
    const fetchActiveSemester = async () => {
      try {
        const { data } = await supabase
          .from('semesters')
          .select('name, academic_year, semester_number, is_active')
          .eq('is_active', true)
          .maybeSingle();
        if (data) {
          if (data.academic_year) setActiveAcademicYear(data.academic_year);
          setIsSemester2(data.semester_number === 2 || (data.name && data.name.toLowerCase().includes('semester 2')));
        }
      } catch (err) {
        console.error('Failed to load active academic year:', err);
      }
    };
    fetchActiveSemester();
  }, [activeTab]);

  // Standalone Public Screener Page (No login required, no dashboard sidebar)
  if (activeTab === 'screener') {
    return (
      <div className="min-h-screen w-full bg-[#FBFBFA]">
        {/* Clean Editorial Header */}
        <header className="sticky top-0 z-50 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigateTo('home')}
            >
              <div className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded p-1 flex-shrink-0 group-hover:border-[#B8860B] transition-colors">
                <img
                  src="/cas-logo.png"
                  alt="Casablanca American School"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-slate-500 leading-tight">
                  Casablanca American School
                </div>
                <div className="font-serif text-base font-bold text-[#06101E] leading-tight group-hover:text-[#0C1D38] transition-colors">
                  National Honor Society
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {user ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#06101E] hover:bg-[#0C1D38] rounded shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  onClick={() => navigateTo((isAdministrator || isSupervisor) ? 'review' : 'dashboard')}
                >
                  <LayoutDashboard size={13} />
                  <span>{(isAdministrator || isSupervisor) ? 'Review Desk' : 'Member Portal'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#06101E] hover:bg-[#0C1D38] rounded shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
              )}

              <button
                type="button"
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                onClick={() => navigateTo((isAdministrator || isSupervisor) ? 'review' : 'home')}
              >
                {(isAdministrator || isSupervisor) ? 'Back to Portal' : 'Back to Homepage'}
              </button>
            </div>
          </div>
        </header>

        {/* Screener View */}
        <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <ScreenerView />
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // Public Legal Terms & Privacy View (accessible to unauthenticated visitors):
  if (!user && activeTab === 'legal') {
    return (
      <div className="min-h-screen w-full bg-[#FFFFFF]">
        <header className="h-16 bg-[#06101E] border-b border-white/10 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto h-full flex justify-between items-center gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('home')}>
              <div className="w-8 h-8 p-1 bg-white rounded flex items-center justify-center">
                <img src="/cas-logo.png" alt="CAS" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <div className="text-white font-serif font-bold text-base leading-tight">Casablanca American School</div>
                <div className="text-[11px] font-mono text-[#E7C979]">National Honor Society Chapter Portal</div>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-white/20 hover:border-white/40 rounded transition-colors"
              onClick={() => navigateTo('home')}
            >
              Back to Homepage
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          <TermsAndPrivacyView
            initialTab={window.location.pathname.includes('privacy') ? 'privacy' : 'terms'}
            onBack={() => navigateTo('home')}
          />
        </main>
      </div>
    );
  }

  // Unauthenticated visitors trying to access other internal portal tabs are prompted to log in:
  if (!user && activeTab !== 'home') {
    return (
      <div style={{ minHeight: '100vh', width: '100%' }}>
        <PublicHomepage
          onNavigate={(t) => {
            if (t === 'screener') {
              navigateTo('screener');
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          user={null}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // Public Homepage for visitors and authenticated members on home tab:
  if (activeTab === 'home') {
    return (
      <div style={{ minHeight: '100vh', width: '100%' }}>
        <PublicHomepage
          onNavigate={(t) => navigateTo(t as ActiveTab)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          user={user}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <div className="stitch-layout">
      
      {/* Stitch Fixed Left Sidebar */}
      <aside className="stitch-sidebar">
        
        {/* Brand Header */}
        <div
          className="stitch-sidebar-header"
          style={{ cursor: 'pointer' }}
          onClick={() => navigateTo((isAdministrator || isSupervisor) ? 'review' : 'dashboard')}
          title="Return to Portal"
        >
          <div className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded p-1 flex-shrink-0 shadow-2xs">
            <img
              src="/cas-logo.png"
              alt="CAS NHS Crest"
              className="w-6 h-6 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-serif text-sm font-bold text-[#06101E] leading-tight truncate">
              CAS NHS Portal
            </div>
            <div className="text-[10px] font-mono font-medium text-slate-400 tracking-wider truncate">
              Casablanca American School
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="stitch-sidebar-nav">
          
          {isAdministrator ? (
            <>
              <div className="stitch-nav-section-label">Administration Desk</div>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => navigateTo('review')}
              >
                <ClipboardCheck size={16} />
                <span>Final Project Reviews</span>
              </button>
            </>
          ) : isSupervisor ? (
            <>
              <div className="stitch-nav-section-label">Faculty Desk</div>

              <button
                type="button"
                className="stitch-nav-item"
                onClick={() => navigateTo('screener')}
              >
                <CheckCircle2 size={16} />
                <span>Academic Eligibility</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => navigateTo('review')}
              >
                <ClipboardCheck size={16} />
                <span>Project Reviews</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => navigateTo('roster')}
              >
                <Users size={16} />
                <span>Chapter Members</span>
              </button>
            </>
          ) : isRestricted ? (
            <>
              <div className="stitch-nav-section-label">Account Restricted</div>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => navigateTo('dashboard')}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </button>
            </>
          ) : (
            <>
              <div className="stitch-nav-section-label">General Workspace</div>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => navigateTo('dashboard')}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => navigateTo('projects')}
              >
                <FileText size={16} />
                <span>Project Hub</span>
              </button>

              <button
                type="button"
                className="stitch-nav-item"
                onClick={() => navigateTo('screener')}
              >
                <CheckCircle2 size={16} />
                <span>{isLeadership ? 'Academic Eligibility' : 'Check My Eligibility'}</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'rules' ? 'active' : ''}`}
                onClick={() => navigateTo('rules')}
              >
                <BookOpen size={16} />
                <span>Rules</span>
              </button>

              {/* Governance & Councils (Leadership Only) */}
              {isLeadership && (
                <>
                  <div className="stitch-nav-section-label" style={{ marginTop: '0.75rem' }}>Governance Desk</div>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => navigateTo('review')}
                  >
                    <ClipboardCheck size={16} />
                    <span>Project Reviews</span>
                  </button>

                  {isSemester2 && (
                    <button
                      type="button"
                      className={`stitch-nav-item ${activeTab === 'annual_projects_desk' ? 'active' : ''}`}
                      onClick={() => navigateTo('annual_projects_desk')}
                    >
                      <Star size={16} />
                      <span>Annual Projects Desk</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => navigateTo('attendance')}
                  >
                    <CalendarCheck size={16} />
                    <span>Attendance Calendar</span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'treasury' ? 'active' : ''}`}
                    onClick={() => navigateTo('treasury')}
                  >
                    <Coins size={16} />
                    <span>Chapter Treasury</span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'semesters' ? 'active' : ''}`}
                    onClick={() => navigateTo('semesters')}
                  >
                    <Calendar size={16} />
                    <span>Semester Manager</span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'rules_management' ? 'active' : ''}`}
                    onClick={() => navigateTo('rules_management')}
                  >
                    <Scale size={16} />
                    <span>Rules & Policies</span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
                    onClick={() => navigateTo('roster')}
                  >
                    <Users size={16} />
                    <span>Chapter Members</span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'allowlist' ? 'active' : ''}`}
                    onClick={() => navigateTo('allowlist')}
                  >
                    <ShieldCheck size={16} />
                    <span>Access Control</span>
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-slate-200 p-3.5 bg-[#FAFBFB]">
          {user ? (
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-semibold text-[#06101E] truncate">
                  {profile?.full_name || (user?.email?.toLowerCase() === 'hiraqihoussaini@cas.ac.ma' ? 'Hamza Iraqi Houssaini' : user?.email?.split('@')[0] || 'Member')}
                </span>
                <span className={`text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded tracking-wide ${
                  isAdministrator ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                  isLeadership ? 'bg-[#FAF6ED] text-[#8B6508] border border-[#E5CB91]' :
                  isSupervisor ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                  'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {role || (user?.user_metadata?.role as string) || 'Member'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate mb-2">
                {user.email}
              </div>
              <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-[10px] text-slate-400">
                <button
                  type="button"
                  onClick={() => navigateTo('legal')}
                  className="hover:text-[#06101E] underline cursor-pointer"
                >
                  Terms & Privacy
                </button>
                <span className="font-mono">Account Liable</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono">
              Guest Session
            </div>
          )}
        </div>

      </aside>

      {/* Stitch Fixed Top Header */}
      <header className="stitch-top-header">
        
        {/* Left: Academic Year Indicator with Live Dot */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
            <span className="text-xs font-mono font-medium text-slate-600 tracking-wide uppercase">
              Academic Cycle {activeAcademicYear ? activeAcademicYear.replace('-', ' — ') : '2026 — 2027'}
            </span>
          </div>
          {isSemester2 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              Semester 2 Active
            </span>
          )}
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2.5">
              
              {/* Standing Badge */}
              {isGraduated ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                  <Award size={12} /> Graduate Honors
                </span>
              ) : isRestricted ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                  <ShieldAlert size={12} /> Restricted
                </span>
              ) : profile?.is_on_probation ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                  <AlertTriangle size={12} /> Probation
                </span>
              ) : null}

              {/* In-App Notification Bell */}
              <NotificationBell onNavigate={(tab) => navigateTo(tab as ActiveTab)} />

              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded shadow-2xs transition-colors cursor-pointer"
                onClick={() => setIsChangePasswordOpen(true)}
                title="Change your personal passcode"
              >
                <Key size={13} className="text-slate-500" />
                <span>Change Code</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded shadow-2xs transition-colors cursor-pointer"
                onClick={signOut}
              >
                <LogOut size={13} className="text-slate-500" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#06101E] hover:bg-[#0C1D38] rounded shadow-2xs transition-colors cursor-pointer"
              onClick={() => setIsAuthModalOpen(true)}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Stitch Main Content Area */}
      <main className="stitch-main-content">
        <ErrorBoundary
          fallbackTitle="Unable to Display Portal View"
          fallbackMessage="An unexpected error occurred while loading this section. Please try again or return to the dashboard."
          onReset={() => navigateTo((isAdministrator || isSupervisor) ? 'review' : 'dashboard')}
        >
          {isAdministrator ? (
            <>
              {activeTab === 'review' && <TwoStageReviewDesk />}
              {activeTab === 'legal' && (
                <TermsAndPrivacyView
                  initialTab={window.location.pathname.includes('privacy') ? 'privacy' : 'terms'}
                  onBack={() => navigateTo('review')}
                />
              )}
            </>
          ) : isSupervisor ? (
            <>
              {activeTab === 'review' && <TwoStageReviewDesk />}
              {activeTab === 'roster' && <MemberRosterManager />}
              {activeTab === 'legal' && (
                <TermsAndPrivacyView
                  initialTab={window.location.pathname.includes('privacy') ? 'privacy' : 'terms'}
                  onBack={() => navigateTo('review')}
                />
              )}
            </>
          ) : isRestricted ? (
            <>
              {activeTab === 'legal' ? (
                <TermsAndPrivacyView
                  initialTab={window.location.pathname.includes('privacy') ? 'privacy' : 'terms'}
                  onBack={() => navigateTo('dashboard')}
                />
              ) : (
                <MemberDashboard onNavigate={(t) => navigateTo(t as ActiveTab)} />
              )}
            </>
          ) : (
            <>
              {activeTab === 'dashboard' && <MemberDashboard onNavigate={(t) => navigateTo(t as ActiveTab)} />}
              {activeTab === 'projects' && <MyProjectsView />}
              {activeTab === 'annual_projects_desk' && isLeadership && isSemester2 && (
                <AnnualProjectsManager />
              )}
              {activeTab === 'rules' && <ChapterRules onNavigate={(t) => navigateTo(t as ActiveTab)} />}
              {activeTab === 'rules_management' && isLeadership && <RulesManagementDesk />}
              {activeTab === 'review' && isLeadership && <TwoStageReviewDesk />}
              {activeTab === 'review' && !isLeadership && (
                // Non-leadership members who navigate directly to /review_desk are sent to dashboard
                <MemberDashboard onNavigate={(t) => navigateTo(t as ActiveTab)} />
              )}
              {activeTab === 'attendance' && isLeadership && <AttendanceSheet />}
              {activeTab === 'roster' && isLeadership && <MemberRosterManager />}
              {activeTab === 'semesters' && isLeadership && <SemesterSettings />}
              {activeTab === 'treasury' && isLeadership && <ChapterTreasuryLedger />}
              {activeTab === 'allowlist' && isLeadership && <AllowlistManager />}
              {activeTab === 'legal' && (
                <TermsAndPrivacyView
                  initialTab={window.location.pathname.includes('privacy') ? 'privacy' : 'terms'}
                  onBack={() => navigateTo('dashboard')}
                />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Change Password / Access Code Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <PortalContent />
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
