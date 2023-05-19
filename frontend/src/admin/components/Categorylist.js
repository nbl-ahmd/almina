import axios from 'axios';
import React, { useEffect } from 'react'
import Categoryupdate from './Categoryupdate';
import { Link } from 'react-router-dom';

function Categorylist({category}) {

    const deleteCategory = () => {
        axios
        .delete(`http://192.168.70.104:4000/api/category/${category._id}`)
        .then((res) => {
        })
        .catch((error) => console.log(error));
}
  return (
    <div>
      <tr className="border-bottom border-200 d-flex justify-content-between">
                          <td>
                            <div className="d-flex align-items-center position-relative">
                            <div className="flex-1 ms-3">
                                <h6 className="mb-1 fw-semi-bold"><a className="text-dark stretched-link" href="#!">{category.name}</a></h6>
                                
                              </div>
                            </div>
                          </td>
                          <td className="align-middle pe-x1">
                             <div className="d-flex align-items-center">
                              
                             <div className=' d-flex add-to-cart-btn me-2'><button  className="btn  btn-sm text-white d-flex" onClick={deleteCategory}><i className="bi bi-trash fs-5"></i>
                      </button></div>

                             <div className=' d-flex add-to-cart-btn'><Link to = {`/admin/categories/update/${category._id}`} className="btn  btn-sm text-white d-flex"  ><i className="bi bi-pen-fill fs-5"></i>
                      </Link>
                      </div>
                            </div> 
                          </td>
                        </tr>
                       

                       

    </div>
  )
}

export default Categorylist
