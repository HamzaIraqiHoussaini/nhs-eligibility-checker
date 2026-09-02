import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { MemberDashboard } from './components/member/MemberDashboard';
import { MyProjectsView } from './components/member/MyProjectsView';
import { ChapterRules } from './components/member/ChapterRules';
import { ScreenerView } from './components/screener/ScreenerView';
import { TwoStageReviewDesk } from './components/leadership/TwoStageReviewDesk';
import { AttendanceSheet } from './components/leadership/AttendanceSheet';
import { MemberRosterManager } from './components/leadership/MemberRosterManager';
import { SemesterSettings } from './components/leadership/SemesterSettings';
import { AllowlistManager } from './components/leadership/AllowlistManager';
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
} from 'lucide-react';
import './index.css';

type ActiveTab =
  | 'dashboard'
  | 'projects'
  | 'screener'
  | 'rules'
  | 'review'
  | 'attendance'
  | 'roster'
  | 'semesters'
  | 'allowlist';

function PortalContent() {
  const { user, profile, role, isLeadership, isSupervisor, isRestricted, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Institutional Header */}
      <header className="top-nav">
        <div className="brand-section">
          <img
            src="/nhs-logo.png"
            alt="National Honor Society Crest"
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />
          <div>
            <div className="brand-title">Casablanca American School</div>
            <div className="brand-subtitle">National Honor Society Chapter Portal</div>
          </div>
        </div>

        <div className="nav-actions">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                  {profile?.full_name || user.email}
                </div>
                <div style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  {isRestricted ? (
                    <span style={{ color: 'var(--color-terracotta)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <ShieldAlert size={11} /> Dismissed (Restricted)
                    </span>
                  ) : profile?.is_on_probation ? (
                    <span style={{ color: 'var(--color-gold-text)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <AlertTriangle size={11} /> On Probation
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-sage)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={11} /> Good Standing
                    </span>
                  )}
                  <span style={{ color: 'var(--color-border)' }}>•</span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600, color: isLeadership ? 'var(--color-gold-text)' : isSupervisor ? 'var(--color-oxford)' : 'var(--color-text-muted)' }}>
                    {role || 'Member'}
                  </span>
                </div>
              </div>

              <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }} onClick={signOut}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <button className="btn-primary" onClick={() => setIsAuthModalOpen(true)}>
              <LogIn size={14} /> Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* Chapter Secondary Navigation Tabs */}
      <nav style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '0 2rem', display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
        <button
          type="button"
          className={`ingestion-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={14} /> Chapter Home
        </button>

        <button
          type="button"
          className={`ingestion-tab ${activeTab === 'projects' ? 'active' : ''}`}
          style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveTab('projects')}
        >
          <FileText size={14} /> Project Proposal Hub
        </button>

        <button
          type="button"
          className={`ingestion-tab ${activeTab === 'screener' ? 'active' : ''}`}
          style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveTab('screener')}
        >
          <CheckCircle2 size={14} /> {isLeadership || isSupervisor ? 'Report Card Auditor' : 'Verify My Report Card'}
        </button>

        <button
          type="button"
          className={`ingestion-tab ${activeTab === 'rules' ? 'active' : ''}`}
          style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setActiveTab('rules')}
        >
          <BookOpen size={14} /> Official Bylaws
        </button>

        {/* Leadership & Supervisor Management Tabs */}
        {(isLeadership || isSupervisor) && (
          <>
            <span style={{ margin: '0.5rem 0.25rem', borderLeft: '1px solid var(--color-border)' }} />

            <button
              type="button"
              className={`ingestion-tab ${activeTab === 'review' ? 'active' : ''}`}
              style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px', color: isSupervisor ? 'var(--color-oxford)' : undefined }}
              onClick={() => setActiveTab('review')}
            >
              <ClipboardCheck size={14} /> Proposal Review Desk
            </button>

            <button
              type="button"
              className={`ingestion-tab ${activeTab === 'attendance' ? 'active' : ''}`}
              style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveTab('attendance')}
            >
              <CalendarCheck size={14} /> Meeting Attendance
            </button>

            <button
              type="button"
              className={`ingestion-tab ${activeTab === 'roster' ? 'active' : ''}`}
              style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveTab('roster')}
            >
              <Users size={14} /> Member Profiles & Standing
            </button>

            <button
              type="button"
              className={`ingestion-tab ${activeTab === 'semesters' ? 'active' : ''}`}
              style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setActiveTab('semesters')}
            >
              <Calendar size={14} /> Semester Dates
            </button>

            {isLeadership && (
              <button
                type="button"
                className={`ingestion-tab ${activeTab === 'allowlist' ? 'active' : ''}`}
                style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setActiveTab('allowlist')}
              >
                <ShieldCheck size={14} /> Allowlist & Roles
              </button>
            )}
          </>
        )}
      </nav>

      {/* Main Viewport Content */}
      <main className="academic-canvas-bg" style={{ flex: 1, padding: '1.5rem 2rem' }}>
        {activeTab === 'dashboard' && <MemberDashboard onNavigate={(t) => setActiveTab(t as ActiveTab)} />}
        {activeTab === 'projects' && <MyProjectsView />}
        {activeTab === 'screener' && <ScreenerView />}
        {activeTab === 'rules' && <ChapterRules />}
        {activeTab === 'review' && (isLeadership || isSupervisor) && <TwoStageReviewDesk />}
        {activeTab === 'attendance' && (isLeadership || isSupervisor) && <AttendanceSheet />}
        {activeTab === 'roster' && (isLeadership || isSupervisor) && <MemberRosterManager />}
        {activeTab === 'semesters' && (isLeadership || isSupervisor) && <SemesterSettings />}
        {activeTab === 'allowlist' && isLeadership && <AllowlistManager />}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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
