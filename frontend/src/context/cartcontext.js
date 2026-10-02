import axios from 'axios';
import React, { createContext, useEffect, useState, useRef } from 'react';
import baseURL from '../axiosConfig';



export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    // Retrieve cart items from local storage on initial render
    const storedCartItems = localStorage.getItem('cartItems');
    return storedCartItems ? JSON.parse(storedCartItems) : [];
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [totalSalePrice, setTotalSalePrice] = useState(0);
  const [totalVatPrice, setTotalVatPrice] = useState(0);
  const [totalVat, setTotalVat] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(null);
  const [ordermodal, setOrderModal] = useState('');
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const checkoutLock = useRef(false);

  useEffect(() => {
    calculateTotalPrice();
    calculateTotalVatPrice();
    calculateTotalVat();
    calculateTotalSalePrice();
  }, [cartItems]);

  const calculateTotalPrice = () => {
    let totalPrice = 0;
    cartItems.forEach((item) => {
      totalPrice += item.price * item.quantity;
    });
    const roundedtotalPrice = totalPrice.toFixed(2);
    setTotalPrice(parseFloat(roundedtotalPrice));

  };
  const calculateTotalSalePrice = () => {
    let totalSalePrice = 0;
    cartItems.forEach((item) => {
      totalSalePrice += (item.salePrice?item.salePrice:item.price) * item.quantity;
    });
    const roundedtotalSalePrice = totalSalePrice.toFixed(2);
    setTotalSalePrice(parseFloat(roundedtotalSalePrice));

  };

  const calculateTotalVat = () => {
    let totalVat = 0;
    cartItems.forEach((item) => {
      const itemVat = item.vat ? ((item.salePrice ? item.salePrice: item.price) / 100) * 5 : 0;
      const vat = itemVat * item.quantity;
      totalVat += vat;
    });
    const roundedTotalVat = totalVat.toFixed(2);
    setTotalVat(parseFloat(roundedTotalVat));
  };

  const calculateTotalVatPrice = () => {
    let totalVatPrice = 0;
    cartItems.forEach((item) => {
      const itemPrice = item.vat ? item.price + (item.price / 100) * 5 : item.price;
      const totalPrice = itemPrice * item.quantity;
      totalVatPrice += totalPrice;
    });

    const roundedTotalVatPrice = totalVatPrice.toFixed(2);
    setTotalVatPrice(parseFloat(roundedTotalVatPrice));
  };

  const [customerInfo, setCustomerInfo] = useState(() => {
    let retryCustomer = {};
    try {
      const saved = JSON.parse(sessionStorage.getItem('checkoutAttempt') || 'null');
      if (saved?.customer && Object.values(saved.customer).every(value => typeof value === 'string')) retryCustomer = saved.customer;
    } catch { /* A malformed retry cannot become authoritative input. */ }
    return {
    name: '',
    mobile: '',
    email:'',
    emirate: '',
    city: '',
    address: '',
    buildingname: '',
    flatno: '',
    total: '',
    note: '',
    payment: '',
    maplink: '',
    totalprice: totalPrice,
    totalSalePrice : totalSalePrice,
    totalVat: totalVat,
    totalAmount: totalSalePrice,
    ...retryCustomer,
  };
  });

  const handleQuantityChange = async (event, item) => {
    let newQuantity;
    if (event.target.value === '+') {
      newQuantity = item.quantity + 1;
    } else if (event.target.value === '-' && item.quantity > 1) {
      newQuantity = item.quantity - 1;
    } else {
      return; // No change if the value is neither '+' nor '-' or quantity is already 1
    }

    try {
      const response = await axios.get(`${baseURL}/api/products/${item._id}`);
      const product = response.data;

      if (newQuantity > product.stock) {
        setAlertVisible(true);
        setTimeout(() => {
          setAlertVisible(false);
        }, 2000);
          return;
       
      }

      const updatedCartItems = cartItems.map((cartItem) => {
        if (cartItem._id === item._id) {
          return { ...cartItem, quantity: newQuantity };
        }
        return cartItem;
      });

      // Update local storage with the updated cart items
      localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
      setCartItems(updatedCartItems);
    } catch (error) {
      console.error('Error fetching product stock:', error);
    }
  };

  const addToCart = async (item, quantity = 1) => {
    try {
      const response = await axios.get(`${baseURL}/api/store/status`);
      const storeStatus = response.data.status;
  
      if (storeStatus === 'closed') {
        alert('The store is currently closed. You cannot add items to your cart.');
        return;
      }
  
      try {
        const response = await axios.get(`${baseURL}/api/products/${item._id}`);
        const product = response.data;
  
        const existingCartItemIndex = cartItems.findIndex((cartItem) => cartItem._id === item._id);
  
        if (existingCartItemIndex !== -1) {
          // If item already exists in cart, increment the quantity
          const updatedCartItems = [...cartItems];
          const updatedQuantity = updatedCartItems[existingCartItemIndex].quantity + quantity;
  
          if (updatedQuantity > product.stock) {
            alert('Stock is low!');
            return;
          }
  
          updatedCartItems[existingCartItemIndex].quantity = updatedQuantity;
  
          // Update local storage with the updated cart items
          localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
  
          setCartItems(updatedCartItems);
        } else {
          // If item does not exist in cart, add it with the provided or default quantity
          if (quantity > product.stock) {
            alert('Stock is low!');
            return;
          }
  
          const updatedCartItems = [...cartItems, { ...item, quantity }];
  
          // Update local storage with the updated cart items
          localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
  
          setCartItems(updatedCartItems);
        }
      } catch (error) {
        console.error('Error fetching product stock:', error);
      }
    } catch (error) {
      console.error('Error fetching store status:', error);
    }
  };
  
  const removeFromCart = (item) => {
  
    setCartItems((prevCartItems) => {
      const updatedCartItems = prevCartItems.filter((cartItems) => cartItems._id !== item._id);
      // Update local storage with the updated cart items
      localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
      return updatedCartItems;
    });
  };

  const handleCheckout = async () => {
    if (checkoutLock.current) return;
    checkoutLock.current = true;
    setCheckoutPending(true);
    setCheckoutError('');
    const customer = Object.fromEntries(['name', 'mobile', 'email', 'emirate', 'city', 'address', 'buildingname',
      'flatno', 'note', 'payment', 'maplink'].map(field => [field, customerInfo[field] || '']));
    const intent = { customer, items: cartItems.map(item => ({ productId: item._id, quantity: item.quantity })) };
    try {
      // Preserve the exact attempt across reloads/timeouts. A changed cart cannot reuse an uncertain attempt.
      const stored = sessionStorage.getItem('checkoutAttempt');
      const attempt = stored ? JSON.parse(stored) : { ...intent, idempotencyKey: crypto.randomUUID() };
      if (stored && JSON.stringify({ customer: attempt.customer, items: attempt.items }) !== JSON.stringify(intent)) {
        setCheckoutError('A previous checkout has an uncertain result. Restore its cart and details and retry before placing another order.');
        return;
      }
      // Review a live quote before sending an intent. Checkout recalculates again within its transaction.
      if (!stored) {
        const quote = await axios.post(`${baseURL}/api/orders/quote`, intent);
        if (!window.confirm(`Place order for AED ${(quote.data.totalMinor / 100).toFixed(2)}? Prices are confirmed by the server.`)) return;
      }
      sessionStorage.setItem('checkoutAttempt', JSON.stringify(attempt));
      const response = await axios.post(`${baseURL}/api/orders`, attempt);
      setConfirmedTotal(response.data.totals.totalMinor / 100);
      setOrderModal(response.data.orderId);
      sessionStorage.removeItem('checkoutAttempt');
      setCartItems([]);
      setCustomerInfo({ name: '', mobile: '', email: '', address: '' });
      localStorage.removeItem('cartItems');
    } catch (error) {
      // Explicit non-commit validation failures can be corrected. Keep retry key on ambiguous failures/timeouts.
      if ([400, 422].includes(error.response?.status) || ['INSUFFICIENT_STOCK', 'PRODUCT_UNAVAILABLE'].includes(error.response?.data?.code)) sessionStorage.removeItem('checkoutAttempt');
      setCheckoutError('Checkout could not be completed. Check availability and details, then retry. A retry will not place the same order twice.');
    } finally {
      checkoutLock.current = false;
      setCheckoutPending(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        handleQuantityChange,
        removeFromCart,
        setCartItems,
        addToCart,
        customerInfo,
        handleCheckout,
        checkoutPending,
        checkoutError,
        totalPrice,
        totalSalePrice,
        totalVatPrice,
        totalVat,
        setCustomerInfo,
        
      }}
    >
{}
{ordermodal && (
 <>
  
 <div className="model-bg">
   <div id="myModal" className="model">
			<div className="modal-header justify-content-end">
			<button type="button" className="btn close" data-dismiss="modal" aria-hidden="true"
      onClick={()=>{
        
        setOrderModal('');

      }}
      >&times;</button>
			</div>
	<div className="modal-icon d-flex justify-content-center">
  <i className="fa-regular fa-circle-check"></i>
		</div>
    <div className="modal-content">
			<div className="modal-body text-center">
				<h5 className='mb-3'>Order Placed Successfully!</h5>	
				<p className='fw-300'>Your order with ID <span className='fw-400 text-pg'>{ordermodal}</span> has been placed successfully for AED {confirmedTotal?.toFixed(2)}.
        
        <br />
        Thank you for choosing our Almina Pharmacy
        </p>
       
				
			</div>
	</div>
</div> 
 </div>

 

 </>   
)}
      {alertVisible && (
      <div className=" alert alert-danger alert-dismissible fade show" role="alert">
          <span className='me-2'>
            Stock is low!
          </span>
          <button type="button" className="btn p-0 close" data-dismiss="alert"
            onClick={() => {
              setAlertVisible(false)
            }} aria-label="Close">
            <i className="bi bi-x-circle text-sm po"></i>
          </button>
          
          </div>

      )}
      {children}
    </CartContext.Provider>
  );
};

