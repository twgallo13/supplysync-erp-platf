import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, ClipboardText, Package, TrendUp, ChartLine, CheckCircle } from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { Order } from '@/types'
import { apiService } from '@/services/api'

interface DashboardProps {
  onViewChange: (view: string) => void
}

export function Dashboard({ onViewChange }: DashboardProps) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    
    const loadDashboardData = async () => {
      try {
        setIsLoading(true)
        const ordersData = await apiService.getOrders(
          user.assignment.type === 'store' ? user.assignment.id : undefined
        )
        setOrders(ordersData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDashboardData()
  }, [user])

  if (!user) return null

  const pendingApprovals = orders.filter(order => {
    if (user.role === 'DM') {
      return order.status === 'PENDING_DM_APPROVAL'
    }
    if (user.role === 'FM') {
      return order.status === 'PENDING_FM_APPROVAL'
    }
    return false
  }).length

  const recentOrders = orders.slice(0, 5)
  const totalValue = orders.reduce((sum, order) => sum + order.total_cost, 0)
  const completedOrders = orders.filter(order => order.status === 'DELIVERED').length

  const getStatusBadge = (status: string) => {
    const variants = {
      'DELIVERED': 'default',
      'PENDING_DM_APPROVAL': 'secondary',
      'PENDING_FM_APPROVAL': 'secondary', 
      'IN_TRANSIT': 'outline',
      'APPROVED_FOR_FULFILLMENT': 'outline',
      'REJECTED': 'destructive'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const getRoleSpecificStats = () => {
    switch (user.role) {
      case 'SM':
        return [
          {
            title: 'Total Orders',
            value: orders.length.toString(),
            description: 'Orders from your store',
            icon: ShoppingCart
          },
          {
            title: 'In Transit',
            value: orders.filter(o => ['IN_TRANSIT', 'PARTIALLY_DELIVERED'].includes(o.status)).length.toString(),
            description: 'Orders on the way',
            icon: Package
          },
          {
            title: 'Total Value',
            value: `$${totalValue.toFixed(2)}`,
            description: 'All-time ordering value',
            icon: TrendUp
          }
        ]
      
      case 'DM':
        return [
          {
            title: 'Pending Approvals',
            value: pendingApprovals.toString(),
            description: 'Orders awaiting your review',
            icon: ClipboardText
          },
          {
            title: 'Total Orders',
            value: orders.length.toString(),
            description: 'Orders in your district',
            icon: ShoppingCart
          },
          {
            title: 'Completed',
            value: completedOrders.toString(),
            description: 'Successfully delivered',
            icon: CheckCircle
          }
        ]
      
      case 'FM':
        return [
          {
            title: 'Pending Reviews',
            value: pendingApprovals.toString(),
            description: 'Orders for final approval',
            icon: ClipboardText
          },
          {
            title: 'Total Value',
            value: `$${totalValue.toFixed(2)}`,
            description: 'Total order value managed',
            icon: TrendUp
          },
          {
            title: 'In Fulfillment',
            value: orders.filter(o => ['APPROVED_FOR_FULFILLMENT', 'IN_TRANSIT'].includes(o.status)).length.toString(),
            description: 'Orders being processed',
            icon: Package
          }
        ]
      
      default:
        return [
          {
            title: 'Total Orders',
            value: orders.length.toString(),
            description: 'System-wide orders',
            icon: ShoppingCart
          },
          {
            title: 'Total Value',
            value: `$${totalValue.toFixed(2)}`,
            description: 'Total system value',
            icon: TrendUp
          },
          {
            title: 'Analytics',
            value: 'Available',
            description: 'Performance insights',
            icon: ChartLine
          }
        ]
    }
  }

  const getQuickActions = () => {
    switch (user.role) {
      case 'SM':
        return [
          {
            label: 'Browse Product Catalog',
            icon: Package,
            action: () => onViewChange('catalog')
          },
          {
            label: 'View My Orders',
            icon: ShoppingCart,
            action: () => onViewChange('orders')
          }
        ]
      
      case 'DM':
      case 'FM':
        return [
          {
            label: 'Review Pending Approvals',
            icon: ClipboardText,
            action: () => onViewChange('approvals')
          },
          {
            label: 'View All Orders',
            icon: ShoppingCart,
            action: () => onViewChange('orders')
          }
        ]
      
      default:
        return [
          {
            label: 'View Analytics',
            icon: ChartLine,
            action: () => onViewChange('analytics')
          }
        ]
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
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
        {getRoleSpecificStats().map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest supply requests and updates</CardDescription>
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
                    <p className="font-medium">Order #{order.order_id.slice(-8)}</p>
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
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getQuickActions().map((action, index) => {
              const Icon = action.icon
              return (
                <Button 
                  key={index}
                  variant="outline" 
                  className="justify-start gap-3 h-12"
                  onClick={action.action}
                >
                  <Icon size={18} />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Actions Alert */}
      {pendingApprovals > 0 && (user.role === 'DM' || user.role === 'FM') && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <ClipboardText className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  {pendingApprovals} Order{pendingApprovals !== 1 ? 's' : ''} Awaiting Approval
                </h3>
                <p className="text-sm text-yellow-700">
                  Orders are waiting for your review and approval.
                </p>
              </div>
            </div>
            <Button onClick={() => onViewChange('approvals')} className="bg-yellow-600 hover:bg-yellow-700">
              Review Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}