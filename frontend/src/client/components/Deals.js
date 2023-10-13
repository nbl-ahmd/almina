import { useRef, useEffect, useState } from 'react';
import { register } from 'swiper/element/bundle';
import ProductCard from './ProductCard';
import React from 'react';
import DealProductCard from './DealProductCard';
import axios from 'axios';
import baseURL from '../../axiosConfig';


 const Deals = () => {
    const [deals, setDeals] = useState([]);
    const swiperRef = useRef(null);

    useEffect( () =>{
        const filter = { sale : true, disabled: false, };
    const filterString = JSON.stringify(filter);

     axios
     .get(`${baseURL}/api/products`, {
      params: {
        filter: filterString,
        limit: 10,
        
      },
    })
    .then((response) => {
         console.log(response.data);
         setDeals(response.data);
       })
       .catch((error) => console.log(error));
   }, []);

  useEffect(() => {

    // Register Swiper web component
    register();

    // Object with parameters
    const params = {
      navigation: true,
      keyboard: true,
      breakpoints: {
        960: {
          slidesPerView: 4,
          spaceBetween: 8
        },
        720: {
          slidesPerView: 3,
          spaceBetween: 6
        },
        300: {
          slidesPerView: 2,
          spaceBetween: 4
        },
      },
      injectStyles: [
        `.slide{
            padding-bottom : 2rem;  
        }
          .swiper-button-next,
          .swiper-button-prev {
           background-color: rgb(10, 88, 202, 0.3) !important;
           border-radius: 100%;
           width: 30px;
           height: 30px;
           display: flex;
           justify-content : center;
           align-items: center

          }

          .swiper-button-next::after,
          .swiper-button-prev::after{
            font-size: 1rem;
          }
          .swiper-button-next{
            right: auto;
            left: 70px;
            bottom: 0px ;
            top: auto;
          }
          .swiper-button-prev{
            right: auto;
            left: 20px;
            bottom: 0px ;
            top: auto;
          }
          
      `,
        ],
    };

    // Assign it to swiper element
    Object.assign(swiperRef.current, params);

    // initialize swiper
    swiperRef.current.initialize();
  }, []);


  return (
    <swiper-container class = "slide" init="false" ref={swiperRef}
    >
     {deals.map((product) => (
        <swiper-slide key={deals._id}>
                 
             <ProductCard product={product} />
        </swiper-slide>
        ))}
    </swiper-container>
  );
};
export default Deals;
