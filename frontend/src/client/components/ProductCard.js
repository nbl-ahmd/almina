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
image.src = `${baseURL}/api/products/images/${product.image || defaultImage}`;
   
    image.onload = () => {
      setImageLoaded(true);
    };
  }, [product.image]);

  const handleAddToCart = () => {
    addToCart(product);
  };

  return (
    <>
      <div className="p-1 p-md-2">
        <div className="products p-2">
          <div className="card card-product">
            <div className="text-center position-relative">
            <div className="position-absolute top-0 start-0">
  {product.sale && !product.featured && <span className="badge">Sale</span>}
  {product.featured && !product.sale && <span className="badge">Featured</span>}
  {product.sale && product.featured && <span className="badge">Sale</span>}
</div>
              <div className="position-absolute top-0 end-0">
                {product.sale && <span className="offer-badge badge">20%<br />Offer</span>}
              </div>
            </div>
            {imageLoaded ? (
              <img
                src={`${baseURL}/api/products/images/${product.image}`}
                alt="Product image"
                className="card-img img-fluid product-image"
              />
            ) : (
              <div className="skeleton-image skeleton "></div>
            )}
            <div className="px-2 pt-2 product-details-card">
              <div className="mb-1">
                <Link className="category-name text-pb d-block fw-300 text-sm text-truncate" to={`/categories/${product.category._id}`}>
                  {product.category.name}
                </Link>
                <h6 className="fw-500 fs-sm overflow text-small">{product.name.toLowerCase()}</h6>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2 pb-1">


              {product.stock === 0 ? (
                    <span className=" text-or mx-auto">Out of Stock</span>
                  ) : (
               <>
                <div className="">
                 
                  
                  
                 <span className="product-price">AED {product.price}</span>

               </div>
               <button
                 className="btn btn-sm d-flex add-to-cart-btn"
                 onClick={handleAddToCart}
                 disabled={isAddingToCart}
                 >
       <i className="bi bi-bag"></i>
               </button>
               </>
                    
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
