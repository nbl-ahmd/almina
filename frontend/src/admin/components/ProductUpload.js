import React, { useEffect, useState} from 'react';
import axios from 'axios';
import baseURL from '../../axiosConfig';



const ProductUpload = () => {
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [categoryList, setCategoryList] = useState([]);
  const [category, setCategory] = useState('');
  const [featured, setFeatured] = useState(false);
  const [price, setPrice] = useState('');
  const [vat, setVat] = useState(false);
  const [stock, setStock] = useState('');
  const [sale, setSale] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState();
  const [barcode, setBarcode] = useState('')

  useEffect(() => {
    axios.get(`${baseURL}/api/category`)
      .then(response => {
        setCategoryList(response.data);
      })
      .catch(error => {
        console.log(error);
      });
  }, []);
    
  
  
  const onNameChange = e => setName(e.target.value);
  const onImageChange = e =>{ 
    setFile(URL.createObjectURL(e.target.files[0]));
    setImage(e.target.files[0])};
  const onCategoryChange = e => setCategory(e.target.value);
  // const onFeaturedChange = e => setFeatured(e.target.value);
  const onPriceChange = e => setPrice(e.target.value);

  const onBarcodeChange = e => setBarcode(e.target.value);


  // const onVatChange = e => setVat(e.target.value);
  const onStockChange = e => setStock(e.target.value);
  // const onSaleChange = e => setSale(e.target.value);


  const onSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', image);
    formData.append('category', category);
    formData.append('featured', featured);
    formData.append('price', price);
    formData.append('vat', vat);
    formData.append('stock', stock);
    formData.append('sale', sale);
    axios.post(`${baseURL}/api/products`, formData)
    .then(response => {
        console.log(response.data);
        setMessage('product created successfully');
      })
      .catch(error => {
        console.log(error);
        setMessage('Error: product was not created');
      });
  };



  return (
    <div>
<div className="container d-flex flex-fill justify-content-center pt-5">
  <form className="form mb-4" onSubmit={onSubmit}>
  
    <label htmlFor='uploadbtn' className="img-preview-wrapper mb-3 d-flex">
   
    <input type="file" id='uploadbtn' onChange={onImageChange} hidden/>
    <img src={file} className='img-preview' alt="" />
    <span className='preview-text'>Upload Image</span>
    </label>

    <div className="row g-3 form-row form-group">
<div className="col-6">
<div className="form-holder">
<input type="text" className="form-control" placeholder="Name" value={name} onChange={onNameChange}/>
</div>
</div>
<div className="col-6">
<div className=" input-group">
<select className="custom-select form-control" id="inputGroupSelect01" value={category} onChange={onCategoryChange} >
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
<input type="number" className="form-control" placeholder="Stock" value={stock} onChange={onStockChange}/>
</div>
</div>
<div className="col-6">
<div className="input-group">
<span className="input-group-text">AED</span>
<input type="number" className="form-control" placeholder="Price" value={price} onChange={onPriceChange}/>
</div>
</div>
<div className="col-6">
<div className="input-group">
<span className="input-group-text">barcode</span>
<input type="text" className="form-control" placeholder="barcode" value={barcode} onChange={onBarcodeChange}/>
</div>
</div>
<div className="col-4">
<div className="input-group">
<div className="btn-group">
  <input type="radio" className="btn-check" name="vat" id="vat1" value='true' checked={vat} onChange={ () => setVat(true)}/>
  <label className="btn btn-secondary" htmlFor="vat1">vat</label>

  <input type="radio" className="btn-check"  id="vat2" name="vat" value='false' checked={!vat} onChange={ () => setVat(false)}/>
  <label className="btn btn-secondary" htmlFor="vat2">no vat</label>
 
</div>
</div>

</div>

<div className="col-4">
<div className="input-group">
<div className="btn-group">
  <input type="radio" className="btn-check" name="sale" id="sale1" value='true' checked={sale} onChange={ () => setSale(true)}/>
  <label className="btn btn-secondary" htmlFor="sale1">sale</label>

  <input type="radio" className="btn-check" name="sale" id="sale2" value='true' checked={!sale} onChange={ () => setSale(false)} />
  <label className="btn btn-secondary" htmlFor="sale2">no sale</label>

</div>
</div>
</div>
<div className="col-4">
<div className="nput-group">
<div className="btn-group">
  <input type="radio" className="btn-check" name="featured" id="featured1" value='true' checked={featured} onChange={ () => setFeatured(true)}/>
  <label className="btn btn-secondary" htmlFor="featured1">featured</label>

  <input type="radio" className="btn-check" name="featured" id="featured2" value='true' checked={!featured} onChange={ () => setFeatured(false)}/>
  <label className="btn btn-secondary" htmlFor="featured2">not featured</label>

</div>
</div>
</div>
</div>
<button className='btn btn-primary' type='submit'>Upload</button>
<span className='d-block'>
{message}
</span>
  </form>

  

</div>





      {/* <div className="container">
        <div className="row">
          <form onSubmit={onSubmit}>
            <h3>file upload</h3>
            <div className="form-group">
              <input type="file" onChange={onFileChange} />
            </div>
            <div className="form-group">
              <button className='btn btn-primary' type='submit'>Upload</button>
            </div>
          </form>
        </div>
      </div> */}
    </div>
  );
};

export default ProductUpload;
