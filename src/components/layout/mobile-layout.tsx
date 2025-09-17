import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { MobileNavigation } from './mobile-navigation'

interface MobileLayoutProps {
  children: ReactNode
  title?: string
  showNavigation?: boolean
  className?: string
}

export function MobileLayout({ 
  children, 
  title, 
  showNavigation = true, 
  className 
}: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      {title && (
        <header className="sticky top-0 z-50 bg-background border-b border-border">
          <div className="px-4 py-3">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {title}
            </h1>
          </div>
        </header>
      )}
      
      {/* Main Content Area */}
      <main className={cn("flex-1 overflow-auto", className)}>
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      {showNavigation && <MobileNavigation />}
    </div>
  )
}