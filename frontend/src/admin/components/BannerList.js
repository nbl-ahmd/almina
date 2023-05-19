import axios from 'axios';
import React from 'react'

export default function BannerList({banners}) {

    const deleteBanner = () => {
        axios
        .delete(`http://192.168.70.104:4000/api/banners/${banners._id}`)
        .then((res) => {
        })
        .catch((error) => console.log(error));
}
  return (
    <div>
      <tr className="border-bottom border-200 d-flex justify-content-between">
                          <td>
                            <div className="d-flex align-items-center position-relative"><img className="rounded-1 border border-200" src={`http://192.168.70.104:4000/api/banners/images/${banners.image}`} width="60" alt="" />
                              <div className="flex-1 ms-3">
                                <h6 className="mb-1 fw-semi-bold"><a className="text-dark stretched-link" href="#!">{banners.name}</a></h6>
                                
                              </div>
                            </div>
                          </td>
                          
                          <td className="align-middle pe-x1">
                             <div className="d-flex align-items-center">
                              
                             <div className=' d-flex add-to-cart-btn'><button href="#!" className="btn  btn-sm text-white d-flex" onClick={deleteBanner}><i className="bi bi-trash fs-5"></i>
                      </button></div>
                            </div> 
                          </td>
                        </tr>
    </div>
  )
}
