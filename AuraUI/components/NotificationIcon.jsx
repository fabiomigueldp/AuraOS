// AuraUI/components/NotificationIcon.jsx
import React from 'react';

const iconStyle = {
  cursor: 'pointer',
  padding: '0 10px', // Consistent with other top-bar buttons
  display: 'flex',
  alignItems: 'center',
  position: 'relative', // For badge positioning
};

const svgStyle = {
  width: '20px',
  height: '20px',
  fill: 'var(--text-color)',
};

const badgeStyle = {
  position: 'absolute',
  top: '-5px',
  right: '0px',
  background: 'var(--red-accent)',
  color: 'white',
  borderRadius: '50%',
  padding: '2px 5px',
  fontSize: '0.7em',
  fontWeight: 'bold',
  minWidth: '10px',
  textAlign: 'center',
  lineHeight: '1',
  boxShadow: '0 0 5px rgba(0,0,0,0.3)',
};

const NotificationIcon = ({ unreadCount, onClick }) => {
  return (
    <div style={iconStyle} onClick={onClick} title="Notifications">
      <svg viewBox="0 0 24 24" style={svgStyle}>
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
      </svg>
      {unreadCount > 0 && (
        <span style={badgeStyle}>{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </div>
  );
};

export default NotificationIcon;
