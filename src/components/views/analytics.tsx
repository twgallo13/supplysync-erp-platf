import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ChartLine, 
  TrendUp, 
  TrendDown, 
  CurrencyDollar, 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  Warning
} from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { mockOrders, mockProducts, mockStores } from '@/lib/mock-data'

interface AnalyticsProps {
  onViewChange: (view: string) => void
}

export function Analytics({ onViewChange }: AnalyticsProps) {
  const { user } = useAuth()

  if (!user || !['COST_ANALYST', 'FM', 'ADMIN'].includes(user.role)) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view analytics.</p>
      </div>
    )
  }

  // Calculate analytics data
  const totalOrders = mockOrders.length
  const deliveredOrders = mockOrders.filter(o => o.status === 'DELIVERED').length
  const pendingOrders = mockOrders.filter(o => 
    o.status.includes('PENDING') || o.status === 'APPROVED_FOR_FULFILLMENT'
  ).length
  const rejectedOrders = mockOrders.filter(o => o.status === 'REJECTED').length
  
  const totalValue = mockOrders.reduce((sum, order) => sum + order.total_cost, 0)
  const avgOrderValue = totalValue / totalOrders
  const deliveryRate = (deliveredOrders / totalOrders) * 100

  // Vendor performance data
  const vendorPerformance = [
    { name: 'Staples', orders: 45, onTime: 92, avgCost: 24.99, rating: 'Excellent' },
    { name: 'Costco', orders: 38, onTime: 89, avgCost: 22.50, rating: 'Good' },
    { name: 'Sysco', orders: 52, onTime: 95, avgCost: 4.75, rating: 'Excellent' },
    { name: 'Uline', orders: 28, onTime: 87, avgCost: 15.25, rating: 'Good' },
    { name: 'POS Mate', orders: 19, onTime: 94, avgCost: 38.99, rating: 'Excellent' }
  ]

  // Category performance
  const categoryData = [
    { category: 'Office Supplies', orders: 62, spend: 1547.38, trend: '+12%' },
    { category: 'Cleaning Supplies', orders: 43, spend: 204.25, trend: '-3%' },
    { category: 'POS Supplies', orders: 28, spend: 1091.72, trend: '+8%' },
    { category: 'Store Supplies', orders: 35, spend: 533.75, trend: '+5%' },
    { category: 'Health & Safety', orders: 15, spend: 194.85, trend: '+18%' }
  ]

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-100 text-green-800'
      case 'Good': return 'bg-blue-100 text-blue-800'
      case 'Fair': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrendColor = (trend: string) => {
    return trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
  }

  const getTrendIcon = (trend: string) => {
    return trend.startsWith('+') ? <TrendUp size={14} /> : <TrendDown size={14} />
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supply Chain Analytics</h1>
          <p className="text-muted-foreground">
            Performance insights and operational metrics
          </p>
        </div>
        <Select defaultValue="30days">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="1year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendUp size={12} className="text-green-600" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <CurrencyDollar size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendDown size={12} className="text-red-600" />
              -3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <ChartLine size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendUp size={12} className="text-green-600" />
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <CheckCircle size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendUp size={12} className="text-green-600" />
              +2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
          <TabsTrigger value="categories">Category Analysis</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Order Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
                <CardDescription>Current status of all orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm">Delivered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{deliveredOrders}</span>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(deliveredOrders / totalOrders) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-yellow-600" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{pendingOrders}</span>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full" 
                          style={{ width: `${(pendingOrders / totalOrders) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="text-red-600" />
                      <span className="text-sm">Rejected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rejectedOrders}</span>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${(rejectedOrders / totalOrders) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>System notifications and warnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Warning size={16} className="text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Vendor SLA Breach</p>
                      <p className="text-xs text-muted-foreground">Staples delivery 2 days overdue</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Package size={16} className="text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Low Stock Alert</p>
                      <p className="text-xs text-muted-foreground">Receipt paper below reorder point</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle size={16} className="text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Cost Savings</p>
                      <p className="text-xs text-muted-foreground">$245 saved through vendor optimization</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance Scorecard</CardTitle>
              <CardDescription>Delivery performance and cost analysis by vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorPerformance.map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.orders} orders • Avg: ${vendor.avgCost}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{vendor.onTime}% on-time</p>
                        <p className="text-xs text-muted-foreground">Delivery rate</p>
                      </div>
                      <Badge variant="outline" className={getPerformanceColor(vendor.rating)}>
                        {vendor.rating}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Spending trends and order volume by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{category.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.orders} orders this month
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">${category.spend.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total spend</p>
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${getTrendColor(category.trend)}`}>
                        {getTrendIcon(category.trend)}
                        {category.trend}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Dashboard</CardTitle>
              <CardDescription>Audit trail and compliance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
                  <p className="font-semibold text-green-800">100%</p>
                  <p className="text-sm text-green-700">Audit Compliance</p>
                </div>
                
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Package size={32} className="mx-auto text-blue-600 mb-2" />
                  <p className="font-semibold text-blue-800">847</p>
                  <p className="text-sm text-blue-700">Audit Entries</p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <Clock size={32} className="mx-auto text-purple-600 mb-2" />
                  <p className="font-semibold text-purple-800">2.3 days</p>
                  <p className="text-sm text-purple-700">Avg Approval Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}