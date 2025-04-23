import React from 'react';
import { AppPageTemplate } from '@/components/AppPages/common/AppPageTemplate';
import { DifyFolderConfig } from '@/types/dify';
import { themeColorCycle, iconMapForAllCards } from '@/constants/uiConstants'; // Assuming these are exported

interface AppInitialPageProps {
  activeAppConfig: DifyFolderConfig | null;
  activeThemeColor: typeof themeColorCycle[number];
  iconMap: typeof iconMapForAllCards;
  activeAppId: string | number | null; // Assuming appId can be string or number
}

export const AppInitialPage: React.FC<AppInitialPageProps> = ({
  activeAppConfig,
  activeThemeColor,
  iconMap,
  activeAppId,
}) => {
  return (
    <div className="flex-1 overflow-auto p-4 h-full">
      {/* Render AppPageTemplate using activeAppConfig */}
      {activeAppConfig ? (
        <AppPageTemplate
          config={activeAppConfig} // Pass the full folder config
          themeColor={activeThemeColor} // Pass the calculated cycle color
          iconMap={iconMap} // Pass the complete icon map
        />
      ) : (
        // Fallback if config not found for the activeAppId
        // Check activeAppId against 0 or null/undefined depending on type
        activeAppId !== null && activeAppId !== undefined && activeAppId !== 0 && (
          <div className="text-red-500 text-center p-4">Error: Configuration for App ID {activeAppId} not found.</div>
        )
      )}
    </div>
  );
};

AppInitialPage.displayName = 'AppInitialPage'; 