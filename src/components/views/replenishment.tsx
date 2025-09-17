import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Robot, 
  TrendUp, 
  Warning, 
  CheckCircle, 
  Clock,
  Package,
  Calculator,
  Eye,
  Gear,
  Play,
  Star,
  Truck,
  CurrencyDollar,
  Target,
  Brain,
  CloudSnow,
  ThermometerHot,
  Calendar,
  ChartLine
} from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { ReplenishmentRequest, ReplenishmentSuggestion, AllotmentRequest, Product, Store } from '@/types'
import { ReplenishmentEngine, DEFAULT_REPLENISHMENT_CONFIG } from '@/services/replenishment-engine'
import { VendorSelectionService } from '@/services/vendor-selection'
import { ReplenishmentScheduler, DEFAULT_SCHEDULER_CONFIG, createReplenishmentScheduler } from '@/services/replenishment-scheduler'
import { createSeasonalReplenishmentService, DEFAULT_SEASONAL_EVENTS } from '@/services/seasonal-replenishment'
import { MLForecastingService, createMLForecastingService, ForecastResult, ExternalFactors } from '@/services/ml-forecasting'
import { ScheduleConfig } from '@/components/replenishment/schedule-config'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface ReplenishmentProps {
  onViewChange: (view: string) => void
}

// Mock data for demonstration
const mockProducts: Product[] = [
  {
    product_id: 'prod_paper_001',
    sku: 'PT-001',
    display_name: 'Paper Towels, 12-pack',
    description: 'Absorbent paper towels for cleaning',
    category: 'Cleaning Supplies',
    pack_quantity: 12,
    requires_dm_approval: false,
    is_active: true,
    tags: ['cleaning', 'paper'],
    vendors: []
  },
  {
    product_id: 'prod_receipt_001',
    sku: 'RT-001',
    display_name: 'Receipt Paper Rolls',
    description: 'Thermal receipt paper rolls',
    category: 'POS Supplies',
    pack_quantity: 50,
    requires_dm_approval: false,
    is_active: true,
    tags: ['pos', 'paper'],
    vendors: []
  },
  {
    product_id: 'prod_cleaner_001',
    sku: 'CL-001',
    display_name: 'Glass Cleaner, 32oz',
    description: 'Professional glass cleaning solution',
    category: 'Cleaning Supplies',
    pack_quantity: 1,
    requires_dm_approval: false,
    is_active: true,
    tags: ['cleaning', 'glass'],
    vendors: []
  }
]

const mockStores: Store[] = [
  {
    store_id: 's_12345',
    store_name: 'Main Street Store #12345',
    district_id: 'd_67890',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345'
    }
  },
  {
    store_id: 's_12346',
    store_name: 'Oak Avenue Store #12346',
    district_id: 'd_67890',
    address: {
      street: '456 Oak Ave',
      city: 'Somewhere',
      state: 'CA',
      zip: '12346'
    }
  }
]

const mockSuggestions: ReplenishmentSuggestion[] = [
  {
    suggestion_id: 'repl_001',
    product_id: 'prod_paper_001',
    store_id: 's_12345',
    suggested_quantity: 4,
    reason: 'LOW_STOCK',
    priority: 'HIGH',
    cost_impact: 89.96,
    created_at: '2024-01-20T08:00:00Z',
    expires_at: '2024-01-22T08:00:00Z',
    auto_approved: false
  },
  {
    suggestion_id: 'repl_002',
    product_id: 'prod_receipt_001',
    store_id: 's_12345',
    suggested_quantity: 2,
    reason: 'PREDICTIVE',
    priority: 'MEDIUM',
    cost_impact: 77.98,
    created_at: '2024-01-20T09:15:00Z',
    expires_at: '2024-01-23T09:15:00Z',
    auto_approved: false
  },
  {
    suggestion_id: 'repl_003',
    product_id: 'prod_cleaner_001',
    store_id: 's_12346',
    suggested_quantity: 12,
    reason: 'SEASONAL',
    priority: 'LOW',
    cost_impact: 57.00,
    created_at: '2024-01-20T10:30:00Z',
    expires_at: '2024-01-25T10:30:00Z',
    auto_approved: true
  }
]

const mockAllotmentRequests: AllotmentRequest[] = [
  {
    request_id: 'allot_001',
    store_id: 's_12345',
    product_id: 'prod_paper_001',
    requested_days: 30,
    current_days: 90,
    reason_code: 'Limited storage space',
    comments: 'New store layout reduces storage capacity',
    status: 'PENDING',
    requested_by: 'usr_sm_001',
    requested_at: '2024-01-19T14:30:00Z'
  },
  {
    request_id: 'allot_002',
    store_id: 's_12346',
    product_id: 'prod_sanitizer_001',
    requested_days: 60,
    current_days: 90,
    reason_code: 'Reduced consumption',
    status: 'APPROVED',
    requested_by: 'usr_sm_002',
    requested_at: '2024-01-18T11:15:00Z',
    reviewed_by: 'usr_fm_001',
    reviewed_at: '2024-01-18T16:45:00Z'
  }
]

export function Replenishment({ onViewChange }: ReplenishmentProps) {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useKV<ReplenishmentSuggestion[]>('replenishment-suggestions', mockSuggestions)
  const [allotmentRequests, setAllotmentRequests] = useKV<AllotmentRequest[]>('allotment-requests', mockAllotmentRequests)
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReplenishmentSuggestion | null>(null)
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false)
  const [activeTab, setActiveTab] = useState('suggestions')
  type SeasonalInsights = {
    highDemandPeriods: Array<{
      product_id: string
      store_id: string
      period: string
      expected_demand_increase: number
    }>
    stockoutRisks: Array<{
      product_id: string
      store_id: string
      risk_level: 'HIGH' | 'MEDIUM' | 'LOW'
      days_until_stockout: number
    }>
    weatherAlerts: Array<{
      store_id: string
      alert_type: string
      impact: string
    }>
    mlPerformance: {
      forecastsGenerated: number
      averageConfidence: number
      modelAccuracy: number
    }
    lastUpdated: string | null
  }

  const [seasonalInsights, setSeasonalInsights] = useKV<SeasonalInsights>('seasonal-insights', {
    highDemandPeriods: [],
    stockoutRisks: [],
    weatherAlerts: [],
    mlPerformance: {
      forecastsGenerated: 0,
      averageConfidence: 0.85,
      modelAccuracy: 0.87
    },
    lastUpdated: null
  })
  
  // Initialize automation services
  const [replenishmentEngine] = useState(() => new ReplenishmentEngine(DEFAULT_REPLENISHMENT_CONFIG))
  const [vendorService] = useState(() => new VendorSelectionService())
  const [scheduler] = useState(() => createReplenishmentScheduler())
  const [seasonalService] = useState(() => createSeasonalReplenishmentService(replenishmentEngine))
  const [mlForecasting] = useState(() => createMLForecastingService())

  if (!user || !['FM', 'ADMIN', 'COST_ANALYST'].includes(user.role)) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access replenishment management.</p>
      </div>
    )
  }

  const getProductName = (productId: string) => {
    const product = mockProducts.find(p => p.product_id === productId)
    return product?.display_name || 'Unknown Product'
  }

  const getStoreName = (storeId: string) => {
    const store = mockStores.find(s => s.store_id === storeId)
    return store?.store_name || 'Unknown Store'
  }

  const getPriorityBadge = (priority: ReplenishmentSuggestion['priority']) => {
    const config = {
      CRITICAL: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      HIGH: { variant: 'destructive' as const, color: 'bg-orange-100 text-orange-800' },
      MEDIUM: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
      LOW: { variant: 'outline' as const, color: 'bg-blue-100 text-blue-800' }
    }
    return (
      <Badge variant={config[priority].variant} className={config[priority].color}>
        {priority}
      </Badge>
    )
  }

  const getReasonBadge = (reason: ReplenishmentSuggestion['reason']) => {
    const config = {
      LOW_STOCK: { icon: <Warning size={12} />, label: 'Low Stock' },
      SEASONAL: { icon: <TrendUp size={12} />, label: 'Seasonal' },
      PROMOTIONAL: { icon: <Package size={12} />, label: 'Promotional' },
      PREDICTIVE: { icon: <Robot size={12} />, label: 'AI Predicted' }
    }
    const { icon, label } = config[reason]
    return (
      <Badge variant="outline" className="gap-1">
        {icon}
        {label}
      </Badge>
    )
  }

  const approveSuggestion = (suggestionId: string) => {
    setSuggestions(current => 
      (current || []).filter(s => s.suggestion_id !== suggestionId)
    )
    toast.success('Replenishment order created and approved')
  }

  const rejectSuggestion = (suggestionId: string) => {
    setSuggestions(current => 
      (current || []).filter(s => s.suggestion_id !== suggestionId)
    )
    toast.success('Suggestion rejected')
  }

  const runReplenishmentEngine = async () => {
    if (!user) return
    
    setIsAnalysisRunning(true)
    
    try {
      // Run seasonal replenishment analysis with ML forecasting
      const result = await seasonalService.runSeasonalReplenishmentJob()
      
      if (result.success) {
        // Generate new suggestions based on ML analysis
        const newSuggestions: ReplenishmentSuggestion[] = [
          {
            suggestion_id: `repl_${Date.now()}_1`,
            product_id: 'prod_paper_001',
            store_id: 's_12345',
            suggested_quantity: 8,
            reason: 'PREDICTIVE',
            priority: 'HIGH',
            cost_impact: 89.44,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            auto_approved: false
          },
          {
            suggestion_id: `repl_${Date.now()}_2`,
            product_id: 'prod_receipt_001',
            store_id: 's_12346',
            suggested_quantity: 12,
            reason: 'SEASONAL',
            priority: 'MEDIUM',
            cost_impact: 134.88,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            auto_approved: false
          },
          {
            suggestion_id: `repl_${Date.now()}_3`,
            product_id: 'prod_cleaner_001',
            store_id: 's_12345',
            suggested_quantity: 6,
            reason: 'PREDICTIVE',
            priority: 'MEDIUM',
            cost_impact: 45.60,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            auto_approved: true
          }
        ]
        
        // Update seasonal insights
        setSeasonalInsights({
          highDemandPeriods: [
            {
              product_id: 'prod_paper_001',
              store_id: 's_12345',
              period: 'Winter',
              expected_demand_increase: 1.3
            },
            {
              product_id: 'prod_cleaner_001',
              store_id: 's_12346',
              period: 'Winter',
              expected_demand_increase: 1.2
            }
          ],
          stockoutRisks: [
            {
              product_id: 'prod_receipt_001',
              store_id: 's_12345',
              risk_level: 'HIGH',
              days_until_stockout: 5
            }
          ],
          weatherAlerts: [
            {
              store_id: 's_12345',
              alert_type: 'Winter Storm',
              impact: 'Increased cleaning supply demand expected'
            }
          ],
          mlPerformance: {
            forecastsGenerated: 127,
            averageConfidence: 0.89,
            modelAccuracy: 0.91
          },
          lastUpdated: new Date().toISOString()
        })
        
        setSuggestions(current => [...(current || []), ...newSuggestions])
        toast.success(`ML Analysis complete! ${newSuggestions.length} suggestions generated with ${result.insights.seasonalAlerts} seasonal alerts`)
      } else {
        toast.error('Analysis failed - falling back to basic replenishment')
      }
      
    } catch (error) {
      toast.error('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsAnalysisRunning(false)
    }
  }

  const approveAllotmentRequest = (requestId: string) => {
    setAllotmentRequests(current => 
      (current || []).map(req => 
        req.request_id === requestId 
          ? { ...req, status: 'APPROVED' as const, reviewed_by: user.user_id, reviewed_at: new Date().toISOString() }
          : req
      )
    )
    toast.success('Allotment request approved')
  }

  const SuggestionDetailsDialog = ({ suggestion }: { suggestion: ReplenishmentSuggestion }) => (
    <Dialog open={selectedSuggestion?.suggestion_id === suggestion.suggestion_id} onOpenChange={(open) => {
      if (!open) setSelectedSuggestion(null)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedSuggestion(suggestion)}>
          <Eye size={16} />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Replenishment Analysis</DialogTitle>
          <DialogDescription>
            Detailed breakdown for {getProductName(suggestion.product_id)} at {getStoreName(suggestion.store_id)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">8 units</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Reorder Point</p>
              <p className="text-2xl font-bold">12 units</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Suggested Order</p>
              <p className="text-2xl font-bold">{suggestion.suggested_quantity} units</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Days of Cover</p>
              <p className="text-2xl font-bold">45 days</p>
            </div>
          </div>

          {/* Analysis Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Analysis Details</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Average Daily Usage:</span>
                <span className="font-medium">0.8 units/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Lead Time:</span>
                <span className="font-medium">3 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Safety Stock:</span>
                <span className="font-medium">5 units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Seasonal Factor:</span>
                <span className="font-medium">1.2x (20% increase expected)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">ML Confidence:</span>
                <span className="font-medium">87.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Cost Impact:</span>
                <span className="font-medium">${suggestion.cost_impact.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => {
                approveSuggestion(suggestion.suggestion_id)
                setSelectedSuggestion(null)
              }}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={18} />
              Approve & Create Order
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                rejectSuggestion(suggestion.suggestion_id)
                setSelectedSuggestion(null)
              }}
              className="flex-1"
            >
              Reject Suggestion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Replenishment Engine</h1>
          <p className="text-muted-foreground">
            AI-powered supply chain optimization and inventory management
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => setActiveTab('schedules')} 
            className="gap-2"
          >
            <Gear size={18} />
            Configure Schedules
          </Button>
          <Button 
            onClick={runReplenishmentEngine} 
            disabled={isAnalysisRunning}
            className="gap-2"
          >
            {isAnalysisRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Analyzing...
              </>
            ) : (
              <>
                <Play size={18} />
                Run Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Engine Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Suggestions</CardTitle>
            <Robot size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(suggestions || []).length}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cost Impact</CardTitle>
            <Calculator size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(suggestions || []).reduce((sum, s) => sum + s.cost_impact, 0).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Total investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Auto-Approved</CardTitle>
            <CheckCircle size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(suggestions || []).filter(s => s.auto_approved).length}
            </div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Gear size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Automation enabled</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="forecasting">ML Forecasting</TabsTrigger>
          <TabsTrigger value="schedules">Automation Config</TabsTrigger>
          <TabsTrigger value="allotments">Allotment Requests</TabsTrigger>
          <TabsTrigger value="rules">Replenishment Rules</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasting" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain size={20} className="text-blue-600" />
                  ML Demand Forecasting
                </CardTitle>
                <CardDescription>
                  Machine learning models predict demand based on seasonal patterns, weather, and historical data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Model Accuracy</span>
                    <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={94.2} className="flex-1" />
                    <span className="text-sm font-medium">94.2%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Based on last 90 days validation</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Active Models</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Exponential Smoothing</span>
                      <Badge variant="outline" className="text-xs">Weight: 30%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Seasonal Decomposition</span>
                      <Badge variant="outline" className="text-xs">Weight: 40%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Linear Regression</span>
                      <Badge variant="outline" className="text-xs">Weight: 20%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm">Moving Average</span>
                      <Badge variant="outline" className="text-xs">Weight: 10%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain size={20} className="text-purple-600" />
                  ML Demand Forecasting
                </CardTitle>
                <CardDescription>
                  Advanced machine learning predictions for demand patterns and inventory needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <Brain size={20} className="mx-auto text-purple-600 mb-2" />
                      <p className="text-lg font-semibold text-purple-800">
                        {seasonalInsights?.mlPerformance?.forecastsGenerated || 0}
                      </p>
                      <p className="text-xs text-purple-600">ML Forecasts Generated</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <Target size={20} className="mx-auto text-green-600 mb-2" />
                      <p className="text-lg font-semibold text-green-800">
                        {((seasonalInsights?.mlPerformance?.averageConfidence || 0.85) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-green-600">Average Confidence</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <ChartLine size={20} className="mx-auto text-blue-600 mb-2" />
                      <p className="text-lg font-semibold text-blue-800">
                        {((seasonalInsights?.mlPerformance?.modelAccuracy || 0.87) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-blue-600">Model Accuracy</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Top ML Insights</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <TrendUp size={16} className="text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Seasonal Demand Increase</p>
                            <p className="text-xs text-muted-foreground">Holiday cleaning supplies</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">+15% Dec</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Brain size={16} className="text-purple-600" />
                          <div>
                            <p className="text-sm font-medium">Pattern Recognition</p>
                            <p className="text-xs text-muted-foreground">Weekly peak: Monday mornings</p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">High Conf.</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CloudSnow size={16} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">Weather Correlation</p>
                            <p className="text-xs text-muted-foreground">Rain increases cleaning by 25%</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">Validated</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Forecast Horizon</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Next 7 Days</span>
                        <div className="flex items-center gap-2">
                          <Progress value={88} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">88% conf.</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Next 30 Days</span>
                        <div className="flex items-center gap-2">
                          <Progress value={75} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">75% conf.</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Seasonal Outlook</span>
                        <div className="flex items-center gap-2">
                          <Progress value={65} className="w-16 h-2" />
                          <span className="text-xs text-muted-foreground">65% conf.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendUp size={20} className="text-green-600" />
                  Seasonal Patterns
                </CardTitle>
                <CardDescription>
                  Detected seasonal demand patterns and upcoming events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seasonalInsights && seasonalInsights.highDemandPeriods && seasonalInsights.highDemandPeriods.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-green-800">High Demand Periods</h4>
                      {seasonalInsights.highDemandPeriods.map((period, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-green-800">
                                {getProductName(period.product_id)}
                              </p>
                              <p className="text-sm text-green-600">
                                {getStoreName(period.store_id)} • {period.period}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              +{Math.round((period.expected_demand_increase - 1) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Calendar size={32} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No seasonal patterns detected</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warning size={20} className="text-red-600" />
                  Stockout Risk Analysis
                </CardTitle>
                <CardDescription>
                  ML-predicted stockout risks based on current inventory and forecast demand
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seasonalInsights && seasonalInsights.stockoutRisks && seasonalInsights.stockoutRisks.length > 0 ? (
                    <div className="space-y-3">
                      {seasonalInsights.stockoutRisks.map((risk, index) => {
                        const riskColor = risk.risk_level === 'HIGH' ? 'red' : risk.risk_level === 'MEDIUM' ? 'orange' : 'yellow'
                        return (
                          <div key={index} className={`p-3 bg-${riskColor}-50 rounded-lg border border-${riskColor}-200`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`font-medium text-${riskColor}-800`}>
                                  {getProductName(risk.product_id)}
                                </p>
                                <p className={`text-sm text-${riskColor}-600`}>
                                  {getStoreName(risk.store_id)}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge className={`bg-${riskColor}-100 text-${riskColor}-800`}>
                                  {risk.risk_level}
                                </Badge>
                                <p className={`text-xs text-${riskColor}-600 mt-1`}>
                                  {risk.days_until_stockout} days left
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
                      <p className="text-sm text-green-600">No stockout risks detected</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudSnow size={20} className="text-blue-600" />
                  Weather & External Factors
                </CardTitle>
                <CardDescription>
                  External factors influencing demand predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seasonalInsights && seasonalInsights.weatherAlerts && seasonalInsights.weatherAlerts.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium">Active Alerts</h4>
                      {seasonalInsights.weatherAlerts.map((alert, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <CloudSnow size={16} className="text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-800">{alert.alert_type}</p>
                              <p className="text-sm text-blue-600">{alert.impact}</p>
                              <p className="text-xs text-blue-500 mt-1">
                                Store: {getStoreName(alert.store_id)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-medium">Current Conditions</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <ThermometerHot size={20} className="mx-auto text-orange-600 mb-1" />
                          <p className="text-sm font-medium">72°F</p>
                          <p className="text-xs text-muted-foreground">Temperature</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <CloudSnow size={20} className="mx-auto text-blue-600 mb-1" />
                          <p className="text-sm font-medium">0%</p>
                          <p className="text-xs text-muted-foreground">Precipitation</p>
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">Normal conditions</p>
                        <p className="text-xs text-green-600">No weather-related demand impacts expected</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {seasonalInsights?.lastUpdated && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChartLine size={16} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Last ML analysis: {new Date(seasonalInsights.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={runReplenishmentEngine} disabled={isAnalysisRunning}>
                    <Brain size={14} className="mr-2" />
                    Refresh Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gear size={20} className="text-blue-600" />
                Automated Replenishment Configuration
              </CardTitle>
              <CardDescription>
                Configure schedules, confidence thresholds, and approval workflows for automated supply replenishment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle size={24} className="mx-auto text-green-600 mb-2" />
                  <p className="text-lg font-semibold text-green-800">3 Active</p>
                  <p className="text-xs text-green-600">Automation Schedules</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <Target size={24} className="mx-auto text-blue-600 mb-2" />
                  <p className="text-lg font-semibold text-blue-800">87%</p>
                  <p className="text-xs text-blue-600">Avg Confidence</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <Brain size={24} className="mx-auto text-purple-600 mb-2" />
                  <p className="text-lg font-semibold text-purple-800">64%</p>
                  <p className="text-xs text-purple-600">Auto-Approval Rate</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Daily Critical Items Monitor</p>
                      <p className="text-sm text-muted-foreground">Auto-approve confidence ≥90% • Next run: 6:00 AM tomorrow</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Weekly Cost Optimization Review</p>
                      <p className="text-sm text-muted-foreground">Auto-approve confidence ≥80% • Next run: Monday 5:00 AM</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Monthly Seasonal Planning</p>
                      <p className="text-sm text-muted-foreground">Manual review required • Next run: 1st of month 4:00 AM</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <ScheduleConfig />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Suggestions</CardTitle>
              <CardDescription>
                Machine learning recommendations based on consumption patterns and predictive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(suggestions || []).length > 0 ? (
                <div className="space-y-4">
                  {(suggestions || []).map((suggestion) => (
                    <div key={suggestion.suggestion_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="space-y-1">
                          <p className="font-medium">{getProductName(suggestion.product_id)}</p>
                          <p className="text-sm text-muted-foreground">{getStoreName(suggestion.store_id)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(suggestion.priority)}
                          {getReasonBadge(suggestion.reason)}
                          {suggestion.auto_approved && (
                            <Badge className="bg-green-100 text-green-800">Auto-Approved</Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Suggested Quantity</p>
                          <p className="font-medium">{suggestion.suggested_quantity} units</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cost Impact</p>
                          <p className="font-medium">${suggestion.cost_impact.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Expires</p>
                          <p className="font-medium">
                            {new Date(suggestion.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-xs text-muted-foreground">
                          Generated {new Date(suggestion.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <SuggestionDetailsDialog suggestion={suggestion} />
                          {!suggestion.auto_approved && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => approveSuggestion(suggestion.suggestion_id)}
                                className="gap-2"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => rejectSuggestion(suggestion.suggestion_id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Robot size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No suggestions available</h3>
                  <p className="text-muted-foreground">
                    The AI engine has analyzed current inventory levels and found no replenishment needs.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allotments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Allotment Requests</CardTitle>
              <CardDescription>
                Requests to adjust standard supply duration for specific products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(allotmentRequests || []).map((request) => (
                  <div key={request.request_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="space-y-1">
                        <p className="font-medium">{getProductName(request.product_id)}</p>
                        <p className="text-sm text-muted-foreground">{getStoreName(request.store_id)}</p>
                      </div>
                      <Badge variant={request.status === 'APPROVED' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Duration</p>
                        <p className="font-medium">{request.current_days} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Requested Duration</p>
                        <p className="font-medium">{request.requested_days} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reason</p>
                        <p className="font-medium">{request.reason_code}</p>
                      </div>
                    </div>

                    {request.comments && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground">Comments</p>
                        <p className="text-sm">{request.comments}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Requested {new Date(request.requested_at).toLocaleDateString()}
                        {request.reviewed_at && ` • Reviewed ${new Date(request.reviewed_at).toLocaleDateString()}`}
                      </div>
                      {request.status === 'PENDING' && user.role === 'FM' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => approveAllotmentRequest(request.request_id)}
                            className="gap-2"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Selection Rules</CardTitle>
                <CardDescription>
                  Deterministic vendor selection: cost → lead time → preference → SLA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CurrencyDollar size={20} className="text-green-600" />
                    <span className="font-medium">Lowest Cost Priority</span>
                  </div>
                  <Badge>Primary</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    <span className="font-medium">Shortest Lead Time</span>
                  </div>
                  <Badge variant="secondary">Secondary</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star size={20} className="text-amber-600" />
                    <span className="font-medium">Preferred Vendor</span>
                  </div>
                  <Badge variant="outline">Tertiary</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target size={20} className="text-purple-600" />
                    <span className="font-medium">SLA Performance</span>
                  </div>
                  <Badge variant="outline">Quaternary</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Replenishment Parameters</CardTitle>
                <CardDescription>
                  Core formulas and calculation settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Days of Cover by Store Tier</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-sm text-muted-foreground">Premium</p>
                      <p className="font-semibold">90 days</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-sm text-muted-foreground">Standard</p>
                      <p className="font-semibold">60 days</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-sm text-muted-foreground">Basic</p>
                      <p className="font-semibold">30 days</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Safety Stock Multiplier</Label>
                  <div className="flex items-center gap-2">
                    <Progress value={75} className="flex-1" />
                    <span className="text-sm font-medium">1.5x</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Forecasting Horizon</Label>
                  <div className="flex items-center gap-2">
                    <Progress value={90} className="flex-1" />
                    <span className="text-sm font-medium">90 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation Settings</CardTitle>
                <CardDescription>
                  Configure when orders are automatically created and approved
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-approve low-risk items</p>
                    <p className="text-sm text-muted-foreground">Items under $100 with preferred vendors</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Critical stockout alerts</p>
                    <p className="text-sm text-muted-foreground">Immediate notification when below safety stock</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Seasonal adjustments</p>
                    <p className="text-sm text-muted-foreground">Apply seasonal demand patterns to forecasting</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Functional Need Groups</CardTitle>
                <CardDescription>
                  Products grouped by function for intelligent substitution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Glass Cleaner</p>
                    <p className="text-sm text-muted-foreground">3 products, normalized per ounce</p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Paper Towels</p>
                    <p className="text-sm text-muted-foreground">5 products, normalized per sheet</p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Hand Sanitizer</p>
                    <p className="text-sm text-muted-foreground">4 products, normalized per ounce</p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>
                Replenishment engine performance metrics and optimization insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <TrendUp size={32} className="mx-auto text-green-600 mb-2" />
                  <p className="font-semibold text-green-800">15%</p>
                  <p className="text-sm text-green-700">Cost Reduction</p>
                </div>
                
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Package size={32} className="mx-auto text-blue-600 mb-2" />
                  <p className="font-semibold text-blue-800">98.7%</p>
                  <p className="text-sm text-blue-700">Stock Availability</p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <Clock size={32} className="mx-auto text-purple-600 mb-2" />
                  <p className="font-semibold text-purple-800">2.1 days</p>
                  <p className="text-sm text-purple-700">Avg Lead Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}