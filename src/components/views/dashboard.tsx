import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, ClipboardText, Package, TrendUp } from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { mockOrders } from '@/lib/mock-data'

interface DashboardProps {
  onViewChange: (view: string) => void
}

export function Dashboard({ onViewChange }: DashboardProps) {
  const { user } = useAuth()

  if (!user) return null

  const userOrders = mockOrders.filter(order => {
    if (user.role === 'SM') {
      return order.store_id === user.assignment.id
    }
    return true
  })

  const pendingApprovals = mockOrders.filter(order => {
    if (user.role === 'DM') {
      return order.status === 'PENDING_DM_APPROVAL'
    }
    if (user.role === 'FM') {
      return order.status === 'PENDING_FM_APPROVAL'
    }
    return false
  }).length

  const recentOrders = userOrders.slice(0, 3)
  const totalValue = userOrders.reduce((sum, order) => sum + order.total_cost, 0)

  const getStatusBadge = (status: string) => {
    const variants = {
      'DELIVERED': 'default',
      'PENDING_DM_APPROVAL': 'secondary',
      'PENDING_FM_APPROVAL': 'secondary', 
      'IN_TRANSIT': 'outline',
      'APPROVED_FOR_FULFILLMENT': 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace(/_/g, ' ')}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.full_name}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        {(user.role === 'DM' || user.role === 'FM') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <ClipboardText size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your review
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendUp size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Your latest supply requests</CardDescription>
            </div>
            <Button variant="outline" onClick={() => onViewChange('orders')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.order_id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="space-y-1">
                  <p className="font-medium">Order #{order.order_id.slice(-6)}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.line_items.length} items • ${order.total_cost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(order.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {user.role === 'SM' && (
              <>
                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-12"
                  onClick={() => onViewChange('catalog')}
                >
                  <Package size={18} />
                  Browse Product Catalog
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start gap-2 h-12"
                  onClick={() => onViewChange('orders')}
                >
                  <ShoppingCart size={18} />
                  Create New Order
                </Button>
              </>
            )}
            
            {(user.role === 'DM' || user.role === 'FM') && (
              <Button 
                variant="outline" 
                className="justify-start gap-2 h-12"
                onClick={() => onViewChange('approvals')}
              >
                <ClipboardText size={18} />
                Review Pending Approvals
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}