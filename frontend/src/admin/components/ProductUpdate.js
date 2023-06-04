// import axios from 'axios';
// import React, { useEffect, useState } from 'react'
// import { useNavigate, useParams } from 'react-router-dom';

// export default function ProductUpdate() {
//     const [product, setProduct] = useState([]);

//   const [name, setName] = useState(`${product.name}`);
//   console.log(product.name);
//   const [image, setImage] = useState(null);
//   const [categoryList, setCategoryList] = useState([]);
//   const [category, setCategory] = useState('');
//   const [featured, setFeatured] = useState(false);
//   const [price, setPrice] = useState('');
//   const [vat, setVat] = useState(false);
//   const [stock, setStock] = useState('');
//   const [sale, setSale] = useState(false);
//   const [message, setMessage] = useState('');
//   const [file, setFile] = useState();



    
// const navigate = useNavigate();
// const {id} = useParams();
    
// useEffect(() => {
//     axios.get('${baseURL}/api/category')
//       .then(response => {
//         setCategoryList(response.data);
//       })
//       .catch(error => {
//         console.log(error);
//       });
//   }, []);
    

//     useEffect(() => {
//         console.log(id);
//         axios.get(`${baseURL}/api/products/${id}`)
//           .then((response) => {
//             console.log(response.data);
//             setProduct(response.data);
            
//           })
//           .catch((error) => console.log(error));
//       }, [id]);




//       const onSubmit = e =>{
//         e.preventDefault();
        
    
//         axios.put(`${baseURL}/api/products/${id}`, product)
//         .then(response => {
//           console.log(response.data );
//           setMessage('product updated successfully');
//         })
//         .catch(error => {
//           console.log(error);
//           setMessage('Error: product was not updated');
//         });
// navigate('/admin/')
//       }
      

//         const onNameChange = e => setProduct({...product, name: e.target.value});
//         const onImageChange = e =>{ 
//           setFile(URL.createObjectURL(e.target.files[0]));
//           setImage(e.target.files[0])};
//         const onCategoryChange = e => setProduct({...product, category: e.target.value});
//         // const onFeaturedChange = e => setFeatured(e.target.value);
//         const onPriceChange = e => setProduct({...product, price: e.target.value});
//         // const onVatChange = e => setVat(e.target.value);
//         const onStockChange = e => setProduct({...product, stock: e.target.value});
//         const onSaleChange = (e) => setProduct({ ...product, sale: e.target.value === 'true' });
// const onFeaturedChange = (e) => setProduct({ ...product, featured: e.target.value === 'true' });
// const onVatChange = (e) => setProduct({ ...product, vat: e.target.value === 'true' });


       
      
      
//         //  const onSubmit = (e) => {
//         //    e.preventDefault();
//         //    const formData = new FormData();
//         //    formData.append('name', name);
//         //    formData.append('image', image);
//         //    formData.append('category', category);
//         //    formData.append('featured', featured);
//         //    formData.append('price', price);
//         //    formData.append('vat', vat);
//         //    formData.append('stock', stock);
//         //    formData.append('sale', sale);
//         //    axios.post('${baseURL}/api/products', formData)
//         //    .then(response => {
//         //        console.log(response.data);
//         //        setMessage('product created successfully');
//         //      })
//         //      .catch(error => {
//         //        console.log(error);
//         //        setMessage('Error: product was not created');
//         //      });
//         //  };
      
      

        
//   return (

  

//     <div>
// <div className="container d-flex flex-fill justify-content-center pt-5">
//   <form className="form mb-4" onSubmit={onSubmit}>
  
//     <label htmlFor='uploadbtn' className="img-preview-wrapper mb-3 d-flex">
   
//     <input type="file" id='uploadbtn' onChange={onImageChange} hidden/>
//     <img src={file} className='img-preview' alt="" />
//     <span className='preview-text'>Upload Image</span>
//     </label>

//     <div className="row g-3 form-row form-group">
// <div className="col-6">
// <div className="form-holder">
// <input type="text" className="form-control" placeholder="Name" value={product.name} onChange={onNameChange}/>
// </div>
// </div>
// <div className="col-6">
// <div className=" input-group">
// <select className="custom-select form-control" id="inputGroupSelect01" value={product.category} onChange={onCategoryChange} >
// <option selected>Select Category</option>
//     {categoryList.map(categoryList => (
//       <option value={categoryList._id}>{categoryList.name}</option>
//     ))}
//   </select>
//   <i className="bi bi-arrow-down-square-fill input-group-text"></i>
// </div>
// </div>
// <div className="col-6">
// <div className="input-group">
// <input type="number" className="form-control" placeholder="Stock" value={product.stock} onChange={onStockChange}/>
// </div>
// </div>
// <div className="col-6">
// <div className="input-group">
// <span className="input-group-text">AED</span>
// <input type="number" className="form-control" placeholder="Price" value={product.price} onChange={onPriceChange}/>
// </div>
// </div>
// <div className="col-4">
// <div className="input-group">
// <div className="btn-group">
//   <input type="radio" className="btn-check" name="vat" id="vat1" value='true'  checked={product.vat}
//   onChange={onVatChange}/>
//   <label className="btn btn-secondary" htmlFor="vat1">vat</label>

//   <input type="radio" className="btn-check"  id="vat2" name="vat" value='false'    checked={!product.vat}
//   onChange={onVatChange}/>
//   <label className="btn btn-secondary" htmlFor="vat2">no vat</label>
 
// </div>
// </div>

// </div>

// <div className="col-4">
// <div className="input-group">
// <div className="btn-group">
//   <input type="radio" className="btn-check" name="sale" id="sale1" value='true'  checked={product.sale}
//   onChange={onSaleChange}/>
//   <label className="btn btn-secondary" htmlFor="sale1">sale</label>

//   <input type="radio" className="btn-check" name="sale" id="sale2" value='false' checked={!product.sale}
//   onChange={onSaleChange} />
//   <label className="btn btn-secondary" htmlFor="sale2">no sale</label>

// </div>
// </div>
// </div>
// <div className="col-4">
// <div className="input-group">
// <div className="btn-group">
//   <input type="radio" className="btn-check" name="featured" id="featured1" value='true' checked={product.featured}
//   onChange={onFeaturedChange}/>
//   <label className="btn btn-secondary" htmlFor="featured1">featured</label>

//   <input type="radio" className="btn-check" name="featured" id="featured2" value='false' checked={!product.featured}
//   onChange={onFeaturedChange}/>
//   <label className="btn btn-secondary" htmlFor="featured2">not featured</label>

// </div>
// </div>
// </div>
// </div>
// <button className='btn btn-primary' type='submit'>Upload</button>
// <span className='d-block'>
// {message}
// </span>
//   </form>

  

// </div>

//     </div>
//   )
// }




import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import baseURL from '../../axiosConfig';


const ProductUpdate = () => {

    const {id} = useParams();
  const [product, setProduct] = useState({});
  const [formData, setFormData] = useState({});
  const [imageFile, setImageFile] = useState([]);
  
  const [categoryList, setCategoryList] = useState([]);
const [message, setMessage] = useState('');

const [file, setFile] = useState('');

useEffect(() => {
  
  console.log(file);
         axios.get(`${baseURL}/api/category`)
           .then(response => {
             setCategoryList(response.data);
           })
           .catch(error => {
             console.log(error);
           });
       }, []);

  useEffect(() => {
    // Fetch the product data using the id
    axios.get(`${baseURL}/api/products/${id}`)
      .then(response => {
        setProduct(response.data);
        setFormData({
          name: response.data.name,
          price: response.data.price,
          stock: response.data.stock,
          vat: String(response.data.vat),
          sale: String(response.data.sale),
          featured: String(response.data.featured),
          category: response.data.category,
          image: response.data.image,
          disabled: String(response.data.disabled)
          
        });
        setFile(`${baseURL}/api/products/images/${response.data.image}`);
      })
      .catch(error => {
        console.error('Error fetching product:', error);
      });
      
  }, [id]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    console.log(formData)
  };
  
  
  const handleImageChange = async (e) => {
    setFile(URL.createObjectURL(e.target.files[0]));
   await  setImageFile(e.target.files[0]);
    console.log(e.target.files[0]);
    
  
  };

  const handleSubmit =  (e) => {
     
    e.preventDefault();
    const formDataWithImage = new FormData();
    formDataWithImage.append('name', formData.name);
    formDataWithImage.append('price', formData.price);
    formDataWithImage.append('stock', formData.stock);
    formDataWithImage.append('category', formData.category);
    formDataWithImage.append('vat', formData.vat);
    formDataWithImage.append('sale', formData.sale);
    formDataWithImage.append('featured', formData.featured);
    formDataWithImage.append('disabled', formData.disabled);
    if (imageFile) {
      console.log(imageFile);
       formDataWithImage.append('image', imageFile);
      console.log(imageFile);
    }

    axios.put(`${baseURL}/api/products/${id}`, formDataWithImage)
      .then(response => {
        console.log('formdata image: ' + formData.image);
        console.log('formdata: ' + formData.category);
        console.log('Product updated:', response.data);
        setMessage('Product updated successfully');
        // Perform any necessary actions after successful update
      })
      .catch(error => {
        console.error('Error updating product:', error);
        setMessage('Error: Product was not updated');
        // Handle the error
      });
  };
  console.log('Rendering ProductUpdate component');
  console.log('categoryList:', categoryList);
  console.log('product:', product);
  console.log('formData:', formData);
  console.log('imageFile:', imageFile);
  console.log('file:', file);
  return (

    <div>
    <div className="container d-flex flex-fill justify-content-center pt-5">
      <form className="form mb-4" onSubmit={handleSubmit}>
     
        <label htmlFor='uploadbtn' className="img-preview-wrapper mb-3 d-flex">
      
        <input type="file" id='uploadbtn' onChange={handleImageChange} hidden/>
        {imageFile ? (
            <img src={file} className="img-preview" alt="" />
          ) : (
            <img
              src={`${baseURL}/api/products/images/${formData.image}`}
              className="img-preview"
              alt=""
            />
          )}
        <span className='preview-text'>Upload Image</span>
        </label>
   
        <div className="row g-3 form-row form-group mb-3">
    <div className="col-6">
    <div className="form-holder">
    <input type="text" name="name" className="form-control" placeholder="Name" value={formData.name || ''} onChange={handleFormChange}/>
    </div>
    </div>
    <div className="col-6">
    <div className=" input-group">
    <select className="custom-select form-control" id="inputGroupSelect01" name="category" value={formData.category || ''} onChange={handleFormChange} >
    <option selected>Select Category</option>
        {categoryList.map(categoryList => (
          <option value={categoryList._id}>{categoryList.name}</option>
        ))}
      </select>
      <i className="bi bi-arrow-down-square-fill input-group-text"></i>
    </div>
    </div>
    <div className="col-6">
    <div className="input-group">
    <input type="number" className="form-control" name="stock" placeholder="Stock" value={formData.stock || ''} onChange={handleFormChange}/>
    </div>
    </div>
    <div className="col-6">
    <div className="input-group">
    <span className="input-group-text">AED</span>
    <input type="number" className="form-control" name="price" placeholder="Price" value={formData.price || ''} onChange={handleFormChange}/>
    </div>
    </div>
<div className="col-12">
  <div className="container">
    <div className="row">
    <div className="col-4">
    <div className="input-group">
    <div className="btn-group">
    <label htmlFor="vat" className='me-1'>VAT</label>
          <div>
            <input type="radio" className="btn-check" id="vat-yes" name="vat" value="true" checked={formData.vat === 'true'} onChange={handleFormChange} />
            <label htmlFor="vat-yes" className="btn btn-outline-primary me-1">Yes</label>
          </div>
          <div>
            <input type="radio" className="btn-check" id="vat-no" name="vat" value="false" checked={formData.vat === 'false'} onChange={handleFormChange} />
            <label htmlFor="vat-no" className="btn btn-outline-primary">No</label>
          </div>
    </div>
    </div>
   
    </div>
   
    <div className="col-4">
    
    <div className="input-group">
    <div className="btn-group">
    <label htmlFor="sale" className='me-1'>Sale</label>
          <div>
            <input type="radio" className="btn-check" id="sale-yes" name="sale" value="true" checked={formData.sale === 'true'} onChange={handleFormChange} />
            <label htmlFor="sale-yes" className="btn btn-outline-primary me-1">Yes</label>
          </div>
          <div>
            <input type="radio" className="btn-check" id="sale-no" name="sale" value="false" checked={formData.sale === 'false'} onChange={handleFormChange} />
            <label htmlFor="sale-no" className="btn btn-outline-primary">No</label>
          </div>
    </div>
    </div>
    </div>
    <div className="col-4">
    
    <div className="input-group">
    <div className="btn-group">
    <label htmlFor="featured" className='me-1'>Featured</label>
          <div>
            <input type="radio" className="btn-check" id="featured-yes" name="featured" value="true" checked={formData.featured === 'true'} onChange={handleFormChange} />
            <label htmlFor="featured-yes" className="btn btn-outline-primary me-1">Yes</label>
          </div>
          <div>
            <input type="radio" className="btn-check" id="featured-no" name="featured" value="false" checked={formData.featured === 'false'} onChange={handleFormChange} />
            <label htmlFor="featured-no" className="btn btn-outline-primary">No</label>
          </div>
    </div>
    </div>
    </div>


    <div className="col-4">
    
    <div className="input-group">
    <div className="btn-group">
    <label htmlFor="disabled" className='me-1'>disabled</label>
          <div>
            <input type="radio" className="btn-check" id="disabled-yes" name="disabled" value="true" checked={formData.disabled === 'true'} onChange={handleFormChange} />
            <label htmlFor="disabled-yes" className="btn btn-outline-primary me-1">Yes</label>
          </div>
          <div>
            <input type="radio" className="btn-check" id="disabled-no" name="disabled" value="false" checked={formData.disabled === 'false'} onChange={handleFormChange} />
            <label htmlFor="disabled-no" className="btn btn-outline-primary">No</label>
          </div>
    </div>
    </div>
    </div>
    </div>
  </div>
</div>

   
    </div>
    <div className="d-flex align-items-center">
    <button className='btn btn-primary me-5' type='submit'>Upload</button>
 <span className='d-block'> {message}
 </span>
    </div>
      </form>
   
     
   
    </div>
   
        </div>


   )}

export default ProductUpdate;


{/* <div className="container d-flex flex-fill justify-content-center pt-5">
<h2>Edit Product</h2>
<form className="form mb-4" onSubmit={handleSubmit}>
  <div>
    <label htmlFor="name">Name</label>
    <input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} />
  </div>
  <div>
    <label htmlFor="price">Price</label>
    <input type="number" name="price" value={formData.price || ''} onChange={handleFormChange} />
  </div>
  <div>
    <label htmlFor="stock">Stock</label>
    <input type="number" name="stock" value={formData.stock || ''} onChange={handleFormChange} />
  </div>
  <div>
    <label htmlFor="vat">VAT</label>
    <select name="vat" value={formData.vat || ''} onChange={handleFormChange}>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  </div>
  <div>
    <label htmlFor="sale">Sale</label>
    <select name="sale" value={formData.sale || ''} onChange={handleFormChange}>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  </div>
  <div>
    <label htmlFor="featured">Featured</label>
    <select name="featured" value={formData.featured || ''} onChange={handleFormChange}>
      <option value="true">Yes</option>
      <option value="false">No</option>
   </select>
   </div>
   <button type='submit'>
update
   </button>
   </form>
   </div> */}


    
