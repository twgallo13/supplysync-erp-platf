import { Package, Scan, ClockCounterClockwise, Warning, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  count?: number
  priority?: 'low' | 'medium' | 'high'
  onClick: () => void
}

interface MobileQuickActionsProps {
  onViewChange?: (view: string) => void
}

export function MobileQuickActions({ onViewChange }: MobileQuickActionsProps) {
  const quickActions: QuickAction[] = [
    {
      id: 'scan',
      title: 'Scan Items',
      description: 'Scan barcodes to locate or receive items',
      icon: Scan,
      onClick: () => onViewChange?.('scan')
    },
    {
      id: 'receive',
      title: 'Receive Shipment',
      description: 'Process incoming deliveries',
      icon: Package,
      count: 3,
      priority: 'high',
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
      priority: 'high',
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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {quickActions.map((action) => {
        const Icon = action.icon
        return (
          <Card
            key={action.id}
            className="p-4 cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]"
            onClick={action.onClick}
          >
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  action.priority === 'high' ? 'bg-red-50 text-red-600' :
                  action.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                  action.priority === 'low' ? 'bg-green-50 text-green-600' :
                  'bg-primary/10 text-primary'
                )}>
                  <Icon size={24} />
                </div>
                {action.count && action.count > 0 && (
                  <Badge 
                    className={cn(
                      "absolute -top-2 -right-2 text-white text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center",
                      getPriorityColor(action.priority)
                    )}
                  >
                    {action.count}
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight mb-1">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-tight">
                  {action.description}
                </p>
              </div>
              
              <div className="text-muted-foreground">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="rotate-0 transition-transform"
                >
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}