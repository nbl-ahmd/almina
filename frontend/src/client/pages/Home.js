 import React, { useEffect, useState } from 'react'
 import { Link } from 'react-router-dom'
 
 import BannerCard from '../components/BannerCard'
 import axios from 'axios'
 import ProductCard from '../components/ProductCard'
import baseURL from '../../axiosConfig'
import Productskeleton from '../components/Productskeleton'
import Deals from '../components/Deals'
import Footer from '../components/footer'
import CategorySlide from '../components/CategorySlide'
import BackToTopButton from '../components/BackToTopButton'

 const Home = () => {
   const [banners, setBanners] = useState([]);
   const [product, setProduct] = useState([]);
   const [category, setCategory] = useState([]);
  //  const [cartItems, setCartItems] = useState(() => {
  //   // Retrieve cart items from local storage on initial render
  //   const storedCartItems = localStorage.getItem('cartItems');
  //   return storedCartItems ? JSON.parse(storedCartItems) : [];
  // });
  // Fetch banners on component mount
  useEffect(() => {
    axios
      .get(`${baseURL}/api/banners`)
      .then((response) => {
        console.log(response.data);
        setBanners(response.data);
      })
      .catch((error) => console.log(error));



  }, []);
   // Fetch products on component mount
   const access_token = 'EABlRaKb3ADcBO2eZCpZBKs9ZBhdhWGNzqqZAZAkK8XYwpWcZBAI4ylOpCp96x5J8JPgkI4j4gM0LQIRU5uLFJ8n0BRdkI0r11gJRPqxIs9TuEBbROhG2R4j5iUP7tmKZAqRZBP5lx2d6MxwDhvLPPrCEg5Nmj1VmE1MpzXChjigGZAxjyg3V82jM4cfGUfseX9TK3FgZDZD';

   const payload ={
    "data": [
        {
            "event_name": "ViewContent",
            "event_time": 1699815303,
            "action_source": "website",
            
        }
    ]
};

   useEffect(() => {
    axios.post(`https://graph.facebook.com/v12.0/YOUR_PIXEL_ID/events?access_token=${access_token}`, payload)
    .then(response => {
      console.log(response.data);
    })
    .catch(error => {
      console.error(error);
    });
   }, []);
   useEffect(() => {
    const filter = { featured : true, disabled: false, };
    const filterString = JSON.stringify(filter);

     axios
     .get(`${baseURL}/api/products`, {
      params: {
        filter: filterString,
        limit: 10,
        disabledCat: false,
        
      },
    })
    .then((response) => {
         console.log(response.data);
         setProduct(response.data);
       })
       .catch((error) => console.log(error));
   }, []);

   useEffect(() => {
    try{
      const filter = { "disabled": false };
      const filterString = JSON.stringify(filter);
      axios
      .get(`${baseURL}/api/category?filter=${encodeURIComponent(filterString)}`)
      .then((response) => {
        setCategory(response.data);
        console.log(response.data);
      })
     }
     catch (error) {
      console.error('Error fetching products by category:', error);
    }
   }, []);
  
   return (
     <main>
      
       <div className="pt-3 pt-md-5 pb-4 hero-wrapper">
         <div className="container">
           <div className="row d-flex align align-items-center">
             <div className="mt-1 mt-xxl-0 col-xxl-3 col-12 d-lg-flex d-xl-block gap-3 gap-xl-0 order-1 order-xxl-0">
               <div className="table-responsive banner-sm-container">
               <div className="d-flex flex-xxl-column">
                
               
                
               <div className="d-flex align-items-center rounded-3 pt-2 ps-2 mb-0 me-2 me-xl-0">
               <div className=" banner-small flex-xxl-fill overflow-wrap
               d-flex align-items-center bg-faded-success rounded-3 pt-2    me-xl-0 pb-0 pb-md-0 " >
                  <img src={require('../assets/b1.png')} height="120" alt="Banner" />
                  <div className="py-1 px-2 py-md-0 py-lg-0 py-xxl-0">
                    <h6 className="mb-2">
                      <span className="fw-100">Cosmetics</span>
                      <br />Body
                      <span className="fw-100"> and</span>
                      <br />
                      Bath
                      </h6>
                      <Link to='/categories/64ee2f4972cf379c2709eb66' className="text-pg fw-300">
                        <span>
                        Shop now
                        </span>
                        <i className="bi bi-chevron-right text-sm fs-6 ms-1"></i>
                      </Link>
                      </div>
                      </div>
                </div>


               <div className="d-flex align-items-center rounded-3 pt-2 ps-2 mb-0 me-2 me-xl-0">
               <div className=" banner-small flex-xxl-fill overflow-wrap
               d-flex align-items-center bg-faded-info rounded-3 pt-2    me-xl-0 pb-0 pb-md-0 " >
                  <img src={require('../assets/b2.png')} height="120" alt="Banner" />
                  <div className="py-1 px-2 py-md-0 py-lg-0 py-xxl-0">
                    <h6 className="mb-2">
                      <span className="fw-100">Supplements</span>
                      <br />Vitamins
                      <span className="fw-100"> and</span>
                      <br />
                      Suplements
                      </h6>
                      <Link to='/categories/64f1bb39b104acd36d01c959' className="text-pb fw-300">
                        <span>
                        Shop now
                        </span>
                        <i className="bi bi-chevron-right text-sm fs-6 ms-1"></i>
                      </Link>
                      </div>
                      </div>
                </div>


               <div className="d-flex align-items-center rounded-3 pt-2 ps-2 mb-0 me-2 me-xl-0">
               <div className=" banner-small flex-xxl-fill overflow-wrap
               d-flex align-items-center bg-faded-warning rounded-3 pt-2    me-xl-0 pb-0 pb-md-0 " >
                  <img src={require('../assets/b3.png')} height="120" alt="Banner" />
                  <div className="py-1 px-2 py-md-0 py-lg-0 py-xxl-0">
                    <h6 className="mb-2">
                      <span className="fw-100">Monitors</span>
                      <br />Blood
                      <span className="fw-100"> and</span>
                      <br />
                      Pressure
                      </h6>
                      <Link to='/categories/65082cbe10cd27c3db3e88cb' className="text-or fw-300">
                        <span>
                        Shop now
                        </span>
                        <i className="bi bi-chevron-right text-sm fs-6 ms-1"></i>
                      </Link>
                      </div>
                      </div>
                </div>
              

                
              </div>
               </div>
             </div>
             <div className="col-xxl-9 order-0 order-xxl-1">
               <div className="hero-slider">

               {banners.length===0 ? (<div className="skeleton-banner skeleton"></div>):(<BannerCard key={banners._id} banners={banners} />)}
                 
               </div>
             </div>
           </div>
         </div>
       </div>

<section >
<div className="container pt-4 mt-lg-5">
<div className="title pt-1 pb-2 ">
           <h5>Top Deals</h5>
           <Link to='/offers'>View All</Link>
         </div>

         <div className="deals">
          <Deals />
         </div>

</div>

</section>
 {/* category section */}

<section className='container pt-2 pt-lg-5'>
<div className="title pt-4 pb-2 ">
           <h5>Categories</h5>
           <Link to='/categories'>View All</Link>
         </div>

         < CategorySlide category={category} />
</section>

 {/* sales section */}
 <section className="container pt-2 pt-lg-5">
 <div className="title pt-4 pb-4 mb-3 ">
           <h5>Featured Products</h5>
           <Link to='/products'>View All</Link>
         </div>
 </section>

       <div className="container mb-5">
         <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 mt-3 px-2">

      {product.length === 0 && Array.from({ length: 10 }).map((_, index) => (
        <Productskeleton key={index} />
      ))}
    

           {product.map(product => (
             <ProductCard key={product._id} product={product} />
           ))}
         </div>
       </div>

       <BackToTopButton />
     </main>
   )
 }


 export default Home;


