<div className="d-flex flex-column flex-lg-row h-lg-full  dash-container overflow-hidden">

<nav className="navbar show navbar-expand-lg py-0 bg-white navbar-vertical navbar-light  sidebar-wrapper overflow-hidden" id="sidebar">
    <div className="container-fluid sidebar-container pt-3 pt-lg-0 align-items-lg-center">
        <button className="navbar-toggler ms-n2 collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarCollapse" aria-controls="sidebarCollapse" aria-expanded="false" aria-label="Toggle navigation"><span className="navbar-toggler-icon"></span></button>

        <a className="navbar-brand d-inline-block py-lg-5 mb-lg-5 px-lg-6 me-0">
            <img className="nav-logo sidebar-logo" src={require('../../client/assets/logo.png')} alt="" />
        </a>

        <div className="navbar-collapse collapse sidebar-list justify-content-lg-start" id='sidebarCollapse'>
            <ul className="navbar-nav d-flex justify-content-lg-start bg-white">
                <li className="nav-item mt-2">
                    <Link to="/admin/" className='nav-link py-2'>
                        <i className="bi bi-columns-gap me-3"></i>
                        Dashboard
                    </Link>

                </li>
                <li className="nav-item mt-2">

                    <Link to='/admin/uploadproduct' className='nav-link py-2'>
                        <i className="bi bi-columns-gap me-3"></i>
                        products
                    </Link>

                </li>
                <li className="nav-item mt-2">

                    <Link to='/admin/banner' className='nav-link py-2'>
                        <i className="bi bi-columns-gap me-3"></i>
                        Promotion
                    </Link>

                </li>
                <li className="nav-item mt-2">

                    <Link to='/admin/categories' className='nav-link py-2'>
                        <i className="bi bi-columns-gap me-3"></i>
                        Categories
                    </Link>

                </li>

            </ul>
        </div>


    </div>
</nav>
<div className="flex-lg-1 h-100  overflow-y-auto right-section">
    <nav className="navbar navbar-light position-lg-sticky top-lg-0 d-none d-lg-block bg-white border-bottom px-0 py-3 topbar" id='topbar'>
        <div className="container-fluid ">
            <form className="form-inline ms-auto me-auto d-none d-md-flex"><div className="input-group input-group-inline shadow-none"><span className="input-group-text border-0 shadow-none ps-0 pe-3 bg-white"><i className="bi bi-search"></i> </span><input type="text" className="border-0 form-control form-control-flush" placeholder="Search" aria-label="Search" /></div></form>

        </div>

    </nav>


    <DashConsumer>
        {
            Page => {

                return Page;
            }

        }
    </DashConsumer>
</div>

</div>