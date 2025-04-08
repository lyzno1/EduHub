import { useBreakpoints, MediaType } from '@/hooks/useBreakpoints';

export const Chat = () => {
  const media = useBreakpoints();
  const isMobile = media === MediaType.mobile;

  return (
    <div className={cn(
      'flex h-full flex-col bg-white',
      isMobile ? 'px-2' : 'px-4'
    )}>
      <div className={cn(
        'flex flex-col grow overflow-auto',
        isMobile ? 'gap-3' : 'gap-4'
      )}>
        <div className="messages-container">
          {/* ... existing messages code ... */}
        </div>
      </div>
      <div className={cn(
        'flex flex-col shrink-0',
        isMobile ? 'pb-2 px-2' : 'pb-4 px-4'
      )}>
        <ChatInput 
          isMobile={isMobile}
          onSend={handleSend}
          disabled={isResponding}
        />
      </div>
    </div>
  );
}; 