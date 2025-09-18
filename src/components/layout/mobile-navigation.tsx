import { Scan, Package, ChartBar, Gear, House } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { haptics } from '@/lib/haptics'

interface MobileNavigationProps {
  activeView?: string
  onViewChange?: (view: string) => void
}

export function MobileNavigation({ activeView, onViewChange }: MobileNavigationProps) {
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: House
    },
    {
      id: 'scan',
      label: 'Scan',
      icon: Scan,
      primary: true
    },
    {
      id: 'receiving',
      label: 'Receive',
      icon: Package
    },
    {
      id: 'analytics',
      label: 'Reports',
      icon: ChartBar
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Gear
    }
  ]

  const handleNavigation = (itemId: string, isPrimary?: boolean) => {
    // Different haptic feedback for primary vs secondary navigation
    if (isPrimary) {
      haptics.medium() // Stronger feedback for primary scan action
    } else {
      haptics.light() // Light feedback for secondary navigation
    }
    
    onViewChange?.(itemId)
  }

  return (
    <nav className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border safe-bottom">
      <div className="grid grid-cols-5 gap-1 p-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          const isPrimary = item.primary
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id, isPrimary)}
              className={cn(
                // Base styles with improved touch targets
                "flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-200",
                "min-h-[64px] min-w-[44px] text-xs font-medium touch-manipulation",
                // Improved active states for better feedback
                "active:scale-95 transform-gpu",
                // Primary scan button styling
                isPrimary && !isActive && "bg-primary text-primary-foreground shadow-lg scale-105",
                isPrimary && isActive && "bg-accent text-accent-foreground shadow-lg scale-110 ring-2 ring-primary/20",
                // Secondary navigation styling
                !isPrimary && isActive && "bg-muted text-foreground",
                !isPrimary && !isActive && "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                // Focus styles for accessibility
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              )}
              // Accessibility improvements
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon 
                size={isPrimary ? 28 : 22} 
                weight={isActive ? "fill" : "regular"}
                className="mb-1"
              />
              <span className={cn(
                "leading-none select-none",
                isPrimary && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Safe area padding for devices with home indicators */}
      <div className="h-[env(safe-area-inset-bottom)] bg-card/95" />
    </nav>
  )
}