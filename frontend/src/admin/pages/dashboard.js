import React, { useEffect, useRef, useState } from 'react';
import '../styles/dashboard.css'
import { DashConsumer } from '../../App';
import Product from '../components/product';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthentication } from '../login/auth';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import 'remixicon/fonts/remixicon.css'
import BackToTopButton from '../../client/components/BackToTopButton';
import { Alert, Snackbar, Switch } from '@mui/material';
import axios from 'axios';
import baseURL from '../../axiosConfig';

 

export default function Dashboard() {
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [dropdown, setDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { logout } = useAuthentication();
    const [searchInput, setSearchInput] = useState('');
    const [message, setMessage] = useState('');
    const [openSnackBar, setOpenSnackBar] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState(
      'Notification' in window ? Notification.permission : 'denied'
    );
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

  const publicKey = 'BPJRLHqL62nj3j6L8lAsRnjdRKNaLkRxrpFQwmEgDbqMbYDZeRR4vyj9X-tIGVzHkt4pbgFbgIOd_Lma6p4i3Bk';



  useEffect(() => {
    navigator.serviceWorker.ready
      .then(function (registration) {
        if (!registration.pushManager) {
          console.error('PushManager is not available.');
          return;
        }

        registration.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey,
          })
          .then(function (subscription) {
            sendSubscriptionToServer(subscription);
          })
          .catch(function (error) {
            console.error('Push subscription failed:', error);
          });
      })
      .catch(function (error) {
        console.error('Service Worker registration failed:', error);
      });
  }, []);


 function sendSubscriptionToServer(subscription) {
    // Make an HTTP POST request to your server to save the subscription
    axios
      .post(`${baseURL}/api/orders/subscribe`, { subscription })
      .then((response) => {
        if (response.status === 200) {
          // Subscription saved successfully
        } else {
          throw new Error('Failed to save subscription on the server.');
        }
      })
      .catch((error) => {
        console.error('Error saving subscription on the server:', error);
      });
  }

  


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

      useEffect(() =>{
        if (!("Notification" in window)) {
          console.log("Browser does not support desktop notification");
          setMessage('Browser does not support desktop notification');
          setNotificationPermission('denied');
        }
      },[notificationPermission] );
    

      useEffect(() =>{
        if ("Notification" in window) {
          Notification.requestPermission().then((permission) => {
            setNotificationPermission(permission);
console.log(permission);
          {permission === 'granted' ? setMessage('notification enabled'): setMessage('notification blocked');}
          });
          console.log("Notifications are supported");
        } else {
          setNotificationPermission('denied');
          setMessage('Browser does not support desktop notification');
        }
      },[] );

      
    const toggleSidebar = () => {
        setSidebarVisible(!sidebarVisible);
    };

    


    const handleRequestNotificationPermission = () => {
      if (notificationPermission === 'granted') {
        // If notifications were previously granted and the user wants to disable them, revoke permission
        setMessage('notification disabled');
        setNotificationPermission('denied');
        console.log("Notification User Permission Granted."); 
      
      } else{

        if ("Notification" in window) {
          Notification.requestPermission().then((permission) => {
            setNotificationPermission(permission);
console.log(permission);
          {permission === 'granted' ? setMessage('notification enabled'): setMessage('notification blocked');}
          });
          console.log("Notifications are supported");
        } else {
          setNotificationPermission('denied');
          setMessage('Browser does not support desktop notification');
        }
        
        
      }
      setOpenSnackBar(true);
      console.log(notificationPermission);
      
      
    };


    return (
        <div className='admin admin-bg'>
            {message &&  <Snackbar
        open={openSnackBar}
        autoHideDuration={3000}
        onClose={(event, reason)=>{
          if (reason === 'clickaway') {
            return;
          }
          setOpenSnackBar(false);
        }}
        message={message}
      />}
            <div className="d-flex flex-column flex-lg-row h-lg-full  dash-container">

                <nav className={`navbar navbar-expand-lg ${sidebarVisible ? 'navbar-expand' : 'collapse'}  py-0 bg-white navbar-vertical navbar-light sidebar-wrapper overflow-hidden sidebar-list justify-content-lg-start`} id='sidebarCollapse' >
                   
                       
                        <div className="navbar-brand d-flex align-items-center">
                                    <img className="nav-logo sidebar-logo" src={require('../../client/assets/logo.png')} alt="" />
                                </div>
                           <div className="sidebar-container">
                           <ul className="navbar-nav py-1 d-flex">

                                
<li className="nav-item my-1" onClick={() => toggleSidebar()}>
    <Link to="/admin" className={location.pathname === '/admin' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-menu-4-fill me-3"></i>
        Dashboard
    </Link>

</li>


    
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/dispatched' className={location.pathname === '/admin/dispatched' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-shopping-cart-line me-3"></i>
       Dispatched Orders
    </Link>

</li>
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/cancelled' className={location.pathname === '/admin/cancelled' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-shopping-cart-line me-3"></i>
       Cancelled Orders
    </Link>

</li>
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/productlist' className={location.pathname === '/admin/productlist' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-medicine-bottle-line me-3"></i>
        products
    </Link>

</li>
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/outofstock' className={location.pathname === '/admin/outofstock' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-box-1-line me-3"></i>
        Out of stock
    </Link>

</li>
   
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admin/disabled' className={location.pathname === '/admin/disabled' ? 'nav-link active ' : 'nav-link'}>
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

                           <div className="nav-right ms-2">
                          
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
              <Switch
              checked={notificationPermission === 'granted'}
              onChange={handleRequestNotificationPermission}
              color="primary"
            />
          
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
            <BackToTopButton />
        </div>
    )
}
