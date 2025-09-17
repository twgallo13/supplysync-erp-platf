import { User, Notification, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MobileLayout } from '../layout/mobile-layout'
import { MobileQuickActions } from '../mobile/mobile-quick-actions'
import { useAuth } from '../auth-provider'

interface MobileDashboardProps {
  onViewChange?: (view: string) => void
}

export function MobileDashboard({ onViewChange }: MobileDashboardProps) {
  const { user } = useAuth()

  const notifications = [
    {
      id: '1',
      title: 'Shipment Arriving',
      message: 'PO #1234 expected at 2:30 PM',
      priority: 'high',
      time: '10 min ago'
    },
    {
      id: '2', 
      title: 'Low Stock Alert',
      message: 'Receipt paper below minimum',
      priority: 'medium',
      time: '1 hour ago'
    }
  ]

  const stats = [
    {
      label: 'Pending Receives',
      value: '3',
      change: '+2 today'
    },
    {
      label: 'Items Scanned',
      value: '47',
      change: '+12 today'
    },
    {
      label: 'Exceptions',
      value: '2',
      change: 'Needs attention'
    }
  ]

  return (
    <MobileLayout showNavigation={false}>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground">
              {user?.full_name || 'Warehouse User'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Notification size={20} />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center p-0">
                  {notifications.length}
                </Badge>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => onViewChange?.('settings')}
            >
              <Gear size={20} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <Card key={index} className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-xs font-medium text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {stat.change}
              </div>
            </Card>
          ))}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Notification size={18} />
              Notifications
            </h2>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      notification.priority === 'high' ? 'bg-red-500' :
                      notification.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight mb-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <MobileQuickActions onViewChange={onViewChange} />
        </div>

        {/* Safety Reminder */}
        <Card className="p-4 bg-accent/5 border-accent/20">
          <h3 className="font-semibold text-accent-foreground mb-2">
            Safety Reminder
          </h3>
          <p className="text-sm text-accent-foreground/80">
            Remember to follow proper lifting techniques and wear safety equipment when handling inventory.
          </p>
        </Card>
      </div>
    </MobileLayout>
  )
}