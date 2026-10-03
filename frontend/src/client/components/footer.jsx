import React from 'react'
import logo from '../assets/logo.png';
import { Link } from 'react-router-dom';

const Footer = () => {
  // row-cols-1 row-cols-sm-2 row-cols-md-5



  const scrollToTop = () =>{
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
  return (
    <footer className="">
    <div className="container">
     <div className="row  py-5 justify-content-between">
     <div className="col-md-6 col-lg-4 mb-4">
   

        <a href="/" className="d-flex align-items-center mb-3 link-dark text-decoration-none">
        <img src={logo} alt="" width="120px" />
        </a>
        <div className='mb-3'>
        <p className="my-3 text-muted">Your Safety is our priority</p>
                    <p className="mb-0"><a href="mailto:info@alminapharmacy.com" className="text-muted text-primary-hover">
                        <i className="las la-envelope me-2"></i>
                        info@alminapharmacy.com</a></p>
                    <p className="mb-0"><a href="tel:+971504825007" className="text-muted text-primary-hover">
                        <i className="las la-phone me-2"></i>
                        +971 50 482 5007</a></p>



        </div>

        <div className="footer-socials gap-4">
          <Link to={'https://www.instagram.com/alminapharmacy/'} className='icon'>
          <i className="fa-brands fa-instagram"></i>
          </Link>
          <Link to={'https://www.facebook.com/alminapharmacy'} className='icon'>
          <i className="fa-brands fa-facebook"></i>
          </Link>
          <Link to={'https://wa.me/+971504825007'} className='icon'>
          <i className="fa-brands fa-whatsapp"></i>
          </Link>
        </div>
      </div>
  
  
    <div className="col-md-6 col-lg-2 mb-4">
        <h6>Al Mina</h6>
        <ul className="nav flex-column">
        <li className="nav-item mb-2"><Link to={'/contact'} onClick={scrollToTop} className="nav-link p-0 text-muted">About us</Link></li>
        <li className="nav-item mb-2"><Link to={'/contact'} onClick={scrollToTop} className="nav-link p-0 text-muted">Contact us</Link></li>
        <li className="nav-item mb-2"><Link to={'/cart'} onClick={scrollToTop} className="nav-link p-0 text-muted">Cart</Link></li>
        </ul>
      </div>
  
  
      <div className="col-md-6 col-lg-2 mb-4">
        <h6>Useful Links</h6>
        <ul className="nav flex-column">
          <li className="nav-item mb-2"><Link to={'/'} onClick={scrollToTop} className="nav-link p-0 text-muted">Home</Link></li>
          <li className="nav-item mb-2"><Link to={'/offers/#'} 
          onClick={scrollToTop}
          className="nav-link p-0 text-muted">Offers</Link></li>
          <li className="nav-item mb-2"><Link to={'/categories/#'} onClick={scrollToTop} className="nav-link p-0 text-muted">Shop by category</Link></li>
          <li className="nav-item mb-2"><Link to={'/products'} onClick={scrollToTop} className="nav-link p-0 text-muted">All products</Link></li>
          
        </ul>
      </div>
  
      <div className="col-md-6 col-lg-4 mb-4">
        <h6 className='mb-3'>Stay up to date</h6>
        <div className="d-flex gap-2">
            <label htmlFor="newsletter1" className="visually-hidden">Email address</label>
            <input id="newsletter1" type="text" className="newsletter-input" placeholder="Email address" />
            <button className="btn newsletter-btn" type="button">
            <i className="fa-regular fa-envelope"></i>
            </button>
          </div>
      </div>
     </div>
    </div>
  </footer>
  )
}

export default Footer
