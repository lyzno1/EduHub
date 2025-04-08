import { useState, useEffect } from 'react';

export enum MediaType {
  mobile = 'mobile',
  tablet = 'tablet',
  desktop = 'desktop'
}

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024
};

export function useBreakpoints() {
  const [media, setMedia] = useState<MediaType>(MediaType.desktop);

  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.tablet) {
        setMedia(MediaType.mobile);
      } else if (width < BREAKPOINTS.desktop) {
        setMedia(MediaType.tablet);
      } else {
        setMedia(MediaType.desktop);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return media;
} 