import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import baseURL from '../../axiosConfig';
import { Alert, Button, DialogActions, DialogContent } from '@mui/material';

export default function Categoryupdate({cat}) {
  const [category, setCategory] = useState(cat);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();



  const onImageChange = (e) => {
    const file = e.target.files[0];
    setCategory({ ...category, image: file }); // Update category with the new image
  };

  const onSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', category.name);
    formData.append('image', category.image);

    axios
      .put(`${baseURL}/api/category/${category._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Set the content type to multipart/form-data
        },
      })
      .then((response) => {
        console.log(response.data);
        setMessage('Category updated successfully');
      })
      .catch((error) => {
        console.log(error);
        setMessage('Error: Category was not updated');
      });

    navigate('/admindash/categories');
  };

  return (


    <>
    <DialogContent>
        <div className="container">
      <form className="form mt-5" onSubmit={onSubmit}>
         {/* Display the current category image if it exists */}
         <div className="d-flex justify-content-center mb-3">
         {category.image && (
            <img
              src={`${baseURL}/api/category/images/${category.image}`}
              alt="Current Category Image"
              className="mt-2"
              style={{ maxWidth: '100px' }}
            />
          )}
         </div>

        <div className="form-holder">
          <input
            type="text"
            className="form-control mb-3"
            id="categoryName"
            placeholder="Category"
            value={category.name}
            onChange={(e) => setCategory({ ...category, name: e.target.value })}
          />
          <input
            type="file"
            className="form-control"
            id="categoryImage"
            placeholder="Category Image"
            onChange={onImageChange}
          />
         
          
        </div>
      </form>
      {message &&(
        <Alert sx={{mt:2}}>{message}</Alert>
      )}
    </div>
      </DialogContent>
      <DialogActions>
        
        <Button onClick={onSubmit} color="primary">
          Save
        </Button>
      </DialogActions></>
    
  );
}
