import { MouseEventHandler, ReactElement } from 'react';

interface Props {
  handleClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactElement;
  className?: string;
}

const SidebarActionButton = ({ handleClick, children, className }: Props) => (
  <button
    className={`min-w-[20px] p-1 ${className || 'text-neutral-200 hover:text-neutral-100'}`}
    onClick={handleClick}
  >
    {children}
  </button>
);

export default SidebarActionButton;
