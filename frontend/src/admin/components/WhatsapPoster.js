import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BannerList from './WhatsappPosterList';
import baseURL from '../../axiosConfig';

const WhatsapPoster = () => {

  const [banners, setBanners] = useState([]);

   useEffect(() => {
     axios.get(`${baseURL}/api/whatsapp/image`)
       .then(response => {
         console.log(response.data);
         setBanners(response.data);
       })
       .catch(error => console.log(error));
   }, []);


  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState('');

  const handleNameChange = event => setName(event.target.value);
  const handleLinkChange = event => setLink(event.target.value);
  const handleImageChange = event => setImage(event.target.files[0]);

  const handleSubmit = event => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('link', link);
    formData.append('image', image);
    axios.post(`${baseURL}/api/whatsapp/image`, formData)
      .then(response => {
        console.log(response.data);
        setMessage('Banner created successfully');
      })
      .catch(error => {
        console.log(error);
        setMessage('Error creating banner');
      });
  };

  return (
    <div className='mt-5 '>
        <div className="container">
      <form className='mt-3 d-flex' onSubmit={handleSubmit}>
       
        <div className='mb-2'>
          <label htmlFor="image">Image:</label>
          <input className='form-control w-25' type="file" id="image" onChange={handleImageChange} />
        </div>
        <button className='btn btn-p mt-2' type="submit">Create Banner</button>
      </form>
      <p>{message}</p>
  </div>
   <div className="container mb-5">
   {banners.map(banners => (
  <BannerList key={banners._id} banners={banners} />
))}

   </div>
  
    </div>
  );
};

export default WhatsapPoster;
