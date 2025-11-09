import gql from 'graphql-tag'

export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      id
      name
      price
      description
      category
      inStock
      inventory {
        quantity
        warehouse
        estimatedDelivery
      }
    }
  }
`

export const GET_PRODUCT_DETAILS = gql`
  query GetProductDetails($id: ID!) {
    product(id: $id) {
      id
      name
      price
      description
      category
      inStock
      inventory {
        quantity
        warehouse
        estimatedDelivery
      }
      reviews {
        id
        rating
        body
        author {
          name
        }
      }
    }
  }
`

export const GET_TOP_PRODUCTS = gql`
  query GetTopProducts($limit: Int) {
    topProducts(limit: $limit) {
      id
      name
      price
      category
      inStock
    }
  }
`
