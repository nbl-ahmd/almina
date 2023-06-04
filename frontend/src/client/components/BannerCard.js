import React, { useEffect, useState } from 'react';
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import baseURL from '../../axiosConfig';

SwiperCore.use([Navigation, Pagination, Autoplay]);

const BannerCard = ({ banners }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const img = () => {
    setImageLoaded(true);
   console.log('loaded');
  }
  const swiperParams = {
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev'
    },
    pagination: {
      clickable: true
    }
  };

  

  return (
    <Swiper {...swiperParams}>
      {banners.map((banner) => (
        <SwiperSlide key={banner._id}>
                 
               
                <img className=' slide-img' src={`${baseURL}/api/banners/images/${banner.image}`} alt={banner.name} onLoad={img}/>
                {!imageLoaded && (
                  <div className="skeleton-banner skeleton"></div>
              )}
        </SwiperSlide>
      ))}
      <div className="swiper-pagination"></div>
    </Swiper>
  );
};

export default BannerCard;
