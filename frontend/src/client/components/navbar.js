import React, { useContext, useState } from 'react';
// @ts-ignore
import logo from '../assets/logo.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../../context/cartcontext';
import axios from 'axios';

const Navbar = () => {
    const { cartItems} = useContext(CartContext);
    const [searchInput, setSearchInput] = useState('');
    const navigate = useNavigate();
    const location = useLocation();


    const performSearch = (event) => {
        setSearchInput(event.target.value);
      };
    
      const handleSearch = (event) => {
        event.preventDefault();
    
        if (searchInput.trim() === '') {
          navigate('/products'); // Redirect to the products page
        } else {
          navigate(`/search?q=${encodeURIComponent(searchInput)}`);
        }
      };
    
      const clearSearchInput = () => {
        setSearchInput('');
        navigate('/search'); // Redirect to the search page without any query parameter
      };
      

      
    return (
        <nav>
            <header className="p-3 pt-4">
            <div className="container">
                <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-around justify-content-between">
                    <a href="/" className="d-flex align-items-center mb-2 mb-lg-0 link-body-emphasis text-decoration-none ">
                       <img src={logo} alt="" width ="120px"/>
                    </a>

                   
                    <Link to='/cart'>
                    <div className='order-lg-2 icon-wrapper'>
                   
                    {cartItems.length > 0 && (
      <span _ngcontent-ytt-c67="" className="navbar-tool-label">{cartItems.length}</span>
    )}

                    <i className="bi bi-bag"></i>
                    </div>
                    </Link>




                    <form className="col-12 col-lg-6 mb-lg-0 me-lg-3 mt-3 mt-lg-0"  role="search" onSubmit={handleSearch}>
                       <div className="input-group">
                       <input
                         type="search"
                         className="form-control searchbar" placeholder="Search..."
                         aria-label="Search"
                        value={searchInput}
                        onChange={performSearch} 
                        />

{searchInput && (
                <button type="button" className=" btn clear-button" onClick={clearSearchInput}>
                  <i className="bi bi-x"></i>
                </button>
              )}
                       </div>
                            
                       
                   
                    </form>

                   

                    
                </div>
                



                
            </div>
        </header>

        <nav className="container mt-2 d-flex justify-content-center justify-content-lg-start">
        <ul className="nav  px-lg-0 justify-content-around mb-md-0 gap-2 ms-md-5 flex-grow-1 flex-md-grow-0 nav-ul">
          <li>
            <Link to="/" className={location.pathname === '/' ? 'active px-2' : 'px-2'}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/products" className={location.pathname === '/products' ? 'active px-2' : 'px-2'}>
              Products
            </Link>
          </li>
          <li>
            <Link to="/categories" className={location.pathname === '/categories' ? 'active px-2' : 'px-2'}>
              Categories
            </Link>
          </li>
          {/* <li>
            <Link to="/about" className={location.pathname === '/about' ? 'active px-2' : 'px-2'}>
              About us
            </Link>
          </li> */}
        </ul>
        </nav>
        </nav>
    )
}


export default Navbar