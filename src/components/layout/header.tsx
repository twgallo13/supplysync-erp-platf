import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SignOut, Bell } from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'

const roleLabels = {
  SM: 'Store Manager',
  DM: 'District Manager', 
  FM: 'Facility Manager',
  COST_ANALYST: 'Cost Analyst',
  ADMIN: 'Administrator'
}

export function Header() {
  const { user, logout } = useAuth()

  if (!user) return null

  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-primary">SupplySync</h1>
          <Badge variant="outline" className="text-xs">ERP</Badge>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
              2
            </span>
          </Button>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-medium text-sm">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <SignOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  )
}