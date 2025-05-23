import { useRef, useEffect, useState } from 'react';
import { register } from 'swiper/element/bundle';
import ProductCard from './ProductCard';
import React from 'react';
import baseURL from '../../axiosConfig';
import { Link } from 'react-router-dom';


const CategorySlide = ({category}) => {
    const swiperRef = useRef(null);


  useEffect(() => {

    // Register Swiper web component
    register();

    // Object with parameters
    const params = {
        pagination:{
            clickable: true,
            dynamicBullets: true,
      dynamicMainBullets: 1,
      slidesPerView:1,
        slidesPerGroupSkip:1,
          },
      keyboard: true,
      
      grid: {
        rows: 2,
        fill: 'row',
      },
      breakpoints: {
        900: {
          slidesPerView: 8,
          slidesPerGroup: 8,
          
          
        },
        600: {
          slidesPerView: 5,
          spaceBetween: 2,
          slidesPerGroup: 5,
        },
        300: {
          slidesPerView: 4,
          spaceBetween: 2,
          slidesPerGroup: 4,
        },
      },
      injectStyles: [
        `.slide{
            padding-bottom : 2rem;  
        }
        .swiper-pagination-bullet.swiper-pagination-bullet-active {
            width: 18px;
            border-color: #ccc;
            background: #ccc;
        }
        .swiper-pagination-bullet {
            display: inline-block;
            width: 8px;
            height: 8px;
            margin: 5px 6px;
            border: 0.1rem solid #d7d7d7;
            background: transparent;
            transition: all .3s ease;
            border-radius: 30px;
            opacity: 1;
            cursor: pointer;
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
      

        {category.map((item) => (
        <swiper-slide key={item._id} class='mb-3 d-flex justify-content-center align-items-center'>
                 <div className="cat-wrapper d-flex align-items-center flex-column" key={item._id}>
  <Link to={`/categories/${item._id}`} className="cat-container" style={{backgroundColor: `rgba(${item.color}, 0.09)`}}>
    <img src={`https://cdn.alminapharmacy.com/cdn/categories/${item.image}`} alt="category image" loading="lazy" />
  </Link>
  <span className='text-small text-center pt-1'>
    {item.name}
  </span>
</div>
            
        </swiper-slide>
        ))} 
      
    </swiper-container>
  )
}




export default CategorySlide
