import React, { useState } from 'react';
import axios from 'axios';

const BannerForm = () => {
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
    axios.post('http://localhost:4000/api/banners', formData)
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
    <div>
      <h2>Create a new banner</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input type="text" id="name" value={name} onChange={handleNameChange} />
        </div>
        <div>
          <label htmlFor="link">Link:</label>
          <input type="text" id="link" value={link} onChange={handleLinkChange} />
        </div>
        <div>
          <label htmlFor="image">Image:</label>
          <input type="file" id="image" onChange={handleImageChange} />
        </div>
        <button type="submit">Create Banner</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default BannerForm;
