import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Categorylist from './Categorylist';

const CategoryUpload = () => {
const [name, setName] = useState('');
const [message, setMessage] = useState('');
const onNameChange = e => setName(e.target.value);

const [category, setCategory] = useState([]);

useEffect(() => {
  axios.get('http://192.168.70.104:4000/api/category')
    .then(response => {
      console.log(response.data);
      setCategory(response.data);
    })
    .catch(error => console.log(error));
}, []);


const onSubmit = e =>{
    e.preventDefault();
    const formData = {
        name
    };

    axios.post('http://192.168.70.104:4000/api/category', formData)
    .then(response => {
      console.log(response.data);
      setMessage('category created successfully');
    })
    .catch(error => {
      console.log(error);
      setMessage('Error: categorry was not created');
    });
  }
    

  return(
   <>
    <div className="container">
    <form onSubmit={onSubmit} className="form mt-5">
  <div className="form-holder">
<input type="text" className="form-control w-50" id='categoryUpload' placeholder="category" value={name} onChange={onNameChange}/>
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