import axios from 'axios';
import React, { createContext, useEffect, useState } from 'react';

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
    console.log("total price : " + totalPrice);
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
    console.log("total vat : " + roundedTotalVat);
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
    emirate: '',
    city: '',
    address: '',
    buildingname: '',
    flatno: ''
  });

  const handleQuantityChange = (event, item) => {
    let newQuantity;
    if (event.target.value === '+') {
      newQuantity = item.quantity + 1;

    } else if (event.target.value === '-' && item.quantity > 1) {
      newQuantity = item.quantity - 1;

    } else {
      return; // No change if the value is neither '+' nor '-' or quantity is already 1
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
  };


  const addToCart = (item) => {
    setCartItems((prevCartItems) => {
      const existingCartItemIndex = prevCartItems.findIndex(
        (cartItem) => cartItem._id === item._id
      );

      if (existingCartItemIndex !== -1) {
        // If item already exists in cart, increment the quantity
        const updatedCartItems = [...prevCartItems];
        console.log('already in cart')

        // Update local storage with the updated cart items
        localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));

        return updatedCartItems;
      } else {
        // If item does not exist in cart, add it with quantity 1
        const updatedCartItems = [...prevCartItems, { ...item, quantity: 1 }];

        // Update local storage with the updated cart items
        localStorage.setItem('cartItems', JSON.stringify(updatedCartItems));

        return updatedCartItems;
      }
    });
  };




  const removeFromCart = (item) => {
    console.log('deleted')
    console.log(item)
    setCartItems((prevCartItems) => {
      const updatedCartItems = prevCartItems.filter(
        (cartItems) => cartItems._id !== item._id
      );
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
        address: customerInfo.address
      },
      cartItems: cartItems
    };

    // Send a POST request to your MongoDB server to save the order data
    console.log(orderData);
    axios.post('http://192.168.70.104:4000/api/orders', orderData)
      .then(response => {
        // Handle the response if needed
        console.log('Order saved successfully:', response.data);

        // Clear the cart and customer information after successful upload
        setCartItems([]);
        setCustomerInfo({
          name: '',
          mobile: '',
          address: ''
        });

        // Clear the cart items from local storage
        localStorage.removeItem('cartItems');
      })
      .catch(error => {
        // Handle the error if needed
        console.error('Error saving order:', error);
      });
  };


  //stop
  return (
    <CartContext.Provider value={{
      cartItems, handleQuantityChange, removeFromCart, setCartItems, addToCart, customerInfo, handleCheckout, totalPrice,totalVatPrice, totalVat,
      setCustomerInfo
    }}>
      {children}
    </CartContext.Provider>
  );
};


