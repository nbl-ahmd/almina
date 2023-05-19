import React from 'react';
// @ts-ignore
import logo from '../assets/logo.png';
import { Link } from 'react-router-dom';

export default function navbar() {
    return (
        <nav>
            <header className="p-3 border-bottom pt-4">
            <div className="container">
                <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-around justify-content-between">
                    <a href="/" className="d-flex align-items-center mb-2 mb-lg-0 link-body-emphasis text-decoration-none ">
                       <img src={logo} alt="" width ="120px"/>
                    </a>

                   
                    <div className='order-lg-2'>
                   
                    <i className="fa-solid fa-bag-shopping"></i>
                    </div>

                    <form className="col-12 col-lg-8 mb-3 mb-lg-0 me-lg-3 mt-3"  role="search">
                        <input type="search" className="form-control searchbar" placeholder="Search..." aria-label="Search" />
                    </form>

                   

                    
                </div>
                
            </div>
        </header>
        <nav className="container mt-2 d-flex justify-content-center justify-content-lg-start">
        <ul className="nav  justify-content-center mb-md-0 gap-2 ms-md-5">
                        <li><Link to='/' className=" px-2 ">Home</Link></li>
                        <li><Link to='products' className=" px-2 ">Products</Link></li>
                        <li><Link to="categories" className=" px-2 ">Categories</Link></li>
                        <li><Link to="about" className=" px-2 ">About us</Link></li>
                    </ul>
        </nav>
        </nav>
    )
}
