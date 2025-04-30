import { useState, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

const { Title, Paragraph } = Typography;

interface UpdateInfo {
  version?: string;
  title: string;
  content: string[];
  date?: string;
}

interface UpdateNotificationProps {
  updateInfo?: UpdateInfo;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  width?: number | string;
}

export const UpdateNotification = ({
  updateInfo,
  onClose,
  position = 'top-right',
  width = 350,
}: UpdateNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (updateInfo) {
      setIsVisible(true);
    }
  }, [updateInfo]);

  if (!updateInfo || !isVisible) {
    return null;
  }

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return { top: '1rem', right: '1rem' };
      case 'top-left':
        return { top: '1rem', left: '1rem' };
      case 'bottom-right':
        return { bottom: '1rem', right: '1rem' };
      case 'bottom-left':
        return { bottom: '1rem', left: '1rem' };
      default:
        return { top: '1rem', right: '1rem' };
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 1000,
        ...getPositionStyles(),
        width: width,
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '16px',
        animation: 'slideIn 0.3s ease-out forwards',
      }}
      className="update-notification"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
            {updateInfo.title}
            {updateInfo.version && ` (v${updateInfo.version})`}
          </span>
          {updateInfo.date && (
            <span style={{ fontSize: '12px', color: '#888' }}>{updateInfo.date}</span>
          )}
        </div>
        <Button
          type="text"
          icon={<CloseOutlined />}
          size="small"
          onClick={handleClose}
          style={{ marginLeft: 'auto' }}
          aria-label="关闭"
        />
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {updateInfo.content.map((item, index) => (
          <Paragraph key={index} style={{ margin: '8px 0' }}>
            {item}
          </Paragraph>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .update-notification {
          max-height: 80vh;
        }
      `}</style>
    </div>
  );
};

export default UpdateNotification; 