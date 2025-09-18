import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { MagnifyingGlass, ShoppingCart, Plus, Minus, Warning, Package, X } from '@phosphor-icons/react'
import { Product, CartItem } from '@/types'
import { apiService } from '@/services/api'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'

interface CatalogProps {
  onViewChange: (view: string) => void
}

export function Catalog({ onViewChange }: CatalogProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories()
      ])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading catalog:', error)
      toast.error('Failed to load catalog')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    // Must be active
    if (!product.is_active) return false
    
    // Category filter
    if (selectedCategory && product.category !== selectedCategory) {
      return false
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesName = product.display_name.toLowerCase().includes(searchLower)
      const matchesDescription = product.description.toLowerCase().includes(searchLower)
      const matchesTags = product.tags.some(tag => tag.toLowerCase().includes(searchLower))
      const matchesSku = product.sku.toLowerCase().includes(searchLower)
      
      if (!matchesName && !matchesDescription && !matchesTags && !matchesSku) {
        return false
      }
    }
    
    return true
  })

  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cart.find(item => item.product_id === product.product_id)
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product_id === product.product_id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ))
    } else {
      const preferredVendor = product.vendors.find(v => v.is_preferred) || product.vendors[0]
      if (!preferredVendor) {
        toast.error('No vendor available for this product')
        return
      }
      
      setCart([...cart, { 
        product_id: product.product_id, 
        quantity,
        selected_vendor_id: preferredVendor.vendor_id
      }])
    }
    
    toast.success(`Added ${product.display_name} to cart`)
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product_id !== productId))
    } else {
      setCart(cart.map(item => 
        item.product_id === productId 
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.product_id === item.product_id)
      if (!product) return total
      
      const selectedVendor = product.vendors.find(v => v.vendor_id === item.selected_vendor_id) || product.vendors[0]
      if (!selectedVendor) return total
      
      return total + (selectedVendor.cost_per_item * item.quantity)
    }, 0)
  }

  const submitOrder = async () => {
    if (!user?.assignment?.id || cart.length === 0) return
    
    try {
      setIsSubmittingOrder(true)
      await apiService.createOrder(cart, user.assignment.id, user.user_id)
      setCart([])
      setShowCart(false)
      toast.success('Order submitted successfully!')
      onViewChange('orders')
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Failed to submit order')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supply Catalog</h1>
          <p className="text-muted-foreground">Browse and order supplies for your location</p>
        </div>
        <Button 
          onClick={() => setShowCart(true)}
          className="relative"
          disabled={cart.length === 0}
          aria-label={`Shopping cart with ${cart.reduce((sum, item) => sum + item.quantity, 0)} items`}
        >
          <ShoppingCart className="mr-2" size={16} />
          Cart ({cart.length})
          {cart.length > 0 && (
            <Badge className="absolute -top-2 -right-2 px-1 min-w-[20px] h-5">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            aria-label="Search products"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </Button>
          )}
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {(searchTerm || selectedCategory) && (
        <div className="text-sm text-muted-foreground">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          {searchTerm && ` for "${searchTerm}"`}
          {selectedCategory && ` in ${selectedCategory}`}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product.product_id} 
            product={product} 
            onAddToCart={addToCart}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shopping Cart</DialogTitle>
            <DialogDescription>
              Review your order before submitting
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cart.map((item) => {
              const product = products.find(p => p.product_id === item.product_id)
              if (!product) return null
              
              const selectedVendor = product.vendors.find(v => v.vendor_id === item.selected_vendor_id) || product.vendors[0]
              if (!selectedVendor) return null
              
              return (
                <div key={item.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.display_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      ${selectedVendor.cost_per_item.toFixed(2)} each • {selectedVendor.vendor_name || 'Unknown Vendor'}
                    </p>
                    {product.requires_dm_approval && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <Warning size={12} className="mr-1" />
                        Requires Approval
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                      aria-label={`Decrease quantity for ${product.display_name}`}
                    >
                      <Minus size={12} />
                    </Button>
                    <span className="w-8 text-center" aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                      aria-label={`Increase quantity for ${product.display_name}`}
                    >
                      <Plus size={12} />
                    </Button>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium">
                      ${(selectedVendor.cost_per_item * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              )
            })}
            
            {cart.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="mx-auto h-12 w-12 mb-2" />
                <p>Your cart is empty</p>
              </div>
            )}
          </div>
          
          {cart.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCart(false)}>
              Continue Shopping
            </Button>
            <Button 
              onClick={submitOrder} 
              disabled={cart.length === 0 || isSubmittingOrder}
            >
              {isSubmittingOrder ? 'Submitting...' : 'Submit Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (product: Product) => void }) {
  const preferredVendor = product.vendors.find(v => v.is_preferred) || product.vendors[0]
  
  if (!preferredVendor) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="text-lg">{product.display_name}</CardTitle>
          <CardDescription>No vendor available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This product is currently unavailable.</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{product.display_name}</CardTitle>
            <CardDescription className="mt-1">{product.description}</CardDescription>
          </div>
          {product.requires_dm_approval && (
            <Badge variant="outline" className="ml-2">
              <Warning size={12} className="mr-1" />
              Approval Required
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {product.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Price:</span>
            <span className="font-semibold">${preferredVendor.cost_per_item.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pack Size:</span>
            <span className="text-sm">{product.pack_quantity}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Lead Time:</span>
            <span className="text-sm">{preferredVendor.lead_time_days} days</span>
          </div>
        </div>
        
        <Button 
          onClick={() => onAddToCart(product)}
          className="w-full"
          aria-label={`Add ${product.display_name} to cart`}
        >
          <Plus className="mr-2" size={16} />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  )
}