import { useState, useEffect } from 'react';

export const useMobileDetection = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check if window is defined (for server-side rendering)
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      } else {
        setIsMobile(false); // Default to false on server
      }
    };

    // Initial check
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}; 