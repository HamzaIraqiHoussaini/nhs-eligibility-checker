import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AuthModal } from './components/auth/AuthModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
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
import { PublicHomepage } from './components/public/PublicHomepage';
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
} from 'lucide-react';
import './index.css';

type ActiveTab =
  | 'home'
  | 'dashboard'
  | 'projects'
  | 'screener'
  | 'rules'
  | 'review'
  | 'attendance'
  | 'treasury'
  | 'semesters'
  | 'allowlist'
  | 'roster';

const TAB_ROUTES: Record<ActiveTab, string> = {
  home: '/',
  dashboard: '/dashboard',
  projects: '/project_hub',
  screener: '/screener',
  rules: '/rules',
  review: '/review_desk',
  attendance: '/attendance',
  treasury: '/treasury',
  semesters: '/semesters',
  roster: '/members',
  allowlist: '/access_control',
};

const PATH_TO_TAB: Record<string, ActiveTab> = {
  '/': 'home',
  '/home': 'home',
  '/dashboard': 'dashboard',
  '/project_hub': 'projects',
  '/projects': 'projects',
  '/screener': 'screener',
  '/eligibility': 'screener',
  '/rules': 'rules',
  '/bylaws': 'rules',
  '/review': 'review',
  '/review_desk': 'review',
  '/attendance': 'attendance',
  '/treasury': 'treasury',
  '/semesters': 'semesters',
  '/members': 'roster',
  '/roster': 'roster',
  '/access_control': 'allowlist',
  '/allowlist': 'allowlist',
};

function getTabFromPath(path: string): ActiveTab {
  const normalized = path.replace(/\/$/, '') || '/';
  return PATH_TO_TAB[normalized] || 'home';
}

function PortalContent() {
  const { user, profile, role, isLeadership, isSupervisor, isRestricted, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => getTabFromPath(window.location.pathname));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeAcademicYear, setActiveAcademicYear] = useState<string>('');

  const navigateTo = (tab: ActiveTab) => {
    setActiveTab(tab);
    const path = TAB_ROUTES[tab] || `/${tab}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ tab }, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const fetchActiveSemester = async () => {
      try {
        const { data } = await supabase
          .from('semesters')
          .select('academic_year, is_active')
          .eq('is_active', true)
          .maybeSingle();
        if (data?.academic_year) {
          setActiveAcademicYear(data.academic_year);
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
      <div style={{ minHeight: '100vh', width: '100%', backgroundColor: 'var(--color-bg-base)' }}>
        {/* Clean Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '0.85rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
              onClick={() => navigateTo('home')}
            >
              <img
                src="/cas-logo.png"
                alt="Casablanca American School"
                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
              />
              <div>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748B', lineHeight: 1, marginBottom: '2px' }}>
                  Casablanca American School
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-navy)', lineHeight: 1.1 }}>
                  National Honor Society
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                onClick={() => navigateTo('home')}
              >
                ← Back to Homepage
              </button>

              {user ? (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                  onClick={() => navigateTo('dashboard')}
                >
                  <LayoutDashboard size={14} />
                  <span>Member Portal</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Screener View */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
          <ScreenerView />
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
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
          onClick={() => navigateTo('dashboard')}
          title="Return to Dashboard"
        >
          <img
            src="/cas-logo.png"
            alt="CAS NHS Crest"
            style={{ width: '38px', height: '38px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', lineHeight: 1.1 }}>
              CAS NHS Portal
            </div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Casablanca American School
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="stitch-sidebar-nav">
          
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
            <span>{isLeadership || isSupervisor ? 'Academic Eligibility' : 'Check My Eligibility'}</span>
          </button>

          <button
            type="button"
            className={`stitch-nav-item ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => navigateTo('rules')}
          >
            <BookOpen size={16} />
            <span>Rules</span>
          </button>

          {/* Governance & Councils (Leadership & Supervisors) */}
          {(isLeadership || isSupervisor) && (
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
                className={`stitch-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => navigateTo('roster')}
              >
                <Users size={16} />
                <span>Chapter Members</span>
              </button>

              {isLeadership && (
                <button
                  type="button"
                  className={`stitch-nav-item ${activeTab === 'allowlist' ? 'active' : ''}`}
                  onClick={() => navigateTo('allowlist')}
                >
                  <ShieldCheck size={16} />
                  <span>Access Control</span>
                </button>
              )}
            </>
          )}
        </nav>

        {/* Sidebar Footer User Info */}
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '1rem 1.25rem', backgroundColor: '#F8FAFC' }}>
          {user ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                  {profile?.full_name || 'Member'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: isLeadership ? 'var(--color-gold-text)' : isSupervisor ? 'var(--color-oxford)' : 'var(--color-text-muted)' }}>
                  {role || 'Member'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              Guest Session
            </div>
          )}
        </div>

      </aside>

      {/* Stitch Fixed Top Header */}
      <header className="stitch-top-header">
        
        {/* Left: Academic Year Indicator with Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Academic Year {activeAcademicYear ? activeAcademicYear.replace('-', ' — ') : '2026 — 2027'}
          </span>
        </div>

        {/* Right: Actions & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              
              {/* Standing Badge */}
              {isRestricted ? (
                <span className="status-pill ineligible" style={{ fontSize: '0.72rem' }}>
                  <ShieldAlert size={12} /> Restricted
                </span>
              ) : profile?.is_on_probation ? (
                <span className="status-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.72rem' }}>
                  <AlertTriangle size={12} /> Probation
                </span>
              ) : (
                <span className="status-pill eligible" style={{ fontSize: '0.72rem' }}>
                  <CheckCircle2 size={12} /> Good Standing
                </span>
              )}

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                onClick={() => setIsChangePasswordOpen(true)}
                title="Change your personal passcode"
              >
                <Key size={13} /> Change Code
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                onClick={signOut}
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
              onClick={() => setIsAuthModalOpen(true)}
            >
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </header>

      {/* Stitch Main Content Area */}
      <main className="stitch-main-content">
        {activeTab === 'dashboard' && <MemberDashboard onNavigate={(t) => navigateTo(t as ActiveTab)} />}
        {activeTab === 'projects' && <MyProjectsView />}
        {activeTab === 'rules' && <ChapterRules />}
        {activeTab === 'review' && (isLeadership || isSupervisor) && <TwoStageReviewDesk />}
        {activeTab === 'attendance' && (isLeadership || isSupervisor) && <AttendanceSheet />}
        {activeTab === 'roster' && (isLeadership || isSupervisor) && <MemberRosterManager />}
        {activeTab === 'semesters' && (isLeadership || isSupervisor) && <SemesterSettings />}
        {activeTab === 'treasury' && (isLeadership || isSupervisor) && <ChapterTreasuryLedger />}
        {activeTab === 'allowlist' && isLeadership && <AllowlistManager />}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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
