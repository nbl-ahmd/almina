import React, { useState, useContext, useEffect } from 'react';
import { CartContext } from '../../context/cartcontext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Checkout = () => {




  const navigate = useNavigate();
  const { customerInfo, setCustomerInfo, handleCheckout, cartItems, totalPrice, totalSalePrice, totalVatPrice, totalVat, totalAmount } = useContext(CartContext);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');
  const [maplink, setMaplink] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  // const [city, setCity] = useState('select City');
  const [emirate, setEmirate] = useState('select Emirate');
  const [errorMessage, setErrorMessage] = useState('');
  const [deliveryfee, setDeliveryfee] = useState(0);
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState(false);
  const [suburbs, setSuburbs] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [fetchingSuburbs, setFetchingSuburbs] = useState(false);

// other state variables...

useEffect(() => {
  // Load suburbs when the emirate changes
  if (emirate) {
    fetchSuburbs();
  }
}, [emirate]);

const fetchSuburbs = async () => {
  try {
    setFetchingSuburbs(true);

    let emirateCode = '';

    // Map emirate to corresponding ISO 3166-2 code
    switch (emirate) {
      case 'Abu Dhabi Emirate':
        emirateCode = 'AE-AZ';
        break;
      case 'Dubai':
        emirateCode = 'AE-DU';
        break;
      case 'Sharjah Emirate':
        emirateCode = 'AE-SH';
        break;
      case 'Ajman Emirate':
        emirateCode = 'AE-AJ';
        break;
      case 'Umm al-Quwain':
        emirateCode = 'AE-UQ';
        break;
      case 'Ras al-Khaimah':
        emirateCode = 'AE-RK';
        break;
      case 'Fujairah Emirate':
        emirateCode = 'AE-FU';
        break;
      default:
        break;
    }

    const response = await axios.get(
      `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];area["ISO3166-2"="${emirateCode}"][admin_level=4];(node["place"="suburb"](area);way["place"="suburb"](area);relation["place"="suburb"](area););out;`
    );
    const data = response.data;
    const loadedSuburbs = data.elements.map((element) => ({
      id: element.id,
      name: element.tags['name:en'] || element.tags.name,
    }));

    setFetchingSuburbs(false);
    setSuburbs(loadedSuburbs);
  } catch (error) {
    // Handle the error, e.g., show an error message
    console.error('Error fetching suburbs:', error);
    setFetchingSuburbs(false); // Ensure it's set back to false in case of an error
  }
};




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
    if (customerInfo.payment.trim() === '') {
      hasError = true;
    }
    if (hasError === false) {

      handleCheckout();
    }
    else {
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
          if (error && error.message && error.message.includes("User denied Geolocation")){
            setErrorMessage('Please allow location permission');
          }else{
            setErrorMessage('unable to autolocate');
          }
          setFetchingLocation(false);
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
      const maplink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`

       if (country !== "United Arab Emirates") {


        setErrorMessage('We only ship to UAE');
        return;
       }
      setMaplink(maplink);
      setCurrentLocation(address);

      const emirate = data.address.state;
      setEmirate(emirate);

      const city = data.address.suburb || data.address.industrial || data.address.city;
      setSelectedCity(city);
      let deliveryfee=0;
      (emirate === 'Ras al-Khaimah') ? (deliveryfee=0) : (deliveryfee=15);
      setDeliveryfee(deliveryfee);
      

      setCustomerInfo({ ...customerInfo, address, emirate, city, maplink, totalAmount: Number((totalSalePrice + deliveryfee).toFixed(2)), deliveryFee: deliveryfee});

      console.log("emirates", emirate);
      console.log("cinfo", customerInfo);

      console.log(city);
      

    } catch (error) {
      console.error('Error fetching location:', error);
      setErrorMessage('unable to autolocate');
    }
console.log("123" + selectedCity);
setFetchingLocation(false);

  };


  const handleLocationEdit = () => {
    setEditingLocation(true);
  };

  const handleLocationChange = e => {
    setCurrentLocation(e.target.value);
    setCustomerInfo({ ...customerInfo, address: e.target.value });
  };


  // const handleEmirateChange = (event) => {
  //   setEmirate(event.target.value);
  //   setSelectedCity('');
  // };
  
  const handleCityChange = (event) => {
    setSelectedCity(event.target.value);
    setCustomerInfo({ ...customerInfo, city: event.target.value})
  };


  const handleEmirateChange = e => {
    
    const selectedEmirate = e.target.value;
    let deliveryFee = 0;
    if (selectedEmirate === 'Ras al-Khaimah') {
      deliveryFee = 0;
    } else {
      deliveryFee = 15;
    }

    setEmirate(selectedEmirate);
    setDeliveryfee(deliveryFee);
      

      setCustomerInfo({ ...customerInfo, emirate: selectedEmirate, totalAmount: Number((totalSalePrice + deliveryfee).toFixed(2)), deliveryFee: deliveryfee });
    
    console.log(customerInfo);
    

    
    
  };


  console.log(deliveryfee);
  console.log(customerInfo);
  return (

    <>


      {errorMessage &&
        <div className=" alert alert-danger alert-dismissible fade show z-3" role="alert">
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

        <div className="container mb-5">
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
                        <label className="form-label" htmlFor="email">
                          Email <span className='text-danger'>*</span>
                        </label>
                        <input
                          className="form-control"
                          type="email"
                          id="email"
                          value={customerInfo.email}
                          onBlur={() => {
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
          className={`btn icon-btn lh-1 me-4 ${fetchingLocation ? 'loading' : ''}`}
          onClick={()=>{
            setFetchingLocation(true);
            handleLocationFetch()}}
          disabled={!navigator.geolocation || fetchingLocation}
        >
          
          {fetchingLocation ? (
            <i className="fa-solid fa-circle-notch"></i>

          ) : (
            <i className="fa fa-location-arrow"></i>
          )}

            
        </button>

                        <span>
                          Use my current location
                        </span>
                      </div>
                    </div>
                   
                   
                    <div className="col-6">
        <div className="form-group mt-3">
          <label className="form-label" htmlFor="emirate">
            Emirate <span className="text-danger">*</span>
          </label>
          <select
            className="form-control"
            id="emirate"
            value={emirate}
            onChange={handleEmirateChange}
          >
            <option value="">Select Emirate</option>
            <option value="Abu Dhabi Emirate">Abu Dhabi</option>
            <option value="Dubai">Dubai</option>
            <option value="Sharjah Emirate">Sharjah</option>
            <option value="Ajman Emirate">Ajman</option>
            <option value="Umm al-Quwain">Umm Al Quwain</option>
            <option value="Ras al-Khaimah">Ras Al Khaimah</option>
            <option value="Fujairah Emirate">Fujairah</option>
          </select>
        </div>
      </div>
      
                   
                    <div className="col-6">
        <div className="form-group mt-3">
          <label className="form-label" htmlFor="city">
            City <span className="text-danger">*</span>
          </label>
          <select
            className="form-control"
            id="city"
            value={selectedCity}
            onChange={handleCityChange}
          >
            {fetchingSuburbs ? (
          <option value="">Loading Cities...</option>
        ) : (
          <>
            <option value={selectedCity || ''}>{selectedCity || 'Select City'}</option>
            {suburbs.map((suburb) => (
              <option key={suburb.id} value={suburb.name}>
                {suburb.name}
              </option>
            ))}
          </>
        )}
          </select>
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
                            onChange={e => setCustomerInfo({ ...customerInfo, note: e.target.value })}
                          />

                        </div>
                      </div>
                    </div>


                    <div className="col-12">
                      <div className="form-group mt-3">
                        <label className="form-label" htmlFor="card">
                          Payment Method <span className='text-danger'>*</span>
                        </label>
                        <div className="d-flex">
                          <div className="d-flex me-3">
                            <input
                              type="radio"
                              className="btn-check"
                              name="paymentMethod"
                              id="card"
                              value="card"
                              checked={customerInfo.payment === 'card'}
                              onChange={e => setCustomerInfo({ ...customerInfo, payment: e.target.value })}
                              required
                            />
                            <label
                              className="btn payment-card" htmlFor="card">
                              <i className="pe-2 pe-md-4 bi bi-credit-card-fill"></i>
                              <span className='text-small'>Card on Delivery</span>
                            </label>
                          </div>
                          <div className="d-flex">
                            <input
                              type="radio"
                              className="btn-check"
                              name="paymentMethod"
                              id="cash"
                              value="cash"
                              checked={customerInfo.payment === 'cash'}
                              onChange={e => setCustomerInfo({ ...customerInfo, payment: e.target.value })}
                              required
                            />
                            <label className="btn payment-card" htmlFor="cash">
                              <i className="pe-2 pe-md-4 bi bi-wallet2"></i>
                              <span className='text-small '>Cash on Delivery</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

















                  </div>
                </div>
              </div>
            </div>

            {/* right side */}

            <div className="col-lg-5 mb-4">
              <div className="checkout-wrapper mb-4">
                <h4 className="tp-checkout-bill-title mb-4">Order summary</h4>
                <div className="sub-total d-flex justify-content-between row text-start mb-2">
                  <span className="col-9 fw-500 text-start">Product</span>


                  <span className="col-3 fw-500 text-end">total</span>

                </div>

                {cartItems.map((item) => (
                  <div className="sub-total d-flex justify-content-between row mb-1">
                    <span className="col-9 fw-200 text-small text-start overflow-wrap">{item.name} <span className='fw-500'>x {item.quantity}</span></span>


                    <span className="col-3 fw-200 text-small text-end">AED {item.quantity *(item.salePrice? item.salePrice:item.price)}</span>

                  </div>
                ))}

              </div>
              <div className="checkout-wrapper">

                

                <div className="sub-total d-flex justify-content-between row mb-1">
                  <span className="col-9 fw-200 text-small text-start overflow-wrap light-text">sub Total </span>


                  <span className="col-3 fw-200 text-small text-end">AED {totalSalePrice}</span>

                </div>

                <div className="sub-total d-flex justify-content-between row mb-1">
                  <span className="col-9 fw-200 text-small text-start overflow-wrap light-text">Total estimated Vat</span>


                  <span className="col-3 fw-200 text-small text-end">AED {totalVat}</span>

                </div>

                <div className="sub-total d-flex justify-content-between row mb-1">
                  <span className="col-9 fw-200 text-small text-start overflow-wrap light-text">Delivery Fee</span>


                  <span className="col-3 fw-200 text-small text-end">AED {deliveryfee}</span>

                </div>
                <div className="sub-total d-flex justify-content-between row mb-1 pb-3 border-bottom">
                    <span className="col-6 text-start overflow-wrap">Order Total</span>


                   <div className="col-6 d-flex flex-column">
                   <span className="text-end fw-600 fs-5">AED {totalSalePrice + deliveryfee}</span>
                   <span className="text-small text-end">(All prices include VAT)</span>
                   </div>

                  </div>
              </div>
              <button className="btn btn-lg btn-dark d-none d-md-flex justify-content-center w-100 mt-3" type="button" onClick={validateForm}>Place order</button>


            </div>
          </div>
        </div>

      </div>



      {cartItems.length > 0 && <div className="pay-popup d-md-none ">
        <div className="price-items">
          <span className='text-small'>Order Total</span>
          <h2> <small>AED</small>{totalSalePrice + deliveryfee}</h2>
        </div>



        <button className="btn btn-lg theme-btn pay-btn mt-0" type="button" onClick={validateForm}>Place order</button>
      </div>}
    </>

  );
};

export default Checkout;


//
