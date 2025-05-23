import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../context/cartcontext';
import { Link } from 'react-router-dom';
import baseURL from '../../axiosConfig';


function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const image = new Image();
    const defaultImage = "fb634ad3-7062-4baf-a08d-4f8f04abb459.webp";
    image.src = `https://cdn.alminapharmacy.com/cdn/products/${product.image || defaultImage}`;
   
    // image.onload = () => {
    //   setImageLoaded(true);
    // };
  }, [product.image]);

  const handleAddToCart = () => {
    addToCart(product);
  };
  const handleImageLoad = () => {
    setImageLoaded(true);
  };


  function getSaleTypeClass(saleType) {
    switch (saleType) {
      case 'price_cut':
        return 'bg-p-or'; // Replace with your actual class name
      case 'percentage_offer':
        return 'offer-badge'; // Replace with your actual class name
      case 'combo_offer':
        return 'bg-p-pu'; // Replace with your actual class name
      default:
        return 'bg-p-or'; // Default class when saleType doesn't match any specific type
    }
  }

  return (
    <>
      <div className="p-1 p-md-2">
        <div className="products p-2">
          <div className="card card-product">
              <div className="text-center position-relative">
                <div className="position-absolute top-0 start-0">
                  {product.sale && !product.featured && <span className={`badge ${getSaleTypeClass(product.saleType)}`}>{product.saleBadge || 'sale'}</span>}
                  {product.featured && !product.sale && <span className="badge">Featured</span>}
                  {product.sale && product.featured && <span className={`badge ${getSaleTypeClass(product.saleType)}`}>{product.saleBadge || 'sale'}</span>}
                  
                </div>
                
              </div>

              <Link to={`/productdetails/${product.product_id}`} className="text-decoration-none">
                {!imageLoaded && (
                  <div className="skeleton-image skeleton">
                    {/* Loading skeleton or spinner goes here */}
                  </div>
                )}
                
                <img
                  src={
                    product.image // Check if `product.image` exists
                      ? `https://cdn.alminapharmacy.com/cdn/products/${product.image}`
                      : product.images && product.images.length > 0 // If `product.image` doesn't exist, check for `product.images[0]`
                      ? `${baseURL}/api/products/images/${product.images[0]}`
                      : `${baseURL}/api/products/images/default-image.webp` // Fallback to a default image
                  }
                  alt={product.name || 'Product image'}
                  className="card-img img-fluid product-image"
                  loading="lazy"
                  onLoad={handleImageLoad}
                />

              </Link>



              <div className="px-2 pt-2 product-details-card">
                <div className="mb-1">
                  <Link className="category-name text-pb d-block fw-300 text-sm text-truncate" to={`/categories/${product.category._id}`}>
                    {product.category.name}
                  </Link>

                  <h6 className="fw-500 fs-sm overflow text-small">{product.name.toLowerCase()}</h6>
                </div>


                {/* {product.stock === 0 ? (
                  <span className=" text-or mx-auto">Out of Stock</span>
                  ) : (
                    
                    
                  )} */}
                  <div className="pb-1">
                
                  <div className="">
                  
                    
                    {product.salePrice ?(

                      <>
                      <span className="product-price me-2">AED {product.salePrice}</span>
                      <span className="text-small  text-strike">AED {product.price}</span>
                      </>
                      ):  <span className="product-price">AED {product.price}</span>}
                    

                </div>
                
                
              
                {product.stock === 0 ? (
                  
                  <span className="out-of-stock-text text-pr">Temporarily Out of Stock</span>
                
                  ) : (
                    <button
                  className={`btn btn-sm d-flex add-to-cart-btn`}
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  >
                    Add to cart
                </button>
                    
                  )}
                  </div>

                
              </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductCard;
