import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Buildings, Shield, Users, ChartBar } from '@phosphor-icons/react'
import { useAuth } from './auth-provider'
import { UserRole } from '@/lib/types'

const roleInfo = {
  SM: {
    title: 'Store Manager',
    description: 'Manage supply orders for your store location',
    icon: Buildings,
    color: 'bg-blue-100 text-blue-800' as const
  },
  DM: {
    title: 'District Manager', 
    description: 'Review and approve store supply requests',
    icon: Users,
    color: 'bg-green-100 text-green-800' as const
  },
  FM: {
    title: 'Facility Manager',
    description: 'Final approval and fulfillment oversight',
    icon: Shield,
    color: 'bg-purple-100 text-purple-800' as const
  },
  COST_ANALYST: {
    title: 'Cost Analyst',
    description: 'Monitor financial performance and vendor SLAs',
    icon: ChartBar,
    color: 'bg-orange-100 text-orange-800' as const
  },
  ADMIN: {
    title: 'Administrator',
    description: 'System configuration and user management',
    icon: Shield,
    color: 'bg-red-100 text-red-800' as const
  }
}

export function LoginScreen() {
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">SupplySync ERP</h1>
          <p className="text-lg text-muted-foreground">Enterprise Supply Chain Management Platform</p>
          <Badge variant="secondary" className="mt-2">Demo Environment</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(roleInfo).map(([role, info]) => {
            const Icon = info.icon
            return (
              <Card key={role} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${info.color}`}>
                      <Icon size={24} weight="bold" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{info.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">{role}</Badge>
                    </div>
                  </div>
                  <CardDescription className="text-base">
                    {info.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => login(role as UserRole)}
                    className="w-full group-hover:bg-primary/90 transition-colors"
                    size="lg"
                  >
                    Sign In as {info.title}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            This is a demonstration environment. Select any role above to explore the SupplySync ERP platform.
          </p>
        </div>
      </div>
    </div>
  )
}