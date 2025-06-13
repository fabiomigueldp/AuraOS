// AuraUI/NotificationRoot.jsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import NotificationManager from '../AuraOS/core/NotificationManager'; // Adjust path
import NotificationToast from './components/NotificationToast.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import NotificationIcon from './components/NotificationIcon.jsx';

const GlobalStyleInjector = () => {
  useEffect(() => {
    const styleId = 'aura-notification-global-styles';
    if (document.getElementById(styleId)) return;

    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.textContent = `
      /* Ensure React root for notifications doesn't interfere with body layout */
      #aura-notification-system-root {
        position: relative;
        z-index: 10000; /* High z-index for notifications */
      }

      /* Styling for the toast container if NotificationRoot manages multiple toasts */
      .toast-container-managed {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 100001; /* Above notification center if separate */
        display: flex;
        flex-direction: column-reverse; /* New toasts appear above old ones */
        gap: 10px;
        align-items: flex-end;
      }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      const existingStyleSheet = document.getElementById(styleId);
      if (existingStyleSheet) {
        document.head.removeChild(existingStyleSheet);
      }
    };
  }, []);
  return null;
};

const NotificationRoot = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToasts, setActiveToasts] = useState([]); // Manage multiple toasts
  const [isCenterVisible, setIsCenterVisible] = useState(false);

  useEffect(() => {
    // Initial fetch
    setNotifications(NotificationManager.getNotifications());
    setUnreadCount(NotificationManager.getUnreadCount());

    // Subscribe to updates
    const unsubscribe = NotificationManager.subscribe((updatedNotifications, updatedUnreadCount) => {
      const newNotifications = updatedNotifications.filter(
        n => !notifications.some(on => on.id === n.id) && !n.read && !activeToasts.some(t => t.id === n.id)
      );

      // Add new, unread notifications as toasts
      // We'll show up to 3 toasts at a time.
      // A more sophisticated system might queue them or use a different display strategy.
      if (newNotifications.length > 0) {
         setActiveToasts(prevToasts => {
            const incomingToasts = newNotifications.map(n => ({ ...n, key: n.id + '-' + Date.now() })).slice(0, 3 - prevToasts.length);
            return [...prevToasts, ...incomingToasts];
        });
      }

      setNotifications(updatedNotifications);
      setUnreadCount(updatedUnreadCount);
    });

    return () => unsubscribe();
  }, [notifications, activeToasts]); // Rerun if notifications or activeToasts change to catch updates

  const handleToastDismiss = useCallback((toastId) => {
    setActiveToasts(currentToasts => currentToasts.filter(t => t.id !== toastId));
    NotificationManager.markAsRead(toastId); // Mark as read when toast is dismissed
  }, []);

  const toggleNotificationCenter = () => {
    setIsCenterVisible(prev => !prev);
    if (!isCenterVisible) { // When opening, mark all as read (or some other strategy)
      // This is a simple strategy. A more complex one might mark as read on hover in the center.
      // notifications.forEach(n => { if(!n.read) NotificationManager.markAsRead(n.id); });
    }
  };

  // Render the NotificationIcon into the placeholder in the top bar
  const iconSlot = document.getElementById('notification-icon-slot');
  const notificationIconElement = iconSlot ?
    ReactDOM.createPortal(
      <NotificationIcon unreadCount={unreadCount} onClick={toggleNotificationCenter} />,
      iconSlot
    ) : null;

  return (
    <>
      <GlobalStyleInjector />
      {notificationIconElement}

      <div className="toast-container-managed">
        {activeToasts.map(toast => (
          <NotificationToast
            key={toast.key} // Use unique key for react list
            notification={toast}
            onDismiss={() => handleToastDismiss(toast.id)}
            autoDismissTimeout={5000}
          />
        ))}
      </div>

      <NotificationCenter
        isVisible={isCenterVisible}
        onClose={() => setIsCenterVisible(false)}
      />
    </>
  );
};

// Mount the NotificationRoot component
const targetNode = document.getElementById('aura-notification-system-root');
if (targetNode) {
  ReactDOM.render(<NotificationRoot />, targetNode);
} else {
  console.error('Target node for NotificationRoot not found in DOM.');
}

// Integrate with the new NotificationManager API
// This ensures Aura.notifications.create is the way to make notifications.
// The existing AuraOS.showNotification might need to be manually updated or removed from index.html
// if it conflicts or is redundant. For now, we assume NotificationManager.js already exposed
// window.Aura.notifications.create.

console.log('NotificationRoot.jsx loaded and attempting to render.');
