import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  User,
  Gear,
  Bell,
  Vibrate,
  Moon,
  Globe,
  Shield,
  Database,
  ChevronRight
} from '@phosphor-icons/react'
import { MobileLayout } from '../layout/mobile-layout'
import { HapticSettingsCard } from '../mobile/haptic-settings'
import { useAuth } from '../auth-provider'
import { toast } from 'sonner'

interface MobileSettingsProps {
  onViewChange?: (view: string) => void
}

export function MobileSettings({ onViewChange }: MobileSettingsProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [offlineMode, setOfflineMode] = useState(false)

  const settingsGroups = [
    {
      title: 'Account',
      icon: User,
      items: [
        {
          label: 'Profile',
          value: user?.full_name || 'Unknown User',
          action: () => toast.info('Profile editing coming soon')
        },
        {
          label: 'Role',
          value: user?.role || 'N/A',
          badge: true
        },
        {
          label: 'Store Assignment',
          value: user?.assignment?.id || 'Not assigned',
          action: () => toast.info('Store assignment managed by admin')
        }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          label: 'Push Notifications',
          toggle: true,
          value: notifications,
          onChange: (checked: boolean) => {
            setNotifications(checked)
            toast.success(checked ? 'Notifications enabled' : 'Notifications disabled')
          }
        },
        {
          label: 'Notification Sound',
          select: true,
          value: 'default',
          options: [
            { value: 'default', label: 'Default' },
            { value: 'subtle', label: 'Subtle' },
            { value: 'silent', label: 'Silent' }
          ]
        }
      ]
    },
    {
      title: 'Sync & Storage',
      icon: Database,
      items: [
        {
          label: 'Auto Sync',
          toggle: true,
          value: autoSync,
          onChange: (checked: boolean) => {
            setAutoSync(checked)
            toast.success(checked ? 'Auto sync enabled' : 'Auto sync disabled')
          }
        },
        {
          label: 'Offline Mode',
          toggle: true,
          value: offlineMode,
          onChange: (checked: boolean) => {
            setOfflineMode(checked)
            toast.success(checked ? 'Offline mode enabled' : 'Offline mode disabled')
          }
        },
        {
          label: 'Clear Cache',
          action: () => {
            toast.success('Cache cleared successfully')
          }
        }
      ]
    }
  ]

  const renderSettingItem = (item: any, index: number) => {
    if (item.toggle) {
      return (
        <div key={index} className="flex items-center justify-between py-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">{item.label}</Label>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
          <Switch
            checked={item.value}
            onCheckedChange={item.onChange}
          />
        </div>
      )
    }

    if (item.select) {
      return (
        <div key={index} className="py-3 space-y-2">
          <Label className="text-sm font-medium">{item.label}</Label>
          <Select value={item.value} onValueChange={item.onChange}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.options.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    return (
      <div 
        key={index} 
        className="flex items-center justify-between py-3"
        onClick={item.action}
      >
        <div className="space-y-1">
          <p className="text-sm font-medium">{item.label}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{item.value}</p>
            {item.badge && (
              <Badge variant="outline" className="text-xs">
                {item.value}
              </Badge>
            )}
          </div>
        </div>
        {item.action && <ChevronRight size={16} className="text-muted-foreground" />}
      </div>
    )
  }

  return (
    <MobileLayout title="Settings" showNavigation={false}>
      <div className="p-4 space-y-6 pb-20">
        {/* User Info Card */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">{user?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {user?.role}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Haptic Feedback Settings */}
        <HapticSettingsCard />

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => {
          const Icon = group.icon
          return (
            <Card key={groupIndex} className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-muted rounded-lg">
                  <Icon size={18} className="text-muted-foreground" />
                </div>
                <h3 className="font-semibold">{group.title}</h3>
              </div>
              
              <div className="space-y-1">
                {group.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
              </div>
            </Card>
          )
        })}

        {/* System Info */}
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Gear size={18} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold">System Info</h3>
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>App Version:</span>
                <span>v2.1.0</span>
              </div>
              <div className="flex justify-between">
                <span>Build:</span>
                <span>#1247</span>
              </div>
              <div className="flex justify-between">
                <span>Last Sync:</span>
                <span>2 min ago</span>
              </div>
              <div className="flex justify-between">
                <span>Device ID:</span>
                <span>MOB-{user?.user_id?.slice(-8)}</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1 h-10">
                Check Updates
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-10">
                Support
              </Button>
            </div>
          </div>
        </Card>

        {/* Sign Out */}
        <Card className="p-4">
          <Button 
            variant="destructive" 
            className="w-full h-12"
            onClick={() => toast.info('Sign out functionality would be implemented here')}
          >
            Sign Out
          </Button>
        </Card>
      </div>
    </MobileLayout>
  )
}