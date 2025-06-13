// AuraUI/components/NotificationToast.jsx
import React, { useState, useEffect } from 'react';

// Basic styling for the toast. In a real OS, this would come from a theming system.
const toastStyle = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  padding: '10px 15px',
  borderRadius: '5px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
  zIndex: 1000, // Ensure it's above most other content
  display: 'flex',
  alignItems: 'center',
  maxWidth: '300px',
  opacity: 0,
  transform: 'translateY(20px)',
  transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
};

const iconStyle = {
  width: '20px',
  height: '20px',
  marginRight: '10px',
  objectFit: 'contain', // Ensure icon scales nicely
};

const contentStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const titleStyle = {
  fontWeight: 'bold',
  fontSize: '0.9em',
  marginBottom: '3px',
};

const messageStyle = {
  fontSize: '0.8em',
};

const NotificationToast = ({ notification, onDismiss, autoDismissTimeout = 5000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true); // Trigger fade-in

      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissTimeout);

      return () => clearTimeout(timer);
    }
  }, [notification, autoDismissTimeout]);

  const handleDismiss = () => {
    setVisible(false); // Trigger fade-out
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      if (onDismiss && notification) {
        onDismiss(notification.id);
      }
    }, 500); // Corresponds to transition duration
  };

  const handleClick = () => {
    if (notification && notification.onClick) {
      try {
        notification.onClick();
      } catch (e) {
        console.error("Error in notification onClick handler:", e);
      }
    }
    handleDismiss(); // Dismiss on click as well
  };

  if (!notification) {
    return null;
  }

  const currentToastStyle = {
    ...toastStyle,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    cursor: notification.onClick ? 'pointer' : 'default',
  };

  return (
    <div style={currentToastStyle} onClick={handleClick} role="alert">
      {notification.icon && <img src={notification.icon} alt="icon" style={iconStyle} />}
      <div style={contentStyle}>
        {notification.title && <div style={titleStyle}>{notification.title}</div>}
        <div style={messageStyle}>{notification.message}</div>
      </div>
    </div>
  );
};

export default NotificationToast;

// Example of how this component might be used (conceptual)
// This part would live in the main OS shell UI layer

/*
import NotificationManager from 'AuraOS/core/NotificationManager';

const AppShell = () => {
  const [currentToast, setCurrentToast] = useState(null);

  useEffect(() => {
    const showToast = (notification) => {
      setCurrentToast(notification);
    };

    // This is a simplified way to get the latest notification for a toast.
    // A more robust system might involve a queue or a dedicated state in NotificationManager
    // for the current toast.
    const handleNotificationsUpdate = (notifications) => {
      if (notifications.length > 0) {
        const latestNotification = notifications[notifications.length - 1]; // Assuming newest is last
        // Only show toast if it's new and hasn't been shown or if it's a different one
        if (!currentToast || (currentToast && currentToast.id !== latestNotification.id && !latestNotification.read)) {
           // A real implementation would need to ensure a toast is shown only once
           // This might involve marking a notification as "toasted"
           showToast(latestNotification);
        }
      } else {
        setCurrentToast(null);
      }
    };

    const unsubscribe = NotificationManager.subscribe((notifications) => {
        // For toasts, we're typically interested in the *newest* unread notification.
        // The NotificationManager would need a way to signal "show this as a toast".
        // For simplicity, let's assume the manager calls a specific method for toasts
        // or we derive it here.
        const latestUnread = notifications.find(n => !n.read); // This is still not perfect for toasts
        if (latestUnread) {
             // This logic is flawed for a real toast system.
             // We'll need a dedicated mechanism in NotificationManager to trigger a toast.
             // For now, this is a placeholder.
        }
    });


    // A better way: NotificationManager explicitly triggers a toast
    // This would be a new method in NotificationManager e.g., setGlobalToast(notification)
    // NotificationManager.onShowToast = (notification) => {
    //   setCurrentToast(notification);
    // };


    return () => {
      unsubscribe();
      // NotificationManager.onShowToast = null; // Clean up
    };
  }, [currentToast]);

  const handleDismissToast = (id) => {
    NotificationManager.markAsRead(id); // Or a specific dismissToast action
    setCurrentToast(null);
  };

  return (
    <div>
      {/* ... other OS UI elements ... *\/}
      {currentToast && (
        <NotificationToast
          notification={currentToast}
          onDismiss={handleDismissToast}
        />
      )}
    </div>
  );
};
*/
