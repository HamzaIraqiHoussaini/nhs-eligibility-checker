import { supabase } from './supabase';
import type { InAppNotification, NotificationType } from '../types/nhs';

export interface CreateNotificationParams {
  userId: string;
  projectId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  linkTab?: string | null;
}

/**
 * Creates a single in-app notification for a user
 */
export async function createInAppNotification(params: CreateNotificationParams): Promise<InAppNotification | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        project_id: params.projectId || null,
        type: params.type,
        title: params.title,
        message: params.message,
        link_tab: params.linkTab || 'projects',
        read: false,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating in-app notification:', error);
      return null;
    }

    return data as InAppNotification;
  } catch (err) {
    console.error('Failed to dispatch notification:', err);
    return null;
  }
}

/**
 * Creates multiple in-app notifications at once (e.g. notifying all leadership reviewers)
 */
export async function createBulkInAppNotifications(notifications: CreateNotificationParams[]): Promise<void> {
  if (!notifications || notifications.length === 0) return;

  try {
    const rows = notifications.map(n => ({
      user_id: n.userId,
      project_id: n.projectId || null,
      type: n.type,
      title: n.title,
      message: n.message,
      link_tab: n.linkTab || 'projects',
      read: false,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(rows);

    if (error) {
      console.error('Error in bulk notifications insert:', error);
    }
  } catch (err) {
    console.error('Failed bulk notification dispatch:', err);
  }
}

/**
 * Fetches recent notifications for a user
 */
export async function fetchUserNotifications(userId: string, limit = 20): Promise<InAppNotification[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return (data as InAppNotification[]) || [];
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return [];
  }
}

/**
 * Counts unread notifications for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error counting unread notifications:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Failed to get unread count:', err);
    return 0;
  }
}

/**
 * Marks a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  if (!notificationId) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    return false;
  }
}

/**
 * Marks all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to mark all as read:', err);
    return false;
  }
}

/**
 * Subscribes to realtime notifications for a user
 */
export function subscribeToUserNotifications(
  userId: string,
  onNotification: (notification: InAppNotification) => void
): () => void {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`public:notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onNotification(payload.new as InAppNotification);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
