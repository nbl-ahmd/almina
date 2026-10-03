import axios from 'axios';
import React, { useEffect, useState } from 'react';
import baseURL from '../../axiosConfig';
import io from 'socket.io-client';
import { Button, Container, Card, Table, TableRow, TableCell, TableBody, TableHead, Collapse, Typography, Box, Grid, Paper, Chip, TableContainer } from '@mui/material';
import NotificationSound from "../assets/notification.mp3";
import { Link } from 'react-router-dom';
const socket = io.connect(baseURL, { withCredentials: true });


const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [userCities, setUserCities] = useState([]);
  const [excludeCities, setExcludeCities] = useState([]);
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
  useEffect(() => {
    const handleNewOrder = (order) => {
      try {
        const currentCity = JSON.parse(localStorage.getItem('cities')) || [];
        fetchOrders(currentCity);

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

  const fetchExcludeCities = async () => {
    setUserCities([]);
    await fetchOrders([]); // The server applies role/city permissions, including empty assignments.
  };

  const fetchOrders = async (cities) => {
    try {
      const response = await axios.get(`${baseURL}/api/orders`);
      const filteredOrders = response.data.filter(order => {
        const currentCity = JSON.parse(localStorage.getItem('cities')) || [];
        if (currentCity.length === 0) {
          return !cities.includes(order.customer.city) && order.dispatched && !order.canceled;
        } else {
          return cities.includes(order.customer.city) && order.dispatched && !order.canceled;
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
    });
  };

  return (
    <div className="container-fluid h-100">
      {notificationPermission === 'default' && (
        <button className='btn btn-p mt-2 mb-2' onClick={handleRequestNotificationPermission}>Enable Notifications</button>
      )}
     
        <div className="pt-4">
         
            {/*<!-- Title -->*/}
            
            {/*<!-- Dropdown -->*/}
           
         
          



          <Container sx={{mb:3}}>
          <h2 className="card-header-title h4 text-uppercase">
              Dispatched Orders
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
                          <Link to={`/admin/orders/${order._id}`} orders ={orders}>
                          <i className="bi bi-eye-fill " style={{color: '#7D879C'}}></i>
                          </Link>
                          
                        </TableCell>
                      </TableRow>
                      <TableRow className="collapse multi-collapse" id={`multiCollapseExample${index}`}>
                        <TableCell colSpan="10" sx={{ bgcolor: 'rgb(244, 246, 248)', borderBottom: 'none' }}>
                          {order.cartItems.map((cartItem, index) => (
                            <Box key={index} sx={{ p: 4, bgcolor: '#fff', borderRadius: '15px', display: 'flex', alignItems: 'center' , mb: 1}}>
                              <div className='d-flex flex-grow-1'>
                                <img src={`${baseURL}/api/products/images/${cartItem._id?.image ||"data:image/png;base64,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"}`} alt="" width={'100px'} className='me-4 bg-body border rounded-3' />


                                 <div className='d-flex flex-column justify-content-center'>
                                  <span>
                                  {cartItem._id?.sale &&
                              <span className={`badge mb-2 ${getSaleTypeClass(cartItem._id.saleType)}`}>{cartItem._id.saleBadge || 'sale'}</span>
                              }
                                  </span>
                                 <span className='mb-2'>
                                  {cartItem._id?.name || 'deleted product'}
                                  
                                </span>
                                 <span>
                                  {cartItem._id?.category?.name || "deleted cateory"}
                                </span>
                                 </div>
                                
                              </div>
                              
                               <div className='d-flex w-25 justify-content-between'>
                               <div>
                                  x {cartItem.quantity}
                                </div>

                                
                                  <div>
                                  {cartItem._id?.salePrice ?
                                    <>
                                      <span className=''><span className='text-strike me-2'>{cartItem._id.price}</span>{cartItem._id.salePrice}</span>
                                    </>

                                    :
                                    <span>{cartItem._id?.price}</span>}
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
                Currently, there are no dispatched orders.
                </Typography>
               </Box>)}
            </Card>
          </Container>

        </div>
      </div>
 
  );
};

export default OrderList;
