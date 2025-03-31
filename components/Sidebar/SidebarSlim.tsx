import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { IconAdjustments, IconBrandGithub, IconHelp, IconHome, IconMenu2, IconMoon, IconSun } from '@tabler/icons-react';
import { useContext } from 'react';
import HomeContext from '@/pages/api/home/home.context';

interface Props {
  onToggle: () => void;
}

export const SidebarSlim: FC<Props> = ({ onToggle }) => {
  const { t } = useTranslation('sidebar');
  
  const {
    state: { lightMode },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleThemeChange = () => {
    const newLightMode = lightMode === 'light' ? 'dark' : 'light';
    homeDispatch({ field: 'lightMode', value: newLightMode });
    localStorage.setItem('theme', newLightMode);
  };

  return (
    <div className="fixed left-0 top-0 z-20 flex h-full w-[60px] flex-col items-center border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-[#202123]">
      <div className="flex w-full flex-col items-center">
        <div 
          className="mt-5 mb-2 flex cursor-pointer justify-center hover:bg-gray-100 dark:hover:bg-gray-700 w-full py-3"
          onClick={onToggle}
        >
          <IconMenu2 className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
        
        <div className="mb-4 flex justify-center">
          <IconHome className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>
      </div>

      <div className="mt-auto mb-5 flex flex-col items-center gap-5">
        <div 
          className="cursor-pointer rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleThemeChange}
        >
          {lightMode === 'light' ? (
            <IconMoon className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          ) : (
            <IconSun className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
          )}
        </div>

        <div className="cursor-pointer rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
          <IconAdjustments className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>

        <div className="cursor-pointer rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
          <IconHelp className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </div>

        <a 
          href="https://github.com/ifLab/eduhub" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="cursor-pointer rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <IconBrandGithub className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </a>
      </div>
    </div>
  );
}; 