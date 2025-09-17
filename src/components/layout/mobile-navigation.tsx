import { Scan, Package, ChartBar, Gear, House } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

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

  return (
    <nav className="sticky bottom-0 bg-card border-t border-border">
      <div className="grid grid-cols-5 gap-1 p-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          const isPrimary = item.primary
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange?.(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 touch-manipulation",
                "min-h-[60px] text-xs font-medium",
                isPrimary && !isActive && "bg-primary text-primary-foreground shadow-lg",
                isPrimary && isActive && "bg-accent text-accent-foreground shadow-lg scale-110",
                !isPrimary && isActive && "bg-muted text-foreground",
                !isPrimary && !isActive && "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon 
                size={isPrimary ? 24 : 20} 
                weight={isActive ? "fill" : "regular"}
                className="mb-1"
              />
              <span className={cn(
                "leading-none",
                isPrimary && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Safe area padding for devices with home indicators */}
      <div className="h-[env(safe-area-inset-bottom)] bg-card" />
    </nav>
  )
}