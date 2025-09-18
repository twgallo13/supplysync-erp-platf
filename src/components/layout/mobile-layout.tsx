import { ReactNode, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { MobileNavigation } from './mobile-navigation'

interface MobileLayoutProps {
  children: ReactNode
  title?: string
  showNavigation?: boolean
  className?: string
  activeView?: string
  onViewChange?: (view: string) => void
}

export function MobileLayout({ 
  children, 
  title, 
  showNavigation = true, 
  className,
  activeView,
  onViewChange
}: MobileLayoutProps) {
  // Prevent zoom on double tap for better UX on warehouse devices
  useEffect(() => {
    let lastTouchEnd = 0
    const preventZoom = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }

    document.addEventListener('touchend', preventZoom, { passive: false })
    return () => document.removeEventListener('touchend', preventZoom)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col touch-manipulation">
      {/* Mobile Header with improved touch targets */}
      {title && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border safe-top">
          <div className="px-4 py-4 min-h-[56px] flex items-center">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h1>
          </div>
        </header>
      )}
      
      {/* Main Content Area with safe area handling */}
      <main className={cn(
        "flex-1 overflow-auto overscroll-contain",
        // Improve scroll performance on mobile
        "transform-gpu will-change-scroll",
        // Handle safe areas for notched devices
        "safe-left safe-right",
        className
      )}>
        {children}
      </main>
      
      {/* Mobile Bottom Navigation with safe area */}
      {showNavigation && (
        <MobileNavigation 
          activeView={activeView} 
          onViewChange={onViewChange}
        />
      )}
    </div>
  )
}