import React, { useEffect, useState } from 'react';
import axios from 'axios'
import { Link } from 'react-router-dom'
import baseURL from '../../axiosConfig';

const Categories = () => {


  const [category, setCategory] = useState([]);

  useEffect(() => {
    axios
      .get(`${baseURL}/api/category`)
      .then((response) => {
        setCategory(response.data);
        console.log(response.data);
      })
      .catch((error) => console.log(error));
  }, []);
  return (
    <section className='container pt-5'>
<div className="title pt-1 pb-2 ">
           <h3>Categories</h3>
           
         </div>

         <div className="container">
<div className="row justify-content-start  overflow-y-scroll ">
{category.map(category =>(
  <div className="cat-wrapper pe-3 d-flex align-items-center flex-column" key={category._id}>
  <Link to={`/categories/${category._id}`} className="cat-container" style={{backgroundColor: `rgba(${category.color}, 0.09)`}}>
    <img src={`${baseURL}/api/category/images/${category.image}`} alt="" />
  </Link>
  <span className='text-small text-center'>
    {category.name}
  </span>
</div>
))}
</div>
         </div>
</section>
  )
}


export default Categories;