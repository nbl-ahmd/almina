import axios from 'axios';
import React, { useState } from 'react'
import product from './product';
import { Link } from 'react-router-dom';
import baseURL from '../../axiosConfig';

const ProductCard_admin = ({product}) => {
    const [productFilter, setProductFilter] = useState();
    const deleteProduct = () => {
        axios
        .delete(`${baseURL}/api/products/${product._id}`)
        .then((res) => {
        })
        .catch((error) => console.log(error));
}
    
  return (
  <div className="admin">
   <div className="p-1 p-md-2">
   <div className="products p-2">
            <div className=" card-product">
           {product.sale?( <div className="text-center position-relative">
                  <div className=" position-absolute top-0 start-0">
                    <span className="badge">Sale</span>
                  </div>
                  </div>): ''}
            <img src={`${baseURL}/api/products/images/${product.image}`} alt="Product image" className="card-img img-fluid product-image"  />
              <div className="px-2 pt-3">
               
                <div className="mb-1">
                  
                  <div className="d-flex justify-content-between">
                  <span className='category-name text-pb fw-400 text-small'>{product.category.name}</span>
                
                  <span className="product-price">AED {product.vat ? (parseFloat((product.price + ((product.price / 100) * 5)).toFixed(2))) : product.price}</span>
                  </div>

                <h6 className="fw-500 mt-1 overflow product-name">{product.name}</h6>
                </div>
               
                <div className="">
                  
                 <div className='d-flex justify-content-between'>
                 <div className=' d-flex  align-items-center rounded-1'>
                  <div className="btn  btn-sm text-pr d-flex p-0 text-sm d-flex align-items-center" onClick={deleteProduct}>
                    <i className="bi bi-trash fs-6 pe-1 text-sm"></i>
                    <span>
                      Delete
                    </span>
                      </div></div>
                      <div className=' d-flex  '>
                        <Link to = {`/admin/product/update/${product._id}`} className="btn  btn-sm d-flex"  ><i className="bi bi-pen  pe-2 text-pg text-sm"></i>
                      <span className='text-pg text-sm'>Edit</span>
                      </Link>
                      </div>
                 </div>
                </div>
              </div>
            </div>
          </div>
   </div>
    
 
   </div>
  )
}

export default ProductCard_admin
