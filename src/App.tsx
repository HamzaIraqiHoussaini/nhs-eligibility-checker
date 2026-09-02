import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function PortalContent() {
  const { user, profile, role, isLeadership, isSupervisor, isRestricted, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeAcademicYear, setActiveAcademicYear] = useState<string>('');

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

  return (
    <div className="stitch-layout">
      
      {/* Stitch Fixed Left Sidebar */}
      <aside className="stitch-sidebar">
        
        {/* Brand Header */}
        <div className="stitch-sidebar-header">
          <img
            src="/nhs-logo.png"
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
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`stitch-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <FileText size={16} />
            <span>Project Hub</span>
          </button>

          <button
            type="button"
            className={`stitch-nav-item ${activeTab === 'screener' ? 'active' : ''}`}
            onClick={() => setActiveTab('screener')}
          >
            <CheckCircle2 size={16} />
            <span>{isLeadership || isSupervisor ? 'Report Card Auditor' : 'Verify My Report Card'}</span>
          </button>

          <button
            type="button"
            className={`stitch-nav-item ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <BookOpen size={16} />
            <span>Chapter Bylaws</span>
          </button>

          {/* Governance & Councils (Leadership & Supervisors) */}
          {(isLeadership || isSupervisor) && (
            <>
              <div className="stitch-nav-section-label" style={{ marginTop: '0.75rem' }}>Governance Desk</div>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                <ClipboardCheck size={16} />
                <span>Review Desk</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                <CalendarCheck size={16} />
                <span>Attendance Calendar</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'treasury' ? 'active' : ''}`}
                onClick={() => setActiveTab('treasury')}
              >
                <Coins size={16} />
                <span>Chapter Treasury</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'semesters' ? 'active' : ''}`}
                onClick={() => setActiveTab('semesters')}
              >
                <Calendar size={16} />
                <span>Semester Manager</span>
              </button>

              <button
                type="button"
                className={`stitch-nav-item ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => setActiveTab('roster')}
              >
                <Users size={16} />
                <span>Member Roster</span>
              </button>

              {isLeadership && (
                <button
                  type="button"
                  className={`stitch-nav-item ${activeTab === 'allowlist' ? 'active' : ''}`}
                  onClick={() => setActiveTab('allowlist')}
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
        {activeTab === 'dashboard' && <MemberDashboard onNavigate={(t) => setActiveTab(t as ActiveTab)} />}
        {activeTab === 'projects' && <MyProjectsView />}
        {activeTab === 'screener' && <ScreenerView />}
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
      <PortalContent />
    </AuthProvider>
  );
}

export default App;
