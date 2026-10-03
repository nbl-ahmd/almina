import React, { useEffect, useState } from 'react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import baseURL from '../../axiosConfig';

const BannerCard = ({ banners }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const img = () => {
    setImageLoaded(true);
  }
  const swiperParams = {
    modules: [Navigation, Pagination, Autoplay],
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
    },
    injectStyles: [
      `
        .swiper-button-next,
        .swiper-button-prev {
          background-color: white;
          padding: 8px 16px;
          border-radius: 100%;
          border: 2px solid black;
          color: red;
        }
        .swiper-pagination-bullet{
          width: 40px;
          height: 40px;
          background-color: red;
        }
    `,
    ],
  };

  

  return (
    <Swiper {...swiperParams}>
      {banners.map((banner) => (
        <SwiperSlide key={banner._id}>
                 
               
                <img className=' slide-img' src={`https://cdn.alminapharmacy.com/cdn/banners/${banner.image}`} alt={banner.name}
                loading="lazy"
                 onLoad={img}/>
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
