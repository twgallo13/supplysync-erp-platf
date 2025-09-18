import { Package, Scan, ClockCounterClockwise, Warning, CheckCircle, CaretRight } from '@phosphor-icons/react'
import type { IconWeight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { haptics } from '@/lib/haptics'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string; weight?: IconWeight }>
  count?: number
  priority?: 'low' | 'medium' | 'high' | 'critical'
  onClick: () => void
  disabled?: boolean
}

interface MobileQuickActionsProps {
  onViewChange?: (view: string) => void
}

export function MobileQuickActions({ onViewChange }: MobileQuickActionsProps) {
  const handleActionClick = (action: QuickAction) => {
    if (action.disabled) {
      haptics.error()
      return
    }

    // Different haptic patterns based on action priority
    switch (action.priority) {
      case 'critical':
        haptics.heavy()
        break
      case 'high':
        haptics.medium()
        break
      case 'medium':
        haptics.light()
        break
      default:
        haptics.select()
    }

    action.onClick()
  }

  const quickActions: QuickAction[] = [
    {
      id: 'scan',
      title: 'Scan Items',
      description: 'Scan barcodes to locate or receive items',
      icon: Scan,
      priority: 'high',
      onClick: () => onViewChange?.('scan')
    },
    {
      id: 'receive',
      title: 'Receive Shipment',
      description: 'Process incoming deliveries',
      icon: Package,
      count: 3,
      priority: 'critical',
      onClick: () => onViewChange?.('receiving')
    },
    {
      id: 'pending',
      title: 'Pending Items',
      description: 'Items waiting for processing',
      icon: ClockCounterClockwise,
      count: 12,
      priority: 'medium',
      onClick: () => onViewChange?.('orders')
    },
    {
      id: 'exceptions',
      title: 'Exceptions',
      description: 'Items requiring attention',
      icon: Warning,
      count: 2,
      priority: 'critical',
      onClick: () => onViewChange?.('analytics')
    },
    {
      id: 'completed',
      title: 'Recent Completions',
      description: 'Successfully processed items',
      icon: CheckCircle,
      count: 15,
      priority: 'low',
      onClick: () => onViewChange?.('analytics')
    }
  ]

  const getPriorityStyles = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
          badge: 'bg-red-500 text-white',
          border: 'border-red-200 dark:border-red-800'
        }
      case 'high':
        return {
          bg: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
          badge: 'bg-orange-500 text-white',
          border: 'border-orange-200 dark:border-orange-800'
        }
      case 'medium':
        return {
          bg: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
          badge: 'bg-yellow-500 text-white',
          border: 'border-yellow-200 dark:border-yellow-800'
        }
      case 'low':
        return {
          bg: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
          badge: 'bg-green-500 text-white',
          border: 'border-green-200 dark:border-green-800'
        }
      default:
        return {
          bg: 'bg-primary/10 text-primary',
          badge: 'bg-primary text-primary-foreground',
          border: 'border-primary/20'
        }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {quickActions.map((action) => {
        const Icon = action.icon
        const styles = getPriorityStyles(action.priority)
        
        return (
          <Card
            key={action.id}
            className={cn(
              "p-4 cursor-pointer transition-all duration-200 border-2",
              "hover:shadow-md active:scale-[0.98] transform-gpu",
              // Enhanced touch targets for warehouse use
              "min-h-[80px] touch-manipulation",
              // High contrast mode support
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              styles.border,
              action.disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleActionClick(action)}
            // Accessibility improvements
            role="button"
            tabIndex={0}
            aria-label={`${action.title}: ${action.description}${action.count ? ` (${action.count} items)` : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleActionClick(action)
              }
            }}
          >
            <div className="flex items-center space-x-4">
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center shadow-sm",
                  styles.bg
                )}>
                  <Icon 
                    size={28} 
                    weight={action.priority === 'critical' ? 'fill' : 'regular'}
                  />
                </div>
                {action.count && action.count > 0 && (
                  <Badge 
                    className={cn(
                      "absolute -top-2 -right-2 text-white text-xs px-2 py-1 min-w-[24px] h-6 flex items-center justify-center font-semibold shadow-lg",
                      styles.badge
                    )}
                  >
                    {action.count > 99 ? '99+' : action.count}
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight mb-1.5">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-tight">
                  {action.description}
                </p>
                {action.priority === 'critical' && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                    Urgent attention required
                  </p>
                )}
              </div>
              
              <div className="text-muted-foreground flex-shrink-0">
                <CaretRight size={20} weight="bold" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}