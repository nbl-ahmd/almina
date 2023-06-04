import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Categorylist from './Categorylist';
import baseURL from '../../axiosConfig';

const CategoryUpload = () => {
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [message, setMessage] = useState('');
  const onNameChange = e => setName(e.target.value);
  const onImageChange = e => {
    const file = e.target.files[0];
    setImage(file);
  };
  

  const [category, setCategory] = useState([]);

  useEffect(() => {
    axios.get(`${baseURL}/api/category`)
      .then(response => {
        console.log(response.data);
        setCategory(response.data);
      })
      .catch(error => console.log(error));
  }, []);



  
  const onSubmit = e => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', image);
  
    axios.post(`${baseURL}/api/category`, formData)
      .then(response => {
        console.log(response.data);
        setMessage('Category created successfully');
      })
      .catch(error => {
        console.log(error);
        setMessage('Error: Category was not created');
      });
  };
  


  return (
    <>
      <div className="container">
        <form onSubmit={onSubmit} className="form mt-5" encType="multipart/form-data">
          <div className="form-holder">
            <input type="text" className="form-control w-50" id='categoryUpload' placeholder="category" value={name} onChange={onNameChange} />

            <input type="file" className="form-control w-50" id='categoryUpload' placeholder="category" onChange={onImageChange} />
            <div className="form-group">
              <button className='btn btn-primary mt-2' type='submit'>Upload</button>
            </div>
          </div>
        </form>
        <p>{message}</p>
      </div>
      <div className="container mt-4">
        <table className="table">
          {category.map(category => (
            <Categorylist key={category._id} category={category} />
          ))}
        </table>

      </div>
    </>
  );
}

export default CategoryUpload;