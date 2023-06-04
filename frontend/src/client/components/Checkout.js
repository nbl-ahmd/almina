import React, { useState, useContext, useEffect } from 'react';
import { CartContext } from '../../context/cartcontext';
import { useNavigate } from 'react-router-dom';

const Checkout = () => {

  


  const navigate = useNavigate();
  const { customerInfo, setCustomerInfo, handleCheckout, cartItems, totalPrice, totalVatPrice, totalVat } = useContext(CartContext);
  const [currentLocation, setCurrentLocation] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [city, setCity] = useState('select City');
  const [emirate, setEmirate] = useState('select Emirate');
  const [errorMessage, setErrorMessage] = useState('');
  const [deliveryfee, setDeliveryfee] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState(false);

 
  const validateForm = () => {
    let hasError = false;
  
    if (customerInfo.name.trim() === '') {
      hasError = true;
    }
  
    if (customerInfo.mobile.trim() === '') {
      hasError = true;
    }
  
    if (customerInfo.email.trim() === '') {
      hasError = true;
    }
  
    if (customerInfo.address.trim() === '') {
      hasError = true;
    }
    if (hasError === false) {
      handleCheckout();
    }
    else{
      setErrorMessage('fill required files');
    }
    

  };;

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      setEmailError("Please enter a valid email");
    } else {
      setEmailError("");
    }
  };
  

  useEffect(() => {
    
    console.log("tp checkout : " + totalPrice);
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems, navigate]);

  const handleLocationFetch = () => {


    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;

          console.log(latitude, longitude);
          fetchLocation(latitude, longitude);

        },
        error => {
          console.error('Error retrieving current location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  };

  const fetchLocation = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      const address = data.display_name;
      const country = data.address.country;

      if (country !== "United Arab Emirates") {


        setErrorMessage('We only ship to UAE');
        return;
      }

      setCurrentLocation(address);
      setCustomerInfo({ ...customerInfo, address });

      const emirate = data.address.state;
      setEmirate(emirate);

      const city = data.address.suburb || data.address.industrial || data.address.city;
      // const addressParts = address.split(',');
      // let index;
      // if (addressParts.length > 4) {
      //   index = 4;
      // } else if (addressParts.length >= 3) {
      //   index = 3;
      // } else {
      //   index = 2;
      // }
      // console.log(addressParts);
      // const city = addressParts[addressParts.length - index].trim();
      setCity(city);
      console.log(city);
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };


  const handleLocationEdit = () => {
    setEditingLocation(true);
  };

  const handleLocationChange = e => {
    setCurrentLocation(e.target.value);
    setCustomerInfo({ ...customerInfo, address: e.target.value });
  };
  const handleEmiratesChange = e => {
    setEmirate(e.target.value);
    
    
    
    setCustomerInfo({ ...customerInfo, emirate: e.target.value });
    setCity('');

setCustomerInfo({ ...customerInfo, total: (totalVatPrice+deliveryfee) })

console.log(customerInfo);
  };
  console.log(emirate);
    console.log(deliveryfee);
  return (

    <>


      {errorMessage &&
        <div className=" alert alert-danger alert-dismissible fade show" role="alert">
          <span className='me-2'>
            {errorMessage}
          </span>

          <button type="button" className="btn p-0 close" data-dismiss="alert"
            onClick={() => {
              setErrorMessage('')
            }} aria-label="Close">
            <i className="bi bi-x-circle text-sm po"></i>
          </button>
        </div>}

     <div className="mb-5 pb-5 ">
     <section className="breadcrumb__area include-bg pt-5 pb-5">
        <div className="container">
          <div className="row">
            <div className="col-xxl-12">
              <div className="breadcrumb__content p-relative z-index-1">
                <h3 className="breadcrumb__title">Checkout</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="row">
          <div className="col-lg-7 mb-4">
            <div className="checkout-wrapper">
              <h3 className="tp-checkout-bill-title">Billing Details</h3>
              <div className="checkout-form">
                <div className="row">
                  <div className="col-md-12">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="name">
                        Name <span className='text-danger'>*</span>
                      </label>
                      <input
                        className="form-control"
                        type="text"
                        id="name"
                        value={customerInfo.name}
                        onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      />
                    </div>


                  </div>

                  <div className="col-12">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="mobile">
                        Mobile <span className='text-danger'>*</span>

                      </label>
                      <input
                        className="form-control"
                        type="text"
                        id="mobile"
                        value={customerInfo.mobile}
                        onChange={e => setCustomerInfo({ ...customerInfo, mobile: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="form-group mt-3">
                      <label className="form-label"htmlFor="email">
                        Email <span className='text-danger'>*</span>
                      </label>
                      <input
                        className="form-control"
                        type="email"
                        id="email"
                        value={customerInfo.email}
                        onBlur={()=>{
                          validateEmail();
                        }}
                        onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      />
                      {emailError && <span className='text-danger text-small fw-300 ps-1'>
                        Provide a valid email
                        </span>}
                    </div>
                  </div>

                  <div className="col-12 ">
                    <div className=" mt-4">
                      <button
                        className=" btn icon-btn lh-1 me-4"
                        onClick={handleLocationFetch}
                        disabled={!navigator.geolocation}
                      >
                        <i className="fa-solid fa-location-arrow"></i>
                      </button>

                      <span>
                        Use my current location
                      </span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="emirate">
                        Emirate <span className='text-danger'>*</span>
                      </label>
                      <select
                        className="form-control"
                        id="emirate"
                        value={emirate}
                        
                        onChange={handleEmiratesChange}
                      >



                       <option value="">Select Emirate</option>
                        <option value="Abu Dhabi Emirate">Abu Dhabi</option>
                        <option value="Dubai">Dubai</option>
                        <option value="Sharjah Emirate">Sharjah</option>
                        <option value="Ajman Emirate">Ajman</option>
                        <option value="Umm al-Quwain">Umm Al Quwain</option>
                        <option value="Ras al-Khaimah">Ras Al Khaimah</option>
                        <option value="Fujairah Emirate">Fujairah</option>
                        {/* Add other city options */}
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="city">
                        City <span className='text-danger'>*</span>
                      </label>
                      <div className="d-flex">
                        <input
                          className="form-control"
                          type="text"
                          id="city"
                          value={city}
                          onChange={e => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                        />

                      </div>

                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="address">
                        Address <span className='text-danger'>*</span>
                      </label>
                      <div className="d-flex">
                        <input
                          className="form-control"
                          type="text"
                          id="address"
                          value={currentLocation}
                          onChange={handleLocationChange}
                        />

                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="Buildingno">
                        Building name 
                      </label>
                      <div className="d-flex">
                        <input
                          className="form-control"
                          type="text"
                          id="Buildingno"

                          onChange={e => setCustomerInfo({ ...customerInfo, buildingname: e.target.value })}
                        />

                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="roomno">
                        Flat no
                      </label>
                      <div className="d-flex">
                        <input
                          className="form-control"
                          type="text"
                          id="roomno"

                          onChange={e => setCustomerInfo({ ...customerInfo, flatno: e.target.value })}
                        />

                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="form-group mt-3">
                      <label className="form-label" htmlFor="note">
                        note
                      </label>
                      <div className="d-flex">
                        <textarea
                          className="form-control"
                          type="text"
                          id="note"
                          onChange={e => setCustomerInfo({ ...customerInfo, flatno: e.target.value })}
                        />

                      </div>
                    </div>
                  </div>

















                </div>
              </div>
            </div>
          </div>

{/* right side */}
          
          <div className="col-lg-5">
          <div className="checkout-wrapper mb-4">
          <h4 className="tp-checkout-bill-title mb-4">Order summary</h4>
          <div className="sub-total d-flex justify-content-between row text-start mb-2">
            <span className="col-9 fw-500 text-start">Product</span>
           
           
            <span className="col-3 fw-500 text-end">total</span>
            
          </div>
          
          {cartItems.map((item) => (
            <div className="sub-total d-flex justify-content-between row mb-1">
            <span className="col-9 fw-200 text-small text-start overflow-wrap">{item.name} <span className='fw-500'>x {item.quantity}</span></span>
            
           
            <span className="col-3 fw-200 text-small text-end">AED {item.vat ? (parseFloat((item.price + ((item.price / 100) * 5)).toFixed(2))) : item.price}</span>
            
          </div>
          ))}
         
        </div>
          <div className="checkout-wrapper">
         
            <div className="sub-total d-flex justify-content-between row mb-1">
            <span className="col-9 fw-200 text-small text-start overflow-wrap light-text">sub Total <span className='text-sm'>(Exl. VAT)</span> </span>
            
           
            <span className="col-3 fw-200 text-small text-end">AED {totalPrice}</span>
            
          </div>
        
            <div className="sub-total d-flex justify-content-between row mb-1">
            <span className="col-9 fw-200 text-small text-start overflow-wrap light-text">sub Total <span className='text-sm'>(Exl. VAT)</span> </span>
            
           
            <span className="col-3 fw-200 text-small text-end">AED {totalVatPrice}</span>
            
          </div>
         
            <div className="sub-total d-flex justify-content-between row mb-1">
            <span className="col-9 fw-200 text-small text-start overflow-wrap light-text">VAT Amount</span>
            
           
            <span className="col-3 fw-200 text-small text-end">AED {totalVat}</span>
            
          </div>

            <div className="sub-total d-flex justify-content-between row mb-1">
            <span className="col-9 fw-200 text-small text-start overflow-wrap light-text">Delivery Fee</span>
            
           
            <span className="col-3 fw-200 text-small text-end">AED {deliveryfee}</span>
            
          </div>
        </div>
       
        
        </div>
      </div>
      </div>

     </div>
     


      {cartItems.length>0 && <div className="pay-popup ">
<div className="price-items">
  <span className='text-small'>Order Total</span>
  <h2> <small>AED</small>{totalVatPrice+deliveryfee}</h2>
</div>



<button className="btn btn-lg theme-btn pay-btn mt-0" type="button" onClick={validateForm}>Place order</button>
</div>}
    </>

  );
};

export default Checkout;


//
