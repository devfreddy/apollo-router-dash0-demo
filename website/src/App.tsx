import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_PRODUCTS } from './queries'
import ProductCard from './components/ProductCard'
import InventoryModal from './components/InventoryModal'
import './App.css'

interface Product {
  id: string
  name: string
  price: number
  description?: string
  category?: string
  inStock: boolean
  inventory?: {
    quantity: number
    warehouse: string
    estimatedDelivery: string
  }
}

function App() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { loading, error, data } = useQuery(GET_PRODUCTS)

  return (
    <div className="app">
      <header>
        <h1>🛍️ Willful Waste</h1>
        <p className="tagline">Your favorite online retail store</p>
      </header>

      <main>
        {loading && <div className="loading">Loading products...</div>}
        {error && <div className="error">Error loading products: {error.message}</div>}

        {data && data.products && data.products.length > 0 ? (
          <div className="products-grid">
            {data.products.map((product: Product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewInventory={setSelectedProduct}
              />
            ))}
          </div>
        ) : (
          !loading && <div className="empty-state">No products found</div>
        )}
      </main>

      {selectedProduct && (
        <InventoryModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}

export default App
