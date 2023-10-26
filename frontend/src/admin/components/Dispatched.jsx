import axios from 'axios';
import React, { useEffect, useState } from 'react';
import baseURL from '../../axiosConfig';
import io from 'socket.io-client';
import NotificationSound from "../assets/notification.mp3";
const socket = io.connect(baseURL);

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [userCities, setUserCities] = useState([]);
  const [excludeCities, setExcludeCities] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    const handleNewOrder = (order) => {
      try {
        const currentCity = JSON.parse(localStorage.getItem('cities')) || [];
        fetchOrders(currentCity);

      } catch (error) {
        console.error('Error updating orders:', error);
      }
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
          return !cities.includes(order.customer.city) && order.dispatched;
        } else {
          return cities.includes(order.customer.city) && order.dispatched;
        }
      });
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleDispatchOrder = async (orderId) => {
    try {
      await axios.put(`${baseURL}/api/orders/${orderId}`, { dispatched: false });
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
      <div className="row">
        <div className="pt-4">
          <div className="card-header border-0 d-flex justify-content-between">
            {/*<!-- Title -->*/}
            <h2 className="card-header-title h4 text-uppercase">
              Recent orders
            </h2>
            {/*<!-- Dropdown -->*/}
            <div className="dropdown">
              <a href="javascript: void(0);" className="dropdown-toggle no-arrow text-secondary" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="14" width="14">
                  <g>
                    <circle cx="12" cy="3.25" r="3.25" style={{ fill: 'currentColor' }}></circle>
                    <circle cx="12" cy="12" r="3.25" style={{ fill: "currentColor" }}></circle>
                    <circle cx="12" cy="20.75" r="3.25" style={{ fill: "currentColor" }}></circle>
                  </g>
                </svg>
              </a>
              <div className="dropdown-menu">
                <a href="javascript: void(0);" className="dropdown-item">
                  Export report
                </a>
                <a href="javascript: void(0);" className="dropdown-item">
                  Share
                </a>
                <a href="javascript: void(0);" className="dropdown-item">
                  Action
                </a>
              </div>
            </div>
          </div>
          {/*<!-- Card -->*/}
          <div className="card border-0">
            {/*<!-- Table -->*/}
            <div className="table-responsive">
              <table id="projectsTable" className="table table-borderless table-edge table-nowrap mb-0">
                <thead className="thead-light table-nowrap">
                  <tr className=''>
                    <th scope="col" className="">No.</th>
                    <th scope="col">Order ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Address</th>
                    <th className="col">Link</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Note</th>
                    <th scope="col">Total</th>
                    <th scope="col">Action</th> {/* New column for action */}
                  </tr>
                </thead>
                <tbody className=''>
                  {orders.map((order, index) => (
                    <React.Fragment key={order._id}>
                      <tr className=''>
                        <td>{index + 1}</td>
                        <td>#{order.orderId}</td>
                        <td>{order.customer.name}</td>
                        <td>{order.customer.mobile}</td>
                        <td>
                          <small> building: {order.customer.buildingname}, room: {order.customer.flatno}, <span className='fw-bold'>{order.customer.address}</span>, {order.customer.city}, {order.customer.emirate}</small>
                        </td>
                        <td>{order.customer.maplink ? order.customer.maplink : 'No link'}</td>
                        <td>
                          <span className="badge bg-faded-success text-pb p-2">{order.customer.payment}</span>
                        </td>
                        <td>{order.customer.note}</td>
                        <td>{order.customer.totalAmount}</td>
                        <td>
                          {!order.dispatched && (
                            <button className="btn btn-dark btn-sm" onClick={() => handleDispatchOrder(order._id)}>
                              revoke Dispatch
                            </button>
                          )}
                        </td>
                        <div className="table-toggle-wrapper">
                          <a className="table-toggle pe-2" data-bs-toggle="collapse" href={`#multiCollapseExample${index}`} role="button" aria-expanded="false" aria-controls={`multiCollapseExample${index}`}>
                            <i class="bi bi-caret-down-fill"></i>
                          </a>
                        </div>
                      </tr>
                      <tr className="collapse multi-collapse" id={`multiCollapseExample${index}`}>
                        <td colSpan="9">
                          <table className="table table-borderless align-middle table-edge table-nowrap mb-0">
                            <thead className="thead-light">
                              <tr>
                                <th className="w-60px">No.</th>
                                <th scope="col">Image</th>
                                <th scope="col">Name</th>
                                <th scope="col">Price</th>
                                <th scope="col">Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.cartItems.map((cartItem, index) => (
                                <tr key={index}>
                                  <td>{index + 1}</td>
                                  <td>
                                    <img className="rounded-1" src={`${baseURL}/api/products/images/${cartItem._id.image}`} width="60" alt={cartItem._id.name} />
                                  </td>
                                  <td>{cartItem._id.name}</td>
                                  {cartItem._id.salePrice ?
                                  <>
                                  <td className=''><span className='text-strike me-2'>{cartItem._id.price}</span>{cartItem._id.salePrice}</td>
                                  </>
                                  
                                  :
                                  <td>{cartItem._id.price}</td>
}
                                  <td>{cartItem.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/*<!-- / .table-responsive -->*/}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderList;
