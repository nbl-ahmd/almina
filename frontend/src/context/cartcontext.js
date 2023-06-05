import axios from 'axios';
import React, { createContext, useEffect, useState } from 'react';
import baseURL from '../axiosConfig';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    // Retrieve cart items from local storage on initial render
    const storedCartItems = localStorage.getItem('cartItems');
    return storedCartItems ? JSON.parse(storedCartItems) : [];
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [totalVatPrice, setTotalVatPrice] = useState(0);
  const [totalVat, setTotalVat] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [ordermodal, setOrderModal] = useState('');

  useEffect(() => {
    calculateTotalPrice();
    calculateTotalVatPrice();
    calculateTotalVat();
  }, [cartItems]);

  const calculateTotalPrice = () => {
    let totalPrice = 0;
    cartItems.forEach((item) => {
      totalPrice += item.price * item.quantity;
    });
    setTotalPrice(totalPrice);
    console.log("total price: " + totalPrice);
  };

  const calculateTotalVat = () => {
    let totalVat = 0;
    cartItems.forEach((item) => {
      const itemVat = item.vat ? (item.price / 100) * 5 : 0;
      const vat = itemVat * item.quantity;
      totalVat += vat;
    });
    const roundedTotalVat = totalVat.toFixed(2);
    setTotalVat(parseFloat(roundedTotalVat));
    console.log("total vat: " + roundedTotalVat);
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
    console.log("total vat price: " + roundedTotalVatPrice);
  };

  const [customerInfo, setCustomerInfo] = useState({
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
    totalprice: totalPrice
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

  const addToCart = async (item) => {
    try {
      const response = await axios.get(`${baseURL}/api/products/${item._id}`);
      const product = response.data;

      const existingCartItemIndex = cartItems.findIndex((cartItem) => cartItem._id === item._id);

      if (existingCartItemIndex !== -1) {
        // If item already exists in cart, increment the quantity
        const updatedCartItems = [...cartItems];
        const updatedQuantity = updatedCartItems[existingCartItemIndex].quantity + 1;

        if (updatedQuantity > product.stock) {
          alert('Stock is low!');
          return;
        }

        updatedCartItems[existingCartItemIndex].quantity = updatedQuantity;
        console.log('already in cart');

        // Update local storage with the updated cart items
        localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));

        setCartItems(updatedCartItems);
      } else {
        // If item does not exist in cart, add it with quantity 1
        if (1 > product.stock) {
          alert('Stock is low!');
          return;
        }

        const updatedCartItems = [...cartItems, { ...item, quantity: 1 }];

        // Update local storage with the updated cart items
        localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));

        setCartItems(updatedCartItems);
      }
    } catch (error) {
      console.error('Error fetching product stock:', error);
    }
  };

  const removeFromCart = (item) => {
    console.log('deleted');
    console.log(item);
    setCartItems((prevCartItems) => {
      const updatedCartItems = prevCartItems.filter((cartItems) => cartItems._id !== item._id);
      // Update local storage with the updated cart items
      localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));
      return updatedCartItems;
    });
  };

  const handleCheckout = () => {
    // Prepare the data to be uploaded to MongoDB
    const orderData = {
      customer: {
        name: customerInfo.name,
        mobile: customerInfo.mobile,
        email: customerInfo.email,
        emirate: customerInfo.emirate,
        city: customerInfo.city,
        address: customerInfo.address,
        buildingname: customerInfo.buildingname,
        flatno: customerInfo.flatno,
        note: customerInfo.note,
        payment: customerInfo.payment,
        totalprice: totalPrice,
        maplink: customerInfo.maplink



      },
      cartItems: cartItems
    };

    // Send a POST request to your MongoDB server to save the order data
    console.log(orderData);
    axios
      .post(`${baseURL}/api/orders`, orderData)
      .then((response) => {
        // Handle the response if needed
        console.log('Order saved successfully:', response.data);
        const orderId = response.data.orderId;

        // Set the order ID in the orderModal state
        setOrderModal(orderId);
        console.log('id' +ordermodal);
        // // Clear the cart and customer information after successful upload
         setCartItems([]);
         setCustomerInfo({
           name: '',
           mobile: '',
           email: '',
           address: ''
         });
         localStorage.removeItem('cartItems');
        
      })
      .catch((error) => {
        // Handle the error if needed
        console.error('Error saving order:', error);
      });
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
        totalPrice,
        totalVatPrice,
        totalVat,
        setCustomerInfo
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
				<p className='fw-300'>Your order with ID <span className='fw-400 text-pg'>{ordermodal}</span> has been placed successfully.
        
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

