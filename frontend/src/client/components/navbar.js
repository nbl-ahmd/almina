import React, { useContext, useEffect, useState } from 'react';
import logo from '../assets/logo.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../../context/cartcontext';
import axios from 'axios';
import baseURL from '../../axiosConfig';


import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';


const Navbar = () => {
  const [value, setValue] = React.useState(0);

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
    <nav className={`nav-wrapper ${stickyClass}`}>
      <header className="p-3">
        <div className="container">
          <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-around justify-content-between">
            <a href="/" className="d-flex align-items-center mb-lg-0 link-body-emphasis text-decoration-none ">
              <img src={logo} alt="" width="120px" />
            </a>

            <Link className='order-0 order-lg-1' to='/cart'>
              <div className='order-lg-2 icon-wrapper'>
                {cartItems.length > 0 && (
                  <span _ngcontent-ytt-c67="" className="navbar-tool-label">{cartItems.length}</span>
                )}
                <i className="bi bi-bag"></i>
              </div>
            </Link>

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
     <i class="bi bi-house icon"></i>
     <span>Home</span>
     </Link>
     <Link to={'/products'} className={location.pathname === '/products' ? 'active text-truncate ' : 'text-truncate'} >
     <i class="bi bi-prescription2 icon"></i>
     <span>All Products</span>
     </Link>
     <Link to={'/categories'} className={location.pathname === '/categories' ? 'active text-truncate ' : 'text-truncate'} >
     <i class="bi bi-ui-checks-grid icon"></i>
     <span>Categories</span>
     </Link>
     
    </nav>
    </>



  );
};

export default Navbar;
