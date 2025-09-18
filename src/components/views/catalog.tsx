import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescrip
import { MagnifyingGlass, ShoppingCart, Plus, Minus, Warning, Package, X } from '@phosphor-icons/react
import { apiService } from '@/services/api'
import { toast } from 'sonner'
import { MagnifyingGlass, ShoppingCart, Plus, Minus, Warning, Package } from '@phosphor-icons/react'
import { Product, CartItem } from '@/types'
import { apiService } from '@/services/api'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'

interface CatalogProps {
  onViewChange: (view: string) => void
 

  const [isSubmittingOrder, setIsSubmittingOrder] = useSt

    loadData()

    try {
      const [productsData, categoriesData] = await
        apiService.getCategories()
      setProducts(productsData)
    } catch (error) {

      setIsLoading(
  }
  const 

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
    if (searchTerm && !product.display_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !product.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false
    }
    if (selectedCategory && product.category !== selectedCategory) {
      return false
    }
    return product.is_active
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
      setCart([...cart, { 
        product_id: product.product_id, 
        quantity,
        selected_vendor_id: product.vendors.find(v => v.is_preferred)?.vendor_id || product.vendors[0]?.vendor_id
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
      return total + (selectedVendor.cost_per_item * item.quantity)
    }, 0)
  }

  const submitOrder = async () => {
    if (!user?.assignment?.id || cart.length === 0) return
    
    try {
      await apiService.createOrder(cart, user.assignment.id, user.user_id)
      setCart([])
      setShowCart(false)
      toast.success('Order submitted successfully!')
      onViewChange('orders')
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Failed to submit order')
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
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
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

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <DialogContent className="max-w-2xl">
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
                    >
                      <Minus size={12} />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
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
          </div>
          
          {cart.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                      <Minus size={12} />
                    
               
            
          
                    </Bu
                  <div className="text-right ml-4">
                      ${(select
                  </d
              )
            
              <div cl
                <p>Your c
            )}
          
          
   
 

          
            <Button variant="outline" onClick={() => setShowCart(false)}>
  
          
            >
            </Butt
        </DialogContent>
    </div>
}
function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (prod
  
    return (
        <CardHeader>
          <CardDescription>No vendor available</Card
        <CardContent>
        </CardConten
    )
  
    <Card className
        <div className="flex items-start 
            <CardTitle className="text-lg">{pr
          </div>
            <Badge variant="outline" className="ml-2">
              Appro
          )}
      </CardH
        <div c
        
            </Badge>
        </div>
        <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Price:</span>
          </div>
            <span className="text-sm text-muted-foreground">P
          </div>
            <span className="text-sm text-muted-foreground">Lead Tim
          </div>
        
          onClick={() => onAddToCart(product)}
          aria-label={`Add ${product.display_name} to cart`}
          <Plus 
        </Butt
    </Ca
}









