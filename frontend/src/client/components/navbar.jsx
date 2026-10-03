import React, { useContext, useEffect, useState } from 'react';
import logo from '../assets/logo.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../../context/cartcontext';
import axios from 'axios';
import baseURL from '../../axiosConfig';
import CloseIcon from '@mui/icons-material/Close';


import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import { Button, Dialog, DialogContent, DialogContentText, DialogTitle } from '@mui/material';


const Navbar = () => {
  const [value, setValue] = React.useState(0);
const [showNotification, setShowNotification] = useState(true);
const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { cartItems } = useContext(CartContext);
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [stickyClass, setStickyClass] = useState('relative');

  useEffect(() => {
    window.addEventListener('scroll', stickNavbar);

    return () => {
      window.removeEventListener('scroll', stickNavbar);
    };
  }, []);

  const stickNavbar = () => {
    if (window !== undefined) {
      let windowHeight = window.scrollY;
      windowHeight > 500 ? setStickyClass('fixed-nav') : setStickyClass('relative');
    }
  };

  const performSearch = (event) => {
    setSearchInput(event.target.value);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    if (searchInput.trim() === '') {
      navigate('/products'); // Redirect to the products page
    } else {
      const encodedSearchInput = encodeURIComponent(searchInput.trim());


      navigate(`/search?q=${encodedSearchInput}`);
    }
  };

  const clearSearchInput = () => {
    setSearchInput('');
    navigate('/search'); // Redirect to the search page without any query parameter
  };

  return (
    <>
    <Dialog PaperProps={{
    style: {
      backgroundColor: 'rgb(31,31,31)',
      maxWidth: '400px', 
      width: '100%', 
      
    }
  }}  onClose={()=>{
      setShowNotificationModal(!showNotificationModal);
    }} open={showNotificationModal}>
      <DialogTitle id="alert-dialog-title">
      <Button sx={{float:'right', color:"white"}} onClick={()=>{
        setShowNotificationModal(!showNotificationModal)
      }}>
        <CloseIcon />
      </Button>
        </DialogTitle>
<DialogContent sx={{color: 'white', fontFamily: 'Poppins, sans-serif',
      fontWeight: '200', px:5, pb:5, fontSize:15}}>
          
        <ul>
          <li className='mb-3'>
          Our free home delivery service is available within a 15-kilometer radius from the Ras Al Khaimah city center.
          </li>
          <li className='mb-3'>
          Deliveries outside the specified 15-kilometer radius from the Ras Al Khaimah city center may be subject to additional delivery charges, which will be communicated after recieving the order.
          </li>
          <li className='mb-3'>
          Our delivery personnel will make reasonable efforts to deliver your order to the specified location. It is the customer's responsibility to provide accurate and accessible delivery information
          </li>
          <li className='mb-3'>
          We reserve the right to refuse delivery to any location or customer at our discretion, including any locations outside our service area.
          </li>
          <li className='mb-3'>
          By availing of our free home delivery service in Ras Al Khaimah, you agree to abide by these terms and conditions. We appreciate your understanding and cooperation in ensuring a smooth and reliable delivery service. If you have any questions or require further information, please do not hesitate to contact us. Thank you for choosing Al Mina Pharmacy for your Pharmacy needs.
          </li>
        </ul>
           
          </DialogContent>
    </Dialog>
    <div className={`${(location.pathname === '/' ) && showNotification ? 'home-notification-wrapper' : 'd-none'} `}>
<div className='d-flex justify-content-center flex-grow-1' style={{cursor: 'pointer'}} onClick={()=>{
setShowNotificationModal(true);
}}>
<span>Free Home Delivery across Ras Al Khaimah *</span>
</div>
 <button type="button" className="btn-close btn-close-white float-end me-2" aria-label="Close" onClick={() =>{
  setShowNotification(false);
 }}></button>
    </div>
    <nav className={`nav-wrapper ${(location.pathname === '/checkout' || location.pathname === '/cart' )? '' : stickyClass} `}>
      <header className="p-3">
        <div className="container">
          <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-around justify-content-between">
            <a href="/" className="d-flex align-items-center mb-lg-0 link-body-emphasis text-decoration-none ">
              <img src={logo} alt="" width="120px" />
            </a>
           <div className="d-flex align-items-center order-0 order-lg-1">
           <div className="me-3">
           <p className="text-muted my-0 text-sm">Delivery timing :</p>
           <p className="text-muted my-0 text-small">8 am - 12 pm</p>
           </div>
            <Link className='' to='/cart'>
              <div className='order-lg-2 icon-wrapper'>
                {cartItems.length > 0 && (
                  <span _ngcontent-ytt-c67="" className="navbar-tool-label">{cartItems.length}</span>
                )}
                <i className="bi bi-bag"></i>
              </div>
            </Link>
           </div>

            <form className="col-12 col-lg-6 mb-lg-0 me-lg-3 mt-2 mt-lg-0 order-1 order-lg-0" role="search" onSubmit={handleSearch}>
              <div className="input-group">
                <input
                  type="search"
                  className="form-control searchbar"
                  placeholder="Search..."
                  aria-label="Search"
                  value={searchInput}
                  onChange={performSearch}
                />

                {searchInput && (
                  <button type="button" className="btn clear-button" onClick={clearSearchInput}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </form>
          </div>
        {/* <div className="d-none d-lg-flex pt-3 pb-0 mb-0 ms-5 ps-4">
           <p className="text-muted my-0 text-sm">Delivery timing : 8 am - 12 pm</p>
           </div> */}
        </div>
      </header>

      <nav className="d-none d-md-flex mt-2 justify-content-center border-top border-bottom py-2">
     
        <ul className="nav container px-lg-0  mb-md-0 gap-2 ms-md-5 justify-content-center nav-ul">
          <li className='nav-li'>
            <Link to="/" className={location.pathname === '/' ? 'active px-2' : 'px-2'}>
              Home
            </Link>
          </li>
          <li className='nav-li'>
            <Link to="/products" className={location.pathname === '/products' ? 'active px-2' : 'px-2'}>
              All Products
            </Link>
          </li>
          <li className='nav-li'>
            <Link to="/categories" className={location.pathname === '/categories' ? 'active px-2' : 'px-2'}>
              Categories
            </Link>
          </li>
          <li className='nav-li'>
            <Link to="/offers" className={location.pathname === '/offers' ? 'active px-2' : 'px-2'}>
              Offers
            </Link>
          </li>
        </ul>
      </nav>
    
    </nav>
     <nav className="fixed-bottom d-md-none mobile-bottom-nav">
     <Link to={'/'} className={location.pathname === '/' ? 'active text-truncate ' : 'text-truncate '} >
     <i className="bi bi-house icon"></i>
     <span>Home</span>
     </Link>
     <Link to={'/products'} className={location.pathname === '/products' ? 'active text-truncate ' : 'text-truncate'} >
     <i className="bi bi-prescription2 icon"></i>
     <span>All Products</span>
     </Link>
     <Link to={'/categories'} className={location.pathname === '/categories' ? 'active text-truncate ' : 'text-truncate'} >
     <i className="bi bi-ui-checks-grid icon"></i>
     <span>Categories</span>
     </Link>
     
    </nav>
    </>



  );
};

export default Navbar;
