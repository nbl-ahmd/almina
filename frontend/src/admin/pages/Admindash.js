import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import baseURL from '../../axiosConfig';
import { useAuthentication } from '../login/auth';
import { AdminDashConsumer } from '../../App';
import BackToTopButton from '../../client/components/BackToTopButton';

const AdminDashboard = () => {
 
  const [sidebarVisible, setSidebarVisible] = useState(false);
    const [dropdown, setDropdown] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const dropdownRef = useRef(null);
    const { logout } = useAuthentication();
    const location = useLocation();
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

      const performSearch = (event) => {
        setSearchInput(event.target.value);
      };
    
      const handleSearch = async (event) => {
        event.preventDefault();
    
        if (searchInput.trim() === '') {
          navigate('/admin'); // Redirect to the products page
        } else {
          const encodedSearchInput = encodeURIComponent(searchInput.trim());
    
    
          navigate(`search?q=${encodedSearchInput}`);
        }
      };
    
      const clearSearchInput = () => {
        setSearchInput('');
        navigate('/admin/productlist'); // Redirect to the search page without any query parameter
      };

      
    const toggleSidebar = () => {
        setSidebarVisible(!sidebarVisible);
    };

  const navigate = useNavigate();


  return (
<div className='container-fluid admin admin-bg'>
            <div className="d-flex flex-column flex-lg-row h-lg-full  dash-container">

                <nav className={`navbar navbar-expand-lg ${sidebarVisible ? 'navbar-expand' : 'collapse'}  py-0 bg-white navbar-vertical navbar-light sidebar-wrapper overflow-hidden sidebar-list justify-content-lg-start`} id='sidebarCollapse' >
                   
                       
                        <div className="navbar-brand d-flex align-items-center">
                                    <img className="nav-logo sidebar-logo" src={require('../../client/assets/logo.png')} alt="" />
                                </div>
                           <div className="sidebar-container justify-content-between">
                           <ul className="navbar-nav py-1 d-flex">

                                



    
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admindash/products' className={location.pathname === '/admindash/products' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-medicine-bottle-line me-3"></i>
        products
    </Link>

</li>
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admindash/salelist' className={location.pathname === '/admindash/salelist' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-percent-line me-3"></i>
        Sale
    </Link>

</li>
    <li className="nav-item my-1" onClick={() => toggleSidebar()}>

    <Link to='/admindash/outofstock' className={location.pathname === '/admindash/outofstock' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-box-1-line me-3"></i>
        Out Of Stock
    </Link>

</li>
<li className="nav-item my-1" onClick={() => toggleSidebar()}>
    <Link to="/admindash/categories" className={location.pathname === '/admindash/categories' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-menu-search-line me-3"></i>
        category
    </Link>

</li>
<li className="nav-item my-1" onClick={() => toggleSidebar()}>
    <Link to="/admindash/banner" className={location.pathname === '/admindash/banner' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-file-image-line me-3"></i>
        Banner
    </Link>

</li>
<li className="nav-item my-1" onClick={() => toggleSidebar()}>
    <Link to="/admindash/batch" className={location.pathname === '/admindash/batch' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-file-excel-line me-3"></i>
        Batch products
    </Link>

</li>
<li className="nav-item my-1" onClick={() =>{ toggleSidebar()}}>
    <Link to="/admindash/users" className={location.pathname === '/admindash/users' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-user-line me-3"></i>
        Users
    </Link>

</li>



</ul>

<ul className="navbar-nav py-1 d-flex mb-2">

<li className="nav-item my-1" onClick={() => toggleSidebar()}>
    <Link to="/admindash/settings" className={location.pathname === '/admindash/settings' ? 'nav-link active ' : 'nav-link'}>
    <i className="ri-settings-2-line me-3"></i>
        settings
    </Link>

</li>
</ul>

                           </div>
                     
                </nav>
                <div className="flex-lg-1   right-section ">
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
                <div className="avatar avatar-online d-flex align-items-center justify-content-center cursor-auto">
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
            <span className="align-middle">My Account</span>
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


                    <div className=" page-content">
                        <AdminDashConsumer>
                            {
                                Page => {

                                    return Page;
                                }

                            }
                        </AdminDashConsumer>
                    </div>
                </div>
            </div>
            <div className={`layout-overlay layout-menu-toggle ${sidebarVisible ? '' : 'd-none'}`} onClick={() => toggleSidebar()}></div>
            <BackToTopButton />
        </div>





    
  );
};

export default AdminDashboard;
