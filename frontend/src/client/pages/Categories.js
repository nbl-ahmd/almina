import React, { useEffect, useState } from 'react';
import axios from 'axios'
import { Link } from 'react-router-dom'
import baseURL from '../../axiosConfig';
import Breadcrumbs from '../components/Breadcrumbs';
import BackToTopButton from '../components/BackToTopButton';
import Skeleton from '@mui/material/Skeleton';
import { CustomHelmet } from '../components/CustomHelmet';


const Categories = () => {


  const [category, setCategory] = useState([]);

  useEffect(() => {
   try{
    const filter = { "disabled": false };
    const filterString = JSON.stringify(filter);
    axios
    .get(`${baseURL}/api/category?filter=${encodeURIComponent(filterString)}`)
    .then((response) => {
      setCategory(response.data);
     
    })
   }
   catch (error) {
    console.error('Error fetching products by category:', error);
  }
  }, []);
  return (
<>
<CustomHelmet 
    title ={'Categories'}
    description = {"Discover a curated selection of healthcare essentials at Al Mina Pharmacy, Ras Al Khaimah. Our category page showcases a wide range of products, from vitamin supplements and skincare to trusted brands like Cipla, Avalon, and more. Explore unbeatable deals on Advil 12-hour extended release tablets, Betadine products, and Baneocin ointment. Whether you're in need of Avalon Diaper Cream or seeking pharmaceutical advice, our pharmacy near you in Ras Al Khaimah has you covered. Explore the best medical store near you and find exclusive offers on Vitamin C serums, Alka Cran, and Cetaphil. Your health and well-being are our top priorities, making Al Mina Pharmacy the preferred destination in Ras Al Khaimah for all your healthcare needs."}
    url = {'https://www.alminapharmacy.com/offers'}
    image = {''}
    />
<section className='container'>
<Breadcrumbs />
<div className="pt-2">
<div className="title pb-2 px-4">
           <h5>Categories</h5>
           
         </div>

         <div className="container">
<div className="row justify-content-between">

{category.length === 0 &&
<>
      {category.length === 0 && Array.from({ length: 18 }).map((_, index) => (
      <div className="col-4 col-md-3 col-lg-2 d-flex justify-content-center mb-lg-5">
      <Skeleton variant="rounded" width={110} height={110} />
      </div>
    ))}
    </>}
{category.map(category =>(
 <div className="col-4 col-md-3 col-lg-2 d-flex justify-content-center mb-lg-5">
   <div className="cat-wrapper pe-3 d-flex align-items-center flex-column mb-3" key={category._id}>
  <Link to={`/categories/${category._id}`} className="cat-container" style={{backgroundColor: `rgba(${category.color}, 0.09)`}}>
    <img src={`${baseURL}/api/category/images/${category.image}`} alt="" />
  </Link>
  <span className='text-sm text-center mt-1'>
    {category.name}
  </span>
</div>
 </div>
))}
</div>
         </div>
</div>
</section>
<BackToTopButton />
</>
  )
}


export default Categories;