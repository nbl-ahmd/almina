import axios from 'axios';
import React, { useState } from 'react'
import product from './product';
import { Link } from 'react-router-dom';

const ProductCard_admin = ({product}) => {
    const [productFilter, setProductFilter] = useState();
    const deleteProduct = () => {
        axios
        .delete(`http://192.168.70.104:4000/api/products/${product._id}`)
        .then((res) => {
        })
        .catch((error) => console.log(error));
}
    
  return (
   <>
    <div className="col products d-flex p-2">
            <div className="card card-product">
            <div className="text-center position-relative">
                  <div className=" position-absolute top-0 start-0">
                    <span className="badge">Sale</span>
                  </div>
                  
                

                </div>
            <img src={`http://192.168.70.104:4000/api/products/images/${product.image}`} alt="Product image" className="card-img img-fluid product-image" />
              <div className="px-2 pt-3">
               
                <div className="mb-1"><span className='category-name text-pb fw-400 text-small'>{product.category.name}</span>
                <h6 className="fw-600 mt-1 overflow">{product.name}</h6>
                </div>
               
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div className="fs-6">
                  <span className='product-price'>AED</span>
                <span className="product-price fs-4"> {product.price}
               </span>
                  </div>
                 <div className='d-flex gap-2'>
                 <div className=' d-flex add-to-cart-btn'><button href="#!" className="btn  btn-sm text-white d-flex" onClick={deleteProduct}><i className="bi bi-trash fs-5"></i>
                      </button></div>
                      <div className=' d-flex add-to-cart-btn'><Link to = {`/admin/product/update/${product._id}`} className="btn  btn-sm text-white d-flex"  ><i className="bi bi-pen fs-5"></i>
                      </Link>
                      </div>
                 </div>
                </div>
              </div>
            </div>
          </div>
 
   </>
  )
}

export default ProductCard_admin
