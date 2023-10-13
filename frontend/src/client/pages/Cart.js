import React, { useContext, useEffect, useState } from 'react';
import { CartContext } from '../../context/cartcontext';
import {Link} from 'react-router-dom'
import Checkout from '../components/Checkout';
import baseURL from '../../axiosConfig';
const Cart = () => {




  const { cartItems, removeFromCart, handleQuantityChange,totalPrice } = useContext(CartContext);

  

 
  
  const handleRemove = (itemId) => {
    removeFromCart(itemId);
  };

 
console.log(cartItems.length);
  return (
    <>
    {cartItems.length ? (
      <div className="container mt-5 pb-5 mb-5">
      <div className=" d-flex justify-content-between align-items-center">
      <h4 className='ps-2 mb-0'>Your Cart</h4>
      <Link to='/products' className='btn btn-sm btn-outline-danger pe-2 text-small d-flex justify-content-between align-items-center me-2'>
      <i className="bi bi-chevron-left me-2 text-sm"></i>
      continue shopping</Link>
      </div>
      {cartItems.map((item) => (
        
       <div className="container mt-4">
         <div key={item.id} className="cart-items row justify-content-md-between  mb-3 justify-content-center">
          <div className="ps-0 ps-md-2 col-8 col-md-10 col-lg-10 ">
          <div className="row justify-content-start">
          <div className="ps-0 p-md-4 pe-0 col-4 d-flex col-md-4 col-lg-3 justify-content-center align-items-center">
            <a className="" href="shop-single-v1.html">
              <img src={`${baseURL}/api/products/images/${item.image}`} className='img-fluid' alt="Product" />
            </a>
            </div>
            <div className='d-flex justify-content-md-start text-start col-8 col-md-8 col-lg-9 mt-2 mt-md-0 overflow-wrap'>
            <div className="d-flex flex-column justify-content-center  h-100">
              <h6 className="product-title fs-base mb-0">
                {item.name}
              </h6>
              <div className="fs-sm">
                <span className="text-muted text-sm me-2">{item.category.name}</span>
                
              </div>
              <div className="fs-lg text-accent pt-2">
                AED {item.price}
              </div>
              {/* <div className="text-sm">
                
                VAT: {item.vat ? 'AED' + item.price : '0'}
              </div> */}
            </div>
            </div>
          </div>
          </div>
          
          <div className="d-flex justify-content-center flex-column align-items-center col-3 col-md-2 col-lg-2 ">
        


<div className="quantity-input d-flex justify-content-center align-items-center p-2">
<button
  className=" quantity-btn minus"
  type="button"
  value="-"
  onClick={(event) => handleQuantityChange(event, item)}
  disabled={item.quantity <= 1}
>
  -
</button>
            <input
  className="form-control count-input quantity-btn d-inline-block"
  type="number"
  id={`quantity${item.id}`}
  min="1"
  value={item.quantity}
  onChange={(event) => handleQuantityChange(event, item)}
/>


<button
  className=" quantity-btn plus"
  type="button"
  value="+"
  onClick={(event) => handleQuantityChange(event, item)}
>
  +
</button>
</div>


            <div className=" px-0 text-danger d-flex justify-content-center align-items-center mt-2" type="button" onClick={() => handleRemove(item)}>
            <i className="bi bi-x-circle me-2 text-sm"></i>
              <span className="text-small fw-100 ">Remove</span>
            </div>
          </div>
        </div>
       </div>
      ))}

     
    </div>
    ):(
      <div className="container empty-cart d-flex align-items-center justify-content-center flex-fill mt-5">
      <div className="row text-center p-5 ">
        <div className="col-12 col-md-8 col-lg-6 text-center mx-md-auto">
          <div className="mb-5">
            <span className="u-icon rounded-circle mb-4">
              <span className="fa fa-shopping-bag "></span>
            </span>
            <h2 className="">Your cart is currently empty</h2>
            <p className='fw-300'>Before proceed to checkout you must add some products to your shopping cart. You will find a lot of interesting products on our "Products" page.</p>
          </div>
          <Link to='/products' className="btn btn-wide " >Start Shopping</Link>
        </div>
      </div>
    </div>
    )}

{cartItems.length>0 && <div className="pay-popup ">
<div className="price-items">
  <span className='text-small'>Cart Subtotal</span>
  <h2> <small>AED</small> {totalPrice}</h2>
</div>
<Link to="/checkout" className="btn btn-lg theme-btn pay-btn mt-0">Proceed to Checkout</Link>
</div>}
</>
  );
};

export default Cart;
