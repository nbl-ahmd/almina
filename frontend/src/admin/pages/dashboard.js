import React, { useEffect, useRef, useState } from 'react';
import '../styles/dashboard.css'
import { DashConsumer } from '../../App';
import Product from '../components/product';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthentication } from '../login/auth';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import 'remixicon/fonts/remixicon.css'



export default function Dashboard() {
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [dropdown, setDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { logout } = useAuthentication();
    const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const performSearch = (event) => {
    setSearchInput(event.target.value);
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    if (searchInput.trim() === '') {
      navigate('/admin/productlist/'); // Redirect to the products page
    } else {
      const encodedSearchInput = encodeURIComponent(searchInput.trim());


      navigate(`/admin/productlist/search?q=${encodedSearchInput}`);
    }
  };

  const clearSearchInput = () => {
    setSearchInput('');
    navigate('/admin/productlist'); // Redirect to the search page without any query parameter
  };


    useEffect(() => {
        const handleClickOutside = (event) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setDropdown(false);
          }
        };
    
        document.addEventListener('mousedown', handleClickOutside);
    
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
      }, []);
      
    const toggleSidebar = () => {
        setSidebarVisible(!sidebarVisible);
    };
    return (
        <div className='admin'>
            <div className="d-flex flex-column flex-lg-row h-lg-full  dash-container">

                <nav className={`navbar navbar-expand-lg ${sidebarVisible ? 'navbar-expand' : 'collapse'}  py-0 bg-white navbar-vertical navbar-light sidebar-wrapper overflow-hidden sidebar-list justify-content-lg-start`} id='sidebarCollapse' >
                   
                       
                        <div className="navbar-brand d-flex align-items-center">
                                    <img className="nav-logo sidebar-logo" src={require('../../client/assets/logo.png')} alt="" />
                                </div>
                           <div className="sidebar-container">
                           <ul className="navbar-nav py-1 d-flex">

                                
<li className="nav-item my-1" onClick={() => toggleSidebar()}>
    <Link to="/admin/" className='nav-link py-2'>
    <i className="ri-menu-4-fill me-3"></i>
        Dashboard
    </Link>

</li>


    
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/dispatched' className='nav-link'>
    <i className="ri-shopping-cart-line me-3"></i>
       Dispatched Orders
    </Link>

</li>
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/productlist' className='nav-link'>
    <i className="ri-medicine-bottle-line me-3"></i>
        products
    </Link>

</li>
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/outofstock' className='nav-link'>
    <i className="ri-box-1-line me-3"></i>
        Out of stock
    </Link>

</li>
   
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/disabled' className='nav-link'>
    <i className="ri-close-circle-line me-3"></i>
        Disabled
    </Link>

</li>



</ul>
                           </div>
                     
                </nav>
                <div className="flex-lg-1 h-100 right-section">
                    <nav className="navbar topbar" id='topbar'>
                        <div className="w-100 d-flex justify-content-between align-items-center">

                           <div className="nav-left d-flex">
                           <div className="nav-item d-flex me-3 collapsed d-lg-none align-items-center" onClick={() => toggleSidebar()}>
                                <i className="bi bi-list"></i>
                            </div>
                            <form className="form-inline ms-auto me-auto d-md-flex w-100" role="search" onSubmit={handleSearch}>
              <div className="input-group flex-grow-1">
              <span className="input-group-text border-0"><i className="ri-search-line"></i></span>
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


                            {/* <form className="form-inline ms-auto me-auto d-md-flex">
                                <div className="input-group input-group-inline shadow-none">
                                    <span className="input-group-text border-0 shadow-none ps-0 pe-3 bg-white">
                                        <i className="bi bi-search"></i>
                                         </span><input type="text" className="border-0 form-control dash-search form-control-flush" placeholder="Search" aria-label="Search" /></div>
                             </form> */}
                           </div>

                           <div className="nav-right">
                          
        <div className="avatar avatar-online d-flex align-items-center justify-content-center" onClick={()=>{
setDropdown(!dropdown)
        }}>
          <span>{localStorage.getItem('name')?.charAt(0)}</span>

          </div>
      
    
      <ul className={`dropdown-menu dropdown-menu-end ${dropdown ? 'show' : ''}`} data-bs-popper="none" ref={dropdownRef}>
        <li>
          <a className="dropdown-item" href="#">
            <div className="d-flex">
              <div className="flex-shrink-0 me-3">
                <div className="avatar avatar-online d-flex align-items-center justify-content-center">
                {localStorage.getItem('name')?.charAt(0)}
                </div>
              </div>
              <div className="flex-grow-1">
                <span className="fw-semibold d-block">{localStorage.getItem('name')}</span>
                <small className="text-muted">{localStorage.getItem('role')}</small>
              </div>
            </div>
          </a>
        </li>
        <li>
          <div className="dropdown-divider"></div>
        </li>
        <li>
          <a className="dropdown-item" href="#">
            <i className="bx bx-user me-2"></i>
            <span className="align-middle">My Profile</span>
          </a>
        </li>
       
        <li>
          <a className="dropdown-item" href="#">
            <span className="d-flex align-items-center align-middle">
              <i className="flex-shrink-0 bx bx-credit-card me-2"></i>
              <span className="flex-grow-1 align-middle">Notifications</span>
              <span className="flex-shrink-0 badge badge-center rounded-pill bg-danger w-px-20 h-px-20">4</span>
            </span>
          </a>
        </li>
        <li>
          <div className="dropdown-divider"></div>
        </li>
        <li>
          <button className="dropdown-item" >
            <i className="bx bx-power-off me-2"></i>
            <span className="align-middle" onClick={()=> logout()}>Log Out</span>
          </button>
        </li>
      </ul>
                           </div>

                        </div>

                    </nav>


                    <div className="page-content">
                        <DashConsumer>
                            {
                                Page => {

                                    return Page;
                                }

                            }
                        </DashConsumer>
                    </div>
                </div>
            </div>
            <div className={`layout-overlay layout-menu-toggle ${sidebarVisible ? '' : 'd-none'}`} onClick={() => toggleSidebar()}></div>
        </div>
    )
}
