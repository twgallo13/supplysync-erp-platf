import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  House, 
  Package, 
  ShoppingCart, 
  ClipboardText, 
  CheckCircle, 
  Scan,
  ChartLine,
  Gear,
  IconProps
} from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { cn } from '@/lib/utils'
import { ForwardRefExoticComponent } from 'react'

interface NavItem {
  icon: ForwardRefExoticComponent<IconProps>
  label: string
  key: string
  roles: string[]
  badge?: string
}

const navItems: NavItem[] = [
  {
    icon: House,
    label: 'Dashboard',
    key: 'dashboard',
    roles: ['SM', 'DM', 'FM', 'COST_ANALYST', 'ADMIN']
  },
  {
    icon: Package,
    label: 'Product Catalog',
    key: 'catalog',
    roles: ['SM', 'DM', 'FM']
  },
  {
    icon: ShoppingCart,
    label: 'My Orders',
    key: 'orders',
    roles: ['SM', 'DM', 'FM']
  },
  {
    icon: ClipboardText,
    label: 'Approval Queue',
    key: 'approvals',
    roles: ['DM', 'FM'],
    badge: '3'
  },
  {
    icon: CheckCircle,
    label: 'Fulfillment',
    key: 'fulfillment',
    roles: ['FM']
  },
  {
    icon: Scan,
    label: 'Receiving',
    key: 'receiving',
    roles: ['SM', 'FM']
  },
  {
    icon: ChartLine,
    label: 'Analytics',
    key: 'analytics',
    roles: ['COST_ANALYST', 'FM', 'ADMIN']
  },
  {
    icon: Gear,
    label: 'Settings',
    key: 'settings',
    roles: ['ADMIN']
  }
]

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user } = useAuth()

  if (!user) return null

  const allowedItems = navItems.filter(item => 
    item.roles.includes(user.role)
  )

  return (
    <aside className="w-64 border-r bg-card/30 h-[calc(100vh-73px)]">
      <nav className="p-4 space-y-2">
        {allowedItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.key
          
          return (
            <Button
              key={item.key}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                isActive && "bg-primary text-primary-foreground"
              )}
              onClick={() => onViewChange(item.key)}
            >
              <Icon size={20} weight={isActive ? "fill" : "regular"} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"}
                  className="h-5 px-2 text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}