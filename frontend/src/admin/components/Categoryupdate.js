import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';


export default function Categoryupdate() {
    const [category, setCategory] = useState({});
    const [message, setMessage] = useState('');
const navigate = useNavigate();
const {id} = useParams();
    useEffect(() => {
        console.log(id);
        axios.get(`http://192.168.70.104:4000/api/category/${id}`)
          .then((response) => {
            console.log(response.data);
            setCategory(response.data);
          })
          .catch((error) => console.log(error));
      }, [id]);




      const onSubmit = e =>{
        e.preventDefault();
        
    
        axios.put(`http://192.168.70.104:4000/api/category/${id}`, category)
        .then(response => {
          console.log(response.data );
          setMessage('category updated successfully');
        })
        .catch(error => {
          console.log(error);
          setMessage('Error: Category was not updated');
        });
navigate('/admin/categories')
      }
        

  return (
    <div className="container">
         <form  className="form mt-5" onSubmit={onSubmit}>
  <div className="form-holder">
<input type="text" className="form-control w-50" id='categoryUpload' placeholder="category" value={category.name || ''} onChange={e => setCategory({...category, name: e.target.value})}/>
<div className="form-group">
              <button className='btn btn-primary mt-2' type='submit'>Upload</button>
            </div>
</div>
  </form>
  <span>{message}</span>
    </div>
  )
}
