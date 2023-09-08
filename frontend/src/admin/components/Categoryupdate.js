import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import baseURL from '../../axiosConfig';

export default function Categoryupdate() {
  const [category, setCategory] = useState({
    name: '', // Initial empty name
    image: null, // Initial null image
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    axios
      .get(`${baseURL}/api/category/${id}`)
      .then((response) => {
        console.log(response.data);
        setCategory(response.data);
      })
      .catch((error) => console.log(error));
  }, [id]);

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
      .put(`${baseURL}/api/category/${id}`, formData, {
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
    <div className="container">
      <form className="form mt-5" onSubmit={onSubmit}>
        <div className="form-holder">
          <input
            type="text"
            className="form-control w-50"
            id="categoryName"
            placeholder="Category"
            value={category.name}
            onChange={(e) => setCategory({ ...category, name: e.target.value })}
          />
          <input
            type="file"
            className="form-control w-50"
            id="categoryImage"
            placeholder="Category Image"
            onChange={onImageChange}
          />
          {/* Display the current category image if it exists */}
          {category.image && (
            <img
              src={`${baseURL}/api/category/images/${category.image}`}
              alt="Current Category Image"
              className="mt-2"
              style={{ maxWidth: '100px' }}
            />
          )}
          <div className="form-group">
            <button className="btn btn-primary mt-2" type="submit">
              Upload
            </button>
          </div>
        </div>
      </form>
      <span>{message}</span>
    </div>
  );
}
