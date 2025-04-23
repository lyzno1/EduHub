import {
    IconTestPipe,
    IconCode,
    IconInfoCircle,
    IconHelp,
    IconMoodBoy,
    IconWorldWww,
    IconDatabase,
    IconBook,
    IconMessageChatbot,
    IconPencil,
    IconMessageCircleQuestion,
    IconBulb,
    IconPresentation,
    IconListDetails,
    IconCheckbox,
    IconMessageReport,
    IconUsers,
    IconQuestionMark
} from '@tabler/icons-react';
import React from 'react';

// Define the mapping for all possible card icons here
export const iconMapForAllCards: { [key: string]: React.ComponentType<any> } = {
    IconTestPipe: IconTestPipe,
    IconCode: IconCode,
    IconInfoCircle: IconInfoCircle,
    IconHelp: IconHelp,
    IconMoodBoy: IconMoodBoy,
    IconWorldWww: IconWorldWww,
    IconDatabase: IconDatabase,
    IconBook: IconBook,
    IconMessageChatbot: IconMessageChatbot,
    IconPencil: IconPencil,
    IconMessageCircleQuestion: IconMessageCircleQuestion,
    IconBulb: IconBulb,
    IconPresentation: IconPresentation,
    IconListDetails: IconListDetails,
    IconCheckbox: IconCheckbox,
    IconMessageReport: IconMessageReport,
    IconUsers: IconUsers,
    IconQuestionMark: IconQuestionMark, // Fallback
};

// Define the cycle of theme colors for App Pages
// Ensure this aligns with the ThemeColor type expected by AppPageTemplate
export const themeColorCycle = ['green', 'amber', 'blue', 'purple'] as const; 