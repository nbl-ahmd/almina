import React from 'react';
import SwiperCore, { Navigation, Pagination, Autoplay } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

SwiperCore.use([Navigation, Pagination, Autoplay]);

const BannerCard = ({ banners }) => {
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
                 <img className=' slide-img' src={`http://localhost:4000/api/banners/images/${banner.image}`} alt={banner.name} />
        </SwiperSlide>
      ))}
      <div className="swiper-pagination"></div>
    </Swiper>
  );
};

export default BannerCard;
