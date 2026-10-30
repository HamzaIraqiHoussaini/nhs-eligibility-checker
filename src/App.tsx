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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const navigateTo = (tab: ActiveTab) => {
    setIsMobileSidebarOpen(false);
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
          .select('name, semester_number, is_active')
          .eq('is_active', true)
          .maybeSingle();
        if (data) {
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
      <div className="min-h-screen w-full bg-surface text-on-surface antialiased font-body-md">
        {/* Stitch Shared Editorial Header */}
        <header className="bg-surface border-b border-surface-container-highest sticky top-0 z-50">
          <div className="flex justify-between items-center w-full px-6 md:px-14 py-4 max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="flex items-center space-x-3.5 text-left group cursor-pointer"
            >
              <img
                src="/cas-logo.png"
                alt="Casablanca American School"
                className="w-8 h-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Casablanca American School
                </span>
                <span className="font-display text-headline-sm text-primary tracking-tight font-normal">
                  CAS NHS
                </span>
              </div>
            </button>

            <div className="flex items-center space-x-4">
              {user ? (
                <button
                  type="button"
                  className="bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-wider px-5 py-2.5 hover:bg-secondary transition-colors duration-150 cursor-pointer"
                  onClick={() => navigateTo((isAdministrator || isSupervisor) ? 'review' : 'dashboard')}
                >
                  {(isAdministrator || isSupervisor) ? 'Review Desk' : 'Member Portal'}
                </button>
              ) : (
                <button
                  type="button"
                  className="bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-wider px-5 py-2.5 hover:bg-secondary transition-colors duration-150 cursor-pointer"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  Sign In
                </button>
              )}

              <button
                type="button"
                className="border border-on-surface text-on-surface font-label-md text-label-md uppercase tracking-wider px-4 py-2.5 hover:bg-surface-container transition-colors duration-150 cursor-pointer"
                onClick={() => navigateTo((isAdministrator || isSupervisor) ? 'review' : 'home')}
              >
                {(isAdministrator || isSupervisor) ? 'Back to Portal' : 'Back to Homepage'}
              </button>
            </div>
          </div>
        </header>

        {/* Screener View */}
        <main className="max-w-7xl mx-auto px-6 md:px-14 py-10">
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
      <div style={{ minHeight: '100vh', width: '100%', backgroundColor: 'var(--color-surface)' }}>
        <header style={{ backgroundColor: 'var(--color-navy)', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigateTo('home')}>
              <img src="/cas-logo.png" alt="CAS" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              <div>
                <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-serif)' }}>Casablanca American School</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-gold)' }}>National Honor Society Chapter Portal</div>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
              onClick={() => navigateTo('home')}
            >
              Back to Homepage
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
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
      {/* Mobile Sidebar Backdrop */}
      <div
        className={`stitch-sidebar-backdrop ${isMobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Stitch Fixed Left Editorial Navigation Rail (256px) */}
      <aside className={`stitch-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        
        {/* Editorial Seal & Mark */}
        <div
          className="stitch-sidebar-header cursor-pointer"
          onClick={() => navigateTo((isAdministrator || isSupervisor) ? 'review' : 'dashboard')}
          title="Return to Portal"
        >
          <div className="font-headline-sm text-headline-sm text-primary font-normal leading-tight">
            Casablanca American School
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            National Honor Society
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="stitch-sidebar-nav" aria-label="Portal Sections">
          
          {isAdministrator ? (
            <>
              <div className="stitch-nav-section-label">Administration Desk</div>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => navigateTo('review')}
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardCheck size={15} />
                  <span>Final Project Reviews</span>
                </span>
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
                <span className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} />
                  <span>Academic Eligibility</span>
                </span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => navigateTo('review')}
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardCheck size={15} />
                  <span>Project Reviews</span>
                </span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => navigateTo('roster')}
              >
                <span className="flex items-center gap-2.5">
                  <Users size={15} />
                  <span>Chapter Members</span>
                </span>
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
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard size={15} />
                  <span>Member Dashboard</span>
                </span>
              </button>
            </>
          ) : (
            <>
              <div className="stitch-nav-section-label">Member Portal</div>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => navigateTo('dashboard')}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard size={15} />
                  <span>Member Dashboard</span>
                </span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => navigateTo('projects')}
              >
                <span className="flex items-center gap-2.5">
                  <FileText size={15} />
                  <span>Opportunities &amp; Projects</span>
                </span>
              </button>

              <button
                type="button"
                className="stitch-nav-item"
                onClick={() => navigateTo('screener')}
              >
                <span className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} />
                  <span>{isLeadership ? 'Academic Eligibility' : 'Eligibility Screener'}</span>
                </span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'rules' ? 'active' : ''}`}
                onClick={() => navigateTo('rules')}
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen size={15} />
                  <span>Chapter Rules</span>
                </span>
              </button>

              {/* Governance & Councils (Leadership Only) */}
              {isLeadership && (
                <>
                  <div className="stitch-nav-section-label" style={{ marginTop: '0.75rem' }}>Council Governance</div>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => navigateTo('review')}
                  >
                    <span className="flex items-center gap-2.5">
                      <ClipboardCheck size={15} />
                      <span>Project Reviews</span>
                    </span>
                  </button>

                  {isSemester2 && (
                    <button
                      type="button"
                      className={`stitch-nav-item ${activeTab === 'annual_projects_desk' ? 'active' : ''}`}
                      onClick={() => navigateTo('annual_projects_desk')}
                    >
                      <span className="flex items-center gap-2.5">
                        <Star size={15} />
                        <span>Annual Projects Desk</span>
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
                    onClick={() => navigateTo('attendance')}
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarCheck size={15} />
                      <span>Attendance Calendar</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'treasury' ? 'active' : ''}`}
                    onClick={() => navigateTo('treasury')}
                  >
                    <span className="flex items-center gap-2.5">
                      <Coins size={15} />
                      <span>Chapter Treasury</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'semesters' ? 'active' : ''}`}
                    onClick={() => navigateTo('semesters')}
                  >
                    <span className="flex items-center gap-2.5">
                      <Calendar size={15} />
                      <span>Semester Manager</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'rules_management' ? 'active' : ''}`}
                    onClick={() => navigateTo('rules_management')}
                  >
                    <span className="flex items-center gap-2.5">
                      <Scale size={15} />
                      <span>Rules &amp; Policies</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
                    onClick={() => navigateTo('roster')}
                  >
                    <span className="flex items-center gap-2.5">
                      <Users size={15} />
                      <span>Chapter Members</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`stitch-nav-item ${activeTab === 'allowlist' ? 'active' : ''}`}
                    onClick={() => navigateTo('allowlist')}
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck size={15} />
                      <span>Access Control</span>
                    </span>
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        {/* Member Profile Lockup (Bottom Anchor matching Stitch HTML) */}
        <div className="p-5 border-t border-surface-container-highest bg-surface">
          {user ? (
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-primary-container text-white flex items-center justify-center font-label-md text-label-md font-semibold tracking-wider flex-shrink-0">
                  {(profile?.full_name || user.email || 'M')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-label-md text-label-md font-semibold text-primary truncate">
                    {profile?.full_name || (user?.email?.toLowerCase() === 'hiraqihoussaini@cas.ac.ma' ? 'Hamza Iraqi Houssaini' : user?.email?.split('@')[0] || 'Member')}
                  </div>
                  <div className="font-body-sm text-[12px] text-on-surface-variant truncate">
                    {role || (user?.user_metadata?.role as string) || 'Member'}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-label-sm uppercase tracking-wider pt-2.5 border-t border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => navigateTo('legal')}
                  className="text-on-surface-variant hover:text-primary transition-colors underline underline-offset-2 cursor-pointer"
                >
                  Terms &amp; Privacy
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="text-secondary hover:text-primary transition-colors underline underline-offset-2 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="font-label-sm text-label-sm uppercase text-on-surface-variant">
              Guest Session
            </div>
          )}
        </div>

      </aside>

      {/* Stitch Fixed Top Utility Header */}
      <header className="stitch-top-header">
        
        {/* Left: Mobile Drawer Toggle & Academic Session Indicator */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="stitch-mobile-toggle"
            aria-label="Toggle portal navigation"
          >
            <span className="material-symbols-outlined text-lg">
              {isMobileSidebarOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              
              {/* Standing Badge - only show when on probation, restricted, or graduated */}
              {isGraduated ? (
                <span className="status-pill" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9', fontSize: '0.72rem', border: '1px solid #DDD6FE' }}>
                  <Award size={12} /> Graduate Honors
                </span>
              ) : isRestricted ? (
                <span className="status-pill ineligible" style={{ fontSize: '0.72rem' }}>
                  <ShieldAlert size={12} /> Restricted
                </span>
              ) : profile?.is_on_probation ? (
                <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.72rem' }}>
                  <AlertTriangle size={12} /> Probation
                </span>
              ) : null}

              {/* In-App Notification Bell */}
              <NotificationBell onNavigate={(tab) => navigateTo(tab as ActiveTab)} />

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '0.4rem 0.75rem' }}
                onClick={() => setIsChangePasswordOpen(true)}
                title="Change your personal passcode"
              >
                <Key size={13} /> Change Code
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '0.4rem 0.75rem' }}
                onClick={signOut}
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsAuthModalOpen(true)}
            >
              <LogIn size={14} /> Sign In
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
