import React, { useState } from 'react';
import axios from 'axios';

const CategoryUpload = () => {
const [name, setName] = useState('');
const [message, setMessage] = useState('');
const onNameChange = e => setName(e.target.value);



const onSubmit = e =>{
    e.preventDefault();
    const formData = {
        name
    };

    axios.post('http://localhost:4000/api/category', formData)
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
    <form onSubmit={onSubmit} className="form">
  <div className="form-holder">
<input type="text" className="form-control" id='categoryUpload' placeholder="category" value={name} onChange={onNameChange}/>
<div className="form-group">
              <button className='btn btn-primary' type='submit'>Upload</button>
            </div>
</div>
  </form>
              <p>{message}</p>
   </>
  );
}

export default CategoryUpload;