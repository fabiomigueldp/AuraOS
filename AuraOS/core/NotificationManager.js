// AuraOS/core/NotificationManager.js

const MAX_NOTIFICATIONS = 100; // To prevent memory issues

let notifications = [];
let nextId = 0;
const subscribers = new Set();

const NotificationManager = {
  createNotification: (title, message, icon, onClick) => {
    if (notifications.length >= MAX_NOTIFICATIONS) {
      // Remove the oldest notification if the limit is reached
      notifications.shift();
    }

    const newNotification = {
      id: nextId++,
      title,
      message,
      icon,
      onClick: onClick || (() => {}), // Ensure onClick is always a function
      timestamp: new Date(),
      read: false,
    };

    notifications.push(newNotification);
    NotificationManager.notifySubscribers();
    return newNotification;
  },

  getNotifications: () => {
    return [...notifications].sort((a, b) => b.timestamp - a.timestamp); // Return newest first
  },

  getUnreadCount: () => {
    return notifications.filter(n => !n.read).length;
  },

  markAsRead: (id) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      NotificationManager.notifySubscribers();
    }
  },

  dismissNotification: (id) => {
    notifications = notifications.filter(n => n.id !== id);
    NotificationManager.notifySubscribers();
  },

  clearAllNotifications: () => {
    notifications = [];
    NotificationManager.notifySubscribers();
  },

  // Subscriber system to notify UI components of changes
  subscribe: (callback) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback); // Return an unsubscribe function
  },

  notifySubscribers: () => {
    // Create a snapshot of subscribers to prevent issues if a subscriber unsubscribes during notification
    const currentSubscribers = new Set(subscribers);
    currentSubscribers.forEach(callback => {
      try {
        callback(NotificationManager.getNotifications(), NotificationManager.getUnreadCount());
      } catch (error) {
        console.error("Error in notification subscriber:", error);
        // Optionally, remove problematic subscribers
        // subscribers.delete(callback);
      }
    });
  },

  // For API exposure
  API: {
    create: (options) => {
      if (!options || !options.title || !options.message) {
        console.error("NotificationManager.API.create: 'title' and 'message' are required.");
        return null;
      }
      return NotificationManager.createNotification(
        options.title,
        options.message,
        options.icon, // Optional
        options.onClick // Optional
      );
    }
  }
};

// Simulate global Aura object for now, this will need proper integration
if (typeof window !== 'undefined') {
  window.Aura = window.Aura || {};
  window.Aura.notifications = NotificationManager.API;
  // Add a specific hook for testing internal state:
  window.Aura.notifications._internal_for_test = {
    getNotifications: NotificationManager.getNotifications,
    getUnreadCount: NotificationManager.getUnreadCount,
    markAsRead: NotificationManager.markAsRead,
    dismissNotification: NotificationManager.dismissNotification,
    clearAllNotifications: NotificationManager.clearAllNotifications
  };
}

export default NotificationManager;
