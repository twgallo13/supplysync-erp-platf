import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../auth-provider'
import { 
  House, 
  Package, 
  ShoppingCart, 
  CheckSquare, 
  Truck, 
  Scan,
  ChartBar,
  ArrowsClockwise,
  Gear
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface SidebarItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  badge?: number
  permissions: string[]
  roles: string[]
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: House,
    permissions: [],
    roles: ['SM', 'DM', 'FM', 'COST_ANALYST', 'ADMIN']
  },
  {
    id: 'catalog',
    label: 'Order Supplies',
    icon: Package,
    permissions: ['catalog:view'],
    roles: ['SM']
  },
  {
    id: 'orders',
    label: 'My Orders',
    icon: ShoppingCart,
    permissions: ['orders:view_own', 'orders:view_district'],
    roles: ['SM', 'DM', 'FM']
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: CheckSquare,
    permissions: ['approvals:view_district'],
    roles: ['DM', 'FM']
  },
  {
    id: 'fulfillment',
    label: 'Fulfillment',
    icon: Truck,
    permissions: ['fulfillment:manage'],
    roles: ['FM']
  },
  {
    id: 'receiving',
    label: 'Receiving',
    icon: Scan,
    permissions: ['receiving:manage'],
    roles: ['SM', 'DM', 'FM']
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: ChartBar,
    permissions: ['analytics:view'],
    roles: ['DM', 'FM', 'COST_ANALYST', 'ADMIN']
  },
  {
    id: 'replenishment',
    label: 'Replenishment',
    icon: ArrowsClockwise,
    permissions: ['replenishment:manage'],
    roles: ['FM', 'ADMIN']
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Gear,
    permissions: ['settings:manage'],
    roles: ['ADMIN']
  }
]

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user } = useAuth()
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    // Mock pending counts - in real app, this would fetch from API
    if (user?.role === 'DM') {
      setPendingCounts({ approvals: 7 })
    } else if (user?.role === 'FM') {
      setPendingCounts({ 
        approvals: 3, 
        fulfillment: 12,
        replenishment: 5
      })
    }
  }, [user])

  const filteredItems = sidebarItems.filter(item => 
    item.roles.includes(user?.role || '')
  )

  return (
    <aside className="w-64 bg-card border-r border-border h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-2">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          const pendingCount = pendingCounts[item.id]

          return (
            <Button
              key={item.id}
              variant={isActive ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                isActive && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onViewChange(item.id)}
            >
              <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
              <span className="flex-1 text-left">{item.label}</span>
              {pendingCount && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}