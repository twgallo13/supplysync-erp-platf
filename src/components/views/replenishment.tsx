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
  Target
} from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { ReplenishmentRequest, ReplenishmentSuggestion, AllotmentRequest, Product, Store } from '@/types'
import { ReplenishmentEngine, DEFAULT_REPLENISHMENT_CONFIG } from '@/services/replenishment-engine'
import { VendorSelectionService } from '@/services/vendor-selection'
import { ReplenishmentScheduler } from '@/services/replenishment-scheduler'
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
  
  // Initialize automation services
  const [replenishmentEngine] = useState(() => new ReplenishmentEngine(DEFAULT_REPLENISHMENT_CONFIG))
  const [vendorService] = useState(() => new VendorSelectionService())
  const [scheduler] = useState(() => new ReplenishmentScheduler(DEFAULT_REPLENISHMENT_CONFIG))

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
      // Simulate running replenishment analysis
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Generate new suggestions based on analysis
      const newSuggestions: ReplenishmentSuggestion[] = [
        {
          suggestion_id: `repl_${Date.now()}_1`,
          product_id: 'prod_paper_001',
          store_id: 's_12345',
          suggested_quantity: 6,
          reason: 'LOW_STOCK',
          priority: 'HIGH',
          cost_impact: 67.44,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          auto_approved: false
        },
        {
          suggestion_id: `repl_${Date.now()}_2`,
          product_id: 'prod_receipt_001',
          store_id: 's_12346',
          suggested_quantity: 10,
          reason: 'PREDICTIVE',
          priority: 'MEDIUM',
          cost_impact: 89.99,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          auto_approved: false
        }
      ]
      
      setSuggestions(current => [...(current || []), ...newSuggestions])
      toast.success(`Analysis complete! ${newSuggestions.length} new suggestions generated`)
      
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
                <span className="font-medium">1.0x (Normal)</span>
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
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <TrendUp size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="allotments">Allotment Requests</TabsTrigger>
          <TabsTrigger value="rules">Replenishment Rules</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

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