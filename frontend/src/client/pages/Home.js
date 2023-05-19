import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {Swiper, SwiperSlide} from 'swiper/react'
import BannerCard from '../components/BannerCard'
import axios from 'axios'
import ProductCard from '../components/ProductCard'

const Home = () => {
   const [banners, setBanners] = useState([]);
   const [product, setProduct] = useState([]);

   useEffect(() => {
     axios.get('http://192.168.70.104:4000/api/banners')
       .then(response => {
         console.log(response.data);
         setBanners(response.data);
       })
       .catch(error => console.log(error));
   }, []);


   useEffect(() => {
    axios.get('http://192.168.70.104:4000/api/products')
    .then(response => {
      console.log(response.data);
      setProduct(response.data);
        })
        .catch(error => console.log(error));
   },
   []);
  return (
    <main>
      <div className="mt-3 pt-4 hero-wrapper">
      <div className="container">
        <div className="row">
          <div className="col-xxl-3 col-xl-3 col-12 d-lg-flex d-xl-block gap-3 gap-xl-0 order-1 order-xl-0">
<div className="row overflow-y-scroll flex-row flex-xl-column g-3 g-xl-0  gap-md-0 gap-xl-3 d-flex mt-3 mt-xl-0 justify-content-start justify-content-md-center flex-nowrap flex-md-wrap banner-sm-container">
  <div className="col-9 col-lg-4 col-xl-12 col-md-6 banner-sm d-flex d-xl-block">
    <div className="d-flex banner-sm1 p-2 align-items-center">
      <div className="banner-img d-flex justify-content-center col-6">
        <img src={require('../assets/banner-sm01.png')} alt="" />
      </div>
<div className="card-text col-6 ps-1">
  <h6 className='mb-2'>
    Blood Pressure Monitor
  </h6>
  <Link to='/' className="fw-700">Shop Now</Link>
  <i className="fa-solid fa-angle-right ms-1 text-pb"></i>
</div>
    </div>
  </div>
  <div className="col-9 col-lg-4 col-xl-12 col-md-6 banner-sm d-flex d-xl-block">
    <div className="d-flex banner-sm1 p-2 align-items-center">
      <div className="banner-img d-flex justify-content-center col-6">
        <img src={require('../assets/banner-sm03.png')} alt="" />
      </div>
<div className="card-text col-6 ps-1">
  <h6 className='mb-2'>
    Blood Pressure Monitor
  </h6>
  <Link to='/' className="fw-700">Shop Now</Link>
  <i className="fa-solid fa-angle-right ms-1 text-pb"></i>
</div>
    </div>
  </div>
  <div className="col-9 col-lg-4 col-xl-12 col-md-6 banner-sm d-flex d-xl-block">
    <div className="d-flex banner-sm1 p-2 align-items-center">
      <div className="banner-img d-flex justify-content-center col-6">
        <img src={require('../assets/banner-sm03.png')} alt="" />
      </div>
<div className="card-text col-6 ps-1">
  <h6 className='mb-2'>
    Pyridoxine Vitamins & Supplements
  </h6>
  <Link to='/' className="fw-700">Shop Now</Link>
  <i className="fa-solid fa-angle-right ms-1 text-pb"></i>
</div>
    </div>
  </div>
</div>
          </div>
          <div className="col-xxl-9 col-xl-9 order-0 order-xl-1">
            <div className="hero-slider">
            <BannerCard banners={banners} />
            </div>
          </div>
        </div>
      </div>
      </div>


<div className="container mb-5">
<div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3">
{product.map(product => (
  <ProductCard key={product.id} product={product} />
))}
</div>
</div>
<footer className=' bg-dark text-center mb-0 p-5'>
<p className=' text-light'>Almina Pharmacy</p>
</footer>
    </main>
  )
}


export default Home;