// AuraUI/components/NotificationCenter.jsx
import React, { useState, useEffect } from 'react';
import NotificationManager from '../../AuraOS/core/NotificationManager'; // Adjust path as needed

// Basic styling for the Notification Center.
const centerStyle = {
  position: 'fixed',
  top: '50px', // Assuming a top bar of 50px
  right: '10px',
  width: '350px',
  maxHeight: 'calc(100vh - 70px)', // Full height minus some padding and top bar
  backgroundColor: 'rgba(240, 240, 240, 0.95)',
  border: '1px solid #ccc',
  borderRadius: '5px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
  zIndex: 999, // Below toasts, but above most other content
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  color: '#333',
};

const headerStyle = {
  padding: '10px 15px',
  borderBottom: '1px solid #ccc',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#e9e9e9',
};

const titleStyle = {
  fontWeight: 'bold',
  fontSize: '1.1em',
};

const clearAllButtonStyle = {
  padding: '5px 10px',
  fontSize: '0.8em',
  backgroundColor: '#d9534f',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
};

const notificationListStyle = {
  listStyleType: 'none',
  padding: '0',
  margin: '0',
  flexGrow: 1,
};

const notificationItemStyle = {
  padding: '10px 15px',
  borderBottom: '1px solid #ddd',
  display: 'flex',
  alignItems: 'flex-start',
  cursor: 'default', // Default cursor, change if clickable
};

const notificationIconStyle = {
  width: '24px', // Slightly larger than toast
  height: '24px',
  marginRight: '12px',
  objectFit: 'contain',
  flexShrink: 0,
};

const notificationContentStyle = {
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
};

const notificationTitleStyle = {
  fontWeight: 'bold',
  fontSize: '0.95em',
  marginBottom: '3px',
};

const notificationMessageStyle = {
  fontSize: '0.85em',
  whiteSpace: 'pre-wrap', // Preserve line breaks in message
  marginBottom: '5px',
};

const notificationTimestampStyle = {
  fontSize: '0.7em',
  color: '#666',
  marginTop: 'auto', // Pushes timestamp to bottom if content is short
};

const dismissButtonStyle = {
  marginLeft: '10px',
  padding: '3px 7px',
  fontSize: '0.75em',
  backgroundColor: '#aaa',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  alignSelf: 'flex-start', // Align with top of notification content
};

const noNotificationsStyle = {
  padding: '20px',
  textAlign: 'center',
  color: '#777',
  fontSize: '0.9em',
};


const NotificationCenter = ({ isVisible, onClose }) => {
  const [notifications, setNotifications] = useState(NotificationManager.getNotifications());
  // unreadCount is available if needed for UI, e.g. title like "Notifications (3 unread)"
  // const [unreadCount, setUnreadCount] = useState(NotificationManager.getUnreadCount());

  useEffect(() => {
    const handleUpdate = (updatedNotifications /*, updatedUnreadCount */) => {
      setNotifications(updatedNotifications);
      // setUnreadCount(updatedUnreadCount);
    };

    const unsubscribe = NotificationManager.subscribe(handleUpdate);
    // Initial fetch in case notifications were created before subscribe
    handleUpdate(NotificationManager.getNotifications(), NotificationManager.getUnreadCount());

    return () => unsubscribe();
  }, []);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = (id, event) => {
    event.stopPropagation(); // Prevent click on item from triggering if dismiss is clicked
    NotificationManager.dismissNotification(id);
  };

  const handleClearAll = () => {
    NotificationManager.clearAllNotifications();
  };

  const handleNotificationClick = (notification) => {
    if (notification.onClick) {
      try {
        notification.onClick();
      } catch (e) {
        console.error("Error in notification onClick handler:", e);
      }
      // Optionally, mark as read or dismiss on click
      // NotificationManager.markAsRead(notification.id);
      // if (onClose) onClose(); // Close center after click
    }
  };

  return (
    <div style={centerStyle} role="dialog" aria-labelledby="notification-center-title">
      <div style={headerStyle}>
        <h2 id="notification-center-title" style={titleStyle}>Notifications</h2>
        {notifications.length > 0 && (
          <button style={clearAllButtonStyle} onClick={handleClearAll} aria-label="Clear all notifications">
            Clear All
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={noNotificationsStyle}>No new notifications</div>
      ) : (
        <ul style={notificationListStyle}>
          {notifications.map(n => (
            <li
              key={n.id}
              style={{
                ...notificationItemStyle,
                cursor: n.onClick ? 'pointer' : 'default',
                backgroundColor: n.read ? 'transparent' : '#eef4ff' // Highlight unread
              }}
              onClick={() => handleNotificationClick(n)}
              onMouseEnter={() => { if (!n.read) NotificationManager.markAsRead(n.id); }} // Mark as read on hover
              role="listitem"
              tabIndex={0} // Make it focusable
              aria-label={`Notification: ${n.title}. ${n.message}`}
            >
              {n.icon && <img src={n.icon} alt="" style={notificationIconStyle} />}
              <div style={notificationContentStyle}>
                {n.title && <div style={notificationTitleStyle}>{n.title}</div>}
                <div style={notificationMessageStyle}>{n.message}</div>
                <div style={notificationTimestampStyle}>
                  {new Date(n.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <button
                style={dismissButtonStyle}
                onClick={(e) => handleDismiss(n.id, e)}
                aria-label={`Dismiss notification: ${n.title}`}
              >
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationCenter;
