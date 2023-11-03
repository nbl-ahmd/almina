import React, { useEffect, useState } from 'react';
import axios from 'axios'
import { Link } from 'react-router-dom'
import baseURL from '../../axiosConfig';
import Breadcrumbs from '../components/Breadcrumbs';
import BackToTopButton from '../components/BackToTopButton';

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
      console.log(response.data);
    })
   }
   catch (error) {
    console.error('Error fetching products by category:', error);
  }
  }, []);
  return (
<>
<section className='container'>
<Breadcrumbs />
<div className="pt-2">
<div className="title pb-2 px-4">
           <h5>Categories</h5>
           
         </div>

         <div className="container">
<div className="row justify-content-between">
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