import axios from 'axios';
import React, { useEffect, useState } from 'react'
import baseURL from '../../axiosConfig';


const Orderlist = () => {

    const [order, setOrder] = useState([]);
    useEffect(() => {

        axios.get(`${baseURL}/api/orders`)
        .then(response => {
          console.log(response.data);
          setOrder(response.data);
            })
            .catch(error => console.log(error));
       },
       []);


       console.log(order);
  return (
    <div className='container'>
      <div className="row">
                    <div className="">

                         {/*<!-- Card -->*/}
                        <div className="card border-0 card-h-100">
                            <div className="card-header border-0 d-flex justify-content-between">
                                
                                {/*<!-- Title -->*/}
                                <h2 className="card-header-title h4 text-uppercase">
                                    Recent orders
                                </h2>
                                
                                {/*<!-- Dropdown -->*/}
                                <div className="dropdown">
                                    <a href="javascript: void(0);" className="dropdown-toggle no-arrow text-secondary" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="14" width="14"><g><circle cx="12" cy="3.25" r="3.25" style={{fill: 'currentColor'}}></circle><circle cx="12" cy="12" r="3.25" style={{fill: "currentColor"}}></circle><circle cx="12" cy="20.75" r="3.25" style={{fill: "currentColor"}}></circle></g></svg>
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
{/*<!-- Table -->*/}
<div className="table-responsive">
  <table id="projectsTable" className="table table-borderless align-middle table-edge table-nowrap mb-0">
    <thead className="thead-light">
      <tr>
        <th scope="col" className="w-60px">No.</th>
        <th scope="col">Order ID</th>
        <th scope="col">Name</th>
        <th scope="col">Mobile</th>
        <th scope="col">Address</th>
        <th className="text-end">Link</th>
        <th scope="col">Status</th>
        <th scope="col">Action</th>
      </tr>
    </thead>
    <tbody className=''>
      {order.map((order, index) => (
        <React.Fragment key={order._id}>
          <tr>
            <td>{index + 1}</td>
            <td>{order._id}</td>
            <td>{order.customer.name}</td>
            <td>{order.customer.mobile}</td>
            <td>{order.customer.address}</td>
            <td><span className="badge text-bg-success-soft rounded-pill">Paid</span></td>
            <td className="text-end">Nicole Hendrix</td>
            <td className="text-end">
              <a className="btn btn-primary" data-bs-toggle="collapse" href={`#multiCollapseExample${index}`} role="button" aria-expanded="false" aria-controls={`multiCollapseExample${index}`}>
                0
              </a>
            </td>
          </tr>
          <tr className="collapse multi-collapse" id={`multiCollapseExample${index}`}>
            <td colSpan="8">
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
                        <img className='rounded-1' src={`${baseURL}/api/products/images/${cartItem._id.image}`} width="60"/>
                        
                        
                        </td>
                      <td>{cartItem._id.name}</td>
                      <td>{cartItem._id.price}</td>
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

  )
}

export default Orderlist
