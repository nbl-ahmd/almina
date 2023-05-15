import React from 'react'

function ProductCard({product}) {
  return (
   <>
    <div className="col products d-flex">
            <div className="card card-product">
            <div className="text-center position-relative">
                  <div className=" position-absolute top-0 start-0">
                    <span className="badge">Sale</span>
                  </div>
                  
                

                </div>
            <img src={`http://localhost:4000/api/products/images/${product.image}`} alt="Product image" className="card-img mb-2 img-fluid product-image" />
              <div className="card-body">
               
                <div className="mb-1"><label className='category-name text-pb text-small'>{product.category.name}</label></div>
                <h6 className="fw-500">{product.name}</h6>
               <div className="product-price">AED {product.price}
               </div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  
                  <div className='flex-grow-1 d-flex add-to-cart-btn'><a href="#!" className="btn  btn-sm flex-grow-1"><i className="bi bi-cart pe-2"></i>
                      Add to cart</a></div>
                </div>
              </div>
            </div>
          </div>
 
   </>
  )
}

export default ProductCard
