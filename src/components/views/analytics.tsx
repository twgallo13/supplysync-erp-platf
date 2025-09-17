import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  ChartLine, 
  TrendUp, 
  TrendDown, 
  CurrencyDollar, 
  Package, 
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Brain,
  Lightning,
  Target,
  Calendar,
  ArrowUp,
  ArrowDown,
  Equals,
  Snowflake,
  Sun,
  Leaf,
  Flower
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

  // Predictive Analytics Data
  const forecastAccuracy = [
    { 
      category: 'Office Supplies', 
      accuracy: 87.3, 
      lastMonth: 84.1, 
      trend: 'up',
      variance: 12.7,
      demandPattern: 'stable',
      confidence: 'high'
    },
    { 
      category: 'Cleaning Supplies', 
      accuracy: 91.2, 
      lastMonth: 89.8, 
      trend: 'up',
      variance: 8.8,
      demandPattern: 'seasonal',
      confidence: 'high'
    },
    { 
      category: 'POS Supplies', 
      accuracy: 78.9, 
      lastMonth: 82.3, 
      trend: 'down',
      variance: 21.1,
      demandPattern: 'volatile',
      confidence: 'medium'
    },
    { 
      category: 'Store Supplies', 
      accuracy: 93.5, 
      lastMonth: 91.2, 
      trend: 'up',
      variance: 6.5,
      demandPattern: 'predictable',
      confidence: 'high'
    },
    { 
      category: 'Health & Safety', 
      accuracy: 85.7, 
      lastMonth: 87.9, 
      trend: 'down',
      variance: 14.3,
      demandPattern: 'event-driven',
      confidence: 'medium'
    }
  ]

  const seasonalTrends = [
    {
      season: 'Winter (Q1)',
      icon: <Snowflake size={20} className="text-blue-500" />,
      categories: [
        { name: 'Cleaning Supplies', demand: '+35%', reason: 'Cold/flu season cleaning' },
        { name: 'Health & Safety', demand: '+28%', reason: 'Hand sanitizer, masks' },
        { name: 'Office Supplies', demand: '-12%', reason: 'Post-holiday lull' }
      ],
      overallDemand: '+18%'
    },
    {
      season: 'Spring (Q2)',
      icon: <Flower size={20} className="text-pink-500" />,
      categories: [
        { name: 'Cleaning Supplies', demand: '+45%', reason: 'Spring cleaning surge' },
        { name: 'Store Supplies', demand: '+22%', reason: 'Display refresh' },
        { name: 'POS Supplies', demand: '+8%', reason: 'Easter promotions' }
      ],
      overallDemand: '+25%'
    },
    {
      season: 'Summer (Q3)',
      icon: <Sun size={20} className="text-yellow-500" />,
      categories: [
        { name: 'Cleaning Supplies', demand: '+15%', reason: 'AC filter changes' },
        { name: 'Store Supplies', demand: '+32%', reason: 'Summer displays' },
        { name: 'Health & Safety', demand: '-18%', reason: 'Reduced illness' }
      ],
      overallDemand: '+10%'
    },
    {
      season: 'Fall (Q4)',
      icon: <Leaf size={20} className="text-orange-500" />,
      categories: [
        { name: 'Office Supplies', demand: '+28%', reason: 'Back-to-school, holidays' },
        { name: 'POS Supplies', demand: '+41%', reason: 'Holiday promotions' },
        { name: 'Store Supplies', demand: '+38%', reason: 'Holiday decorations' }
      ],
      overallDemand: '+35%'
    }
  ]

  const mlInsights = [
    {
      type: 'optimization',
      title: 'Vendor Switch Opportunity',
      description: 'ML model suggests switching glass cleaner supplier could save 18% annually',
      impact: '$2,847 savings',
      confidence: 94,
      action: 'Review vendor contracts'
    },
    {
      type: 'alert',
      title: 'Unusual Demand Pattern',
      description: 'Receipt paper usage 34% above forecast in District 12',
      impact: 'Potential stockout risk',
      confidence: 87,
      action: 'Investigate store activity'
    },
    {
      type: 'seasonal',
      title: 'Early Spring Surge Detected',
      description: 'Cleaning supplies demand rising 2 weeks ahead of typical pattern',
      impact: '+15% demand shift',
      confidence: 91,
      action: 'Accelerate replenishment'
    },
    {
      type: 'efficiency',
      title: 'Bundle Optimization',
      description: 'New store bundles could reduce shipping costs by 23%',
      impact: '$1,234 monthly savings',
      confidence: 89,
      action: 'Create optimized bundles'
    }
  ]

  const demandForecast = [
    { week: 'Week 1', predicted: 245, actual: 238, accuracy: 97.1 },
    { week: 'Week 2', predicted: 267, actual: 259, accuracy: 97.0 },
    { week: 'Week 3', predicted: 198, actual: 203, accuracy: 97.5 },
    { week: 'Week 4', predicted: 289, actual: 276, accuracy: 95.5 },
    { week: 'Week 5', predicted: 234, actual: null, accuracy: null },
    { week: 'Week 6', predicted: 256, actual: null, accuracy: null },
    { week: 'Week 7', predicted: 278, actual: null, accuracy: null },
    { week: 'Week 8', predicted: 301, actual: null, accuracy: null }
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

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600'
    if (accuracy >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDemandPatternIcon = (pattern: string) => {
    switch (pattern) {
      case 'stable': return <Equals size={14} className="text-blue-600" />
      case 'seasonal': return <Calendar size={14} className="text-green-600" />
      case 'volatile': return <Lightning size={14} className="text-red-600" />
      case 'predictable': return <Target size={14} className="text-purple-600" />
      case 'event-driven': return <Warning size={14} className="text-orange-600" />
      default: return <ChartLine size={14} />
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <Target size={16} className="text-blue-600" />
      case 'alert': return <Warning size={16} className="text-red-600" />
      case 'seasonal': return <Calendar size={16} className="text-green-600" />
      case 'efficiency': return <Lightning size={16} className="text-purple-600" />
      default: return <Brain size={16} />
    }
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
          <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Trends</TabsTrigger>
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

        <TabsContent value="predictive" className="space-y-6">
          {/* Forecast Accuracy Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain size={20} className="text-blue-600" />
                  Forecast Accuracy by Category
                </CardTitle>
                <CardDescription>ML-driven demand prediction performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forecastAccuracy.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.category}</span>
                          {getDemandPatternIcon(item.demandPattern)}
                          <Badge variant="outline" className={getConfidenceColor(item.confidence)}>
                            {item.confidence}
                          </Badge>
                        </div>
                        <div className={`flex items-center gap-1 ${getAccuracyColor(item.accuracy)}`}>
                          {item.trend === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                          <span className="font-semibold">{item.accuracy}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Variance: ±{item.variance}%</span>
                        <span>Last month: {item.lastMonth}%</span>
                      </div>
                      <Progress value={item.accuracy} className="mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightning size={20} className="text-purple-600" />
                  ML Insights & Recommendations
                </CardTitle>
                <CardDescription>AI-powered optimization opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mlInsights.map((insight, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge variant="outline">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {insight.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-green-600">
                              {insight.impact}
                            </span>
                            <Button variant="outline" size="sm">
                              {insight.action}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demand Forecast Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartLine size={20} className="text-green-600" />
                8-Week Demand Forecast
              </CardTitle>
              <CardDescription>Predicted vs actual demand with accuracy metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Chart visualization (simplified bars) */}
                <div className="grid grid-cols-8 gap-2">
                  {demandForecast.map((week, index) => (
                    <div key={index} className="text-center">
                      <div className="h-32 bg-muted rounded flex flex-col justify-end p-1 mb-2">
                        <div 
                          className="bg-blue-500 rounded-sm mb-1 min-h-1" 
                          style={{ height: `${(week.predicted / 350) * 100}%` }}
                        />
                        {week.actual && (
                          <div 
                            className="bg-green-500 rounded-sm min-h-1" 
                            style={{ height: `${(week.actual / 350) * 80}%` }}
                          />
                        )}
                      </div>
                      <p className="text-xs font-medium">{week.week}</p>
                      <p className="text-xs text-blue-600">P: {week.predicted}</p>
                      {week.actual && (
                        <>
                          <p className="text-xs text-green-600">A: {week.actual}</p>
                          <p className="text-xs text-muted-foreground">{week.accuracy?.toFixed(1)}%</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-center gap-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                    <span className="text-sm">Predicted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-sm" />
                    <span className="text-sm">Actual</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} className="text-orange-600" />
                Seasonal Demand Patterns
              </CardTitle>
              <CardDescription>Historical trends and seasonal variations by quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {seasonalTrends.map((season, index) => (
                  <div key={index} className="p-6 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {season.icon}
                        <h3 className="font-semibold">{season.season}</h3>
                      </div>
                      <Badge variant="outline" className="font-semibold">
                        {season.overallDemand} overall
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {season.categories.map((category, catIndex) => (
                        <div key={catIndex} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{category.name}</p>
                            <p className="text-xs text-muted-foreground">{category.reason}</p>
                          </div>
                          <div className={`text-sm font-semibold ${
                            category.demand.startsWith('+') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {category.demand}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Planning Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Planning Recommendations</CardTitle>
              <CardDescription>AI-suggested adjustments for upcoming seasonal patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-blue-600" />
                    <span className="font-medium text-blue-800">Next Month</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Increase cleaning supplies inventory by 25% for spring cleaning surge
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="font-medium text-green-800">Q2 Prep</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Schedule extra POS supplies delivery before Easter promotion period
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightning size={16} className="text-purple-600" />
                    <span className="font-medium text-purple-800">Holiday Prep</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Early Q4 office supplies build-up recommended for back-to-school rush
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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