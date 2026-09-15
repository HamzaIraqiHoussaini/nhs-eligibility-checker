import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { InAppNotification } from '../../types/nhs';
import {
  fetchUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToUserNotifications,
} from '../../lib/notificationService';
import { formatRelativeTime } from '../../lib/authTracking';
import { Bell, CheckCircle2, AlertTriangle, FileText, CheckCheck, ExternalLink } from 'lucide-react';

interface NotificationBellProps {
  onNavigate: (tab: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([
        fetchUserNotifications(user.id, 20),
        getUnreadNotificationCount(user.id),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    // Subscribe to realtime notifications
    const unsubscribe = subscribeToUserNotifications(user.id, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    // Backup polling every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: InAppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (notif.link_tab) {
      onNavigate(notif.link_tab);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'stage1_approved':
      case 'stage2_approved':
        return <CheckCircle2 size={16} color="#059669" />;
      case 'project_rejected':
        return <AlertTriangle size={16} color="#DC2626" />;
      case 'project_submitted':
      default:
        return <FileText size={16} color="var(--color-oxford)" />;
    }
  };

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        style={{
          background: isOpen ? '#EFF6FF' : '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '0.45rem',
          cursor: 'pointer',
          color: isOpen ? 'var(--color-oxford)' : 'var(--color-navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.15s ease',
        }}
        title={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#E11D48',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '9999px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-border)',
            boxShadow: '0 10px 25px -5px rgba(10,30,63,0.15), 0 8px 10px -6px rgba(10,30,63,0.1)',
            zIndex: 100,
            borderRadius: '4px',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Dropdown Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-navy)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: 'var(--color-oxford)',
                    fontSize: '0.70rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.74rem',
                  color: 'var(--color-oxford)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: 600,
                }}
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <Bell size={24} color="#94A3B8" style={{ margin: '0 auto 0.5rem', opacity: 0.7 }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>No notifications yet</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  You will receive instant alerts when proposals are submitted or reviewed.
                </div>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: notif.read ? '#FFFFFF' : '#F0F7FF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notif.read ? '#F8FAFC' : '#E2EEFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.read ? '#FFFFFF' : '#F0F7FF';
                  }}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: notif.read ? 600 : 700,
                          color: 'var(--color-navy)',
                          lineHeight: 1.3,
                        }}
                      >
                        {notif.title}
                      </div>
                      {!notif.read && (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#0284C7',
                            flexShrink: 0,
                            marginTop: '4px',
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        marginTop: '0.25rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {notif.message}
                    </div>

                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--color-text-muted)',
                        marginTop: '0.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>{formatRelativeTime(notif.created_at)}</span>
                      {notif.link_tab && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--color-oxford)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            View details <ExternalLink size={10} />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
