import axios from 'axios';
import React, { useEffect, useState } from 'react';
import baseURL from '../../axiosConfig';
import io from 'socket.io-client';
import { Button, Container, Card, Table, TableRow, TableCell, TableBody, TableHead, Collapse, Typography, Box, Grid, Paper, Chip, TableContainer, Switch, Alert } from '@mui/material';
import NotificationSound from "../assets/notification.mp3";
import { Toaster, toast } from 'react-hot-toast';
import { onMessageListener } from '../../firebase';

import { Link } from 'react-router-dom';
const socket = io.connect(baseURL);


const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [userCities, setUserCities] = useState([]);
  const [excludeCities, setExcludeCities] = useState([]);
  const [message, setMessage] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );
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

  const [notification, setNotification] = useState({ title: '', body: '' });
  useEffect(() => {
    const unsubscribe = onMessageListener().then((payload) => {
      setNotification({
        title: payload?.notification?.title,
        body: payload?.notification?.body,
      });
      toast.success(`${payload?.notification?.title}: ${payload?.notification?.body}`, {
        duration: 60000, 
        position: 'top-right',
      });
});
    return () => {
      unsubscribe.catch((err) => console.log('failed: ', err));
    };
  }, []);


  useEffect(() => {
    const handleNewOrder = (order) => {
      try {
        const currentCity = JSON.parse(localStorage.getItem('cities')) || [];
        fetchOrders(currentCity);

        // Play audio
        const audio = new Audio(NotificationSound);
        audio.play();

        // Display push notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification('New Order Placed', {
            body: 'A new order has been received.',
          });
        }
      } catch (error) {
        console.error('Error updating orders:', error);
      }
    };

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }

    socket.on('newOrder', handleNewOrder);

    return () => {
      socket.off('newOrder', handleNewOrder);
    };
  }, [orders]);

  useEffect(() => {
    const cities = JSON.parse(localStorage.getItem('cities')) || [];
    if (Array.isArray(cities) && cities.every(city => typeof city === 'string')) {
      if (cities.length === 0) {
        fetchExcludeCities();
      } else {
        setUserCities(cities);
        fetchOrders(cities);
      }
    } else {
      fetchExcludeCities();
    }
  }, []);
  useEffect(() =>{
    if (!("Notification" in window)) {
      console.log("Browser does not support desktop notification");
      setMessage('Browser does not support desktop notification')
    } else {
      console.log("Notifications are supported");
    }
  },[] );

  const fetchExcludeCities = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/auth/users`);
      const users = response.data;
      const allCities = users.map(user => user.cities).flat();
      const excludeCities = [...new Set(allCities)]; // Remove duplicates
      setUserCities(excludeCities);
      fetchOrders(excludeCities);
    } catch (error) {
      console.error('Error fetching user cities:', error);
    }
  };

  const fetchOrders = async (cities) => {
    try {
      const response = await axios.get(`${baseURL}/api/orders`);
      const filteredOrders = response.data.filter(order => {
        const currentCity = JSON.parse(localStorage.getItem('cities')) || [];
        if (currentCity.length === 0) {
          return !cities.includes(order.customer.city) && !order.dispatched;
        } else {
          return cities.includes(order.customer.city) && !order.dispatched;
        }
      });
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleDispatchOrder = async (orderId) => {
    try {
      await axios.put(`${baseURL}/api/orders/${orderId}`, { dispatched: true });
      setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
    } catch (error) {
      console.error('Error dispatching order:', error);
    }
  };

  const handleRequestNotificationPermission = () => {
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);

      if (permission === 'granted') {
        // If permission is granted, you can now show notifications
        const notification = new Notification('Notifications Enabled', {
          body: 'You will now receive notifications for new orders.',
        });
      }
    });
  };

  return (
    <div className="container-fluid h-100">


<Toaster />

      {/* {notificationPermission === 'default' && (
        <button className='btn btn-p mt-2 mb-2' onClick={handleRequestNotificationPermission}>Enable Notifications</button>
      )} */}


     
        <div className="pt-4">
         
            {/*<!-- Title -->*/}
            
            {/*<!-- Dropdown -->*/}
           
         
          



          <Container sx={{mb:3}}>
          <h2 className="card-header-title h4 text-uppercase">
              Recent orders
            </h2>
            <Card variant="outlined" sx={{ borderRadius: '15px', border: 'none', mt: 5, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
              <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgb(244, 246, 248)', "& th": { borderBottom: 'none', color: 'rgb(99, 115, 129)' } }} >
                    <TableCell>Order ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
               
               <TableBody >
                  {orders.map((order, index) => (
                    <React.Fragment key={order._id}>
                      <TableRow sx={{ "& td": { borderBottom: 'dotted 1px rgb(241, 243, 244)', color: 'rgb(33, 43, 54)' } }}>

                        <TableCell>#{order.orderId}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>

                            <span className='fw-400 mb-2'>
                              {order.customer.name}
                            </span>
                            <span className='text-sm text'>
                              {order.customer.mobile}
                            </span>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            Building: {order.customer.buildingname}, room: {order.customer.flatno},{' '}
                            <span className="fw-bold">{order.customer.address}</span>, {order.customer.city}, {order.customer.emirate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <span className="badge bg-faded-success text-pb py-2">
                            {order.customer.payment}
                          </span>
                        </TableCell>
                        <TableCell>AED {order.customer.totalAmount}</TableCell>
                        <TableCell sx={{display: 'flex'}}>
                          {/* {!order.dispatched && (
                            <button className="btn btn-primary btn-sm text-sm" onClick={() => handleDispatchOrder(order._id)}>
                              Dispatch
                            </button>
                          )} */}
                          <div
                            className="table-toggle me-2"
                            data-bs-toggle="collapse"
                            href={`#multiCollapseExample${index}`}
                            role="button"
                            aria-expanded="false"
                            aria-controls={`multiCollapseExample${index}`}
                          
                          >
                            <i className="bi bi-caret-down-fill"></i>
                          </div>
                          <Link to={`orders/${order._id}`} orders ={orders}>
                          <i className="bi bi-eye-fill " style={{color: '#7D879C'}}></i>
                          </Link>
                          
                        </TableCell>
                      </TableRow>
                      <TableRow className="collapse multi-collapse" id={`multiCollapseExample${index}`}>
                        <TableCell colSpan="10" sx={{ bgcolor: 'rgb(244, 246, 248)', borderBottom: 'none' }}>
                          {order.cartItems.map((cartItem, index) => (
                            <Box key={index} sx={{ p: 4, bgcolor: '#fff', borderRadius: '15px', display: 'flex', alignItems: 'center' , mb: 1}}>
                              <div className='d-flex flex-grow-1'>
                                <img src={`${baseURL}/api/products/images/${cartItem._id.image}`} alt="" width={'100px'} className='me-4 bg-body border rounded-3' />


                                 <div className='d-flex flex-column justify-content-center'>
                                  <span>
                                  {cartItem._id.sale &&
                              <span className={`badge mb-2 ${getSaleTypeClass(cartItem._id.saleType)}`}>{cartItem._id.saleBadge || 'sale'}</span>
                              }
                                  </span>
                                 <span className='mb-2'>
                                  {cartItem._id.name}
                                  
                                </span>
                                 <span>
                                  {cartItem._id.category.name}
                                </span>
                                 </div>
                                
                              </div>
                              
                               <div className='d-flex w-25 justify-content-between'>
                               <div>
                                  x {cartItem.quantity}
                                </div>

                                
                                  <div>
                                  {cartItem._id.salePrice ?
                                    <>
                                      <span className=''><span className='text-strike me-2'>{cartItem._id.price}</span>{cartItem._id.salePrice}</span>
                                    </>

                                    :
                                    <span>{cartItem._id.price}</span>}
                                  </div>
                                
                               </div>
                             





                            </Box>
                          ))}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              </TableContainer>
              {orders.length === 0 && (<Box sx={{p:3 , display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow:1}}>
                <Typography>
                No Pending Orders
                </Typography>
               </Box>)}
            </Card>
          </Container>

        </div>
      </div>
 
  );
};

export default OrderList;
