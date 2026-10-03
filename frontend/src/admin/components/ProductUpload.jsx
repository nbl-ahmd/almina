import React, { useEffect, useState } from 'react';
import axios from 'axios';
import baseURL from '../../axiosConfig';
import { Alert } from '@mui/material';

const ProductUpload = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]); // Store selected files
  const [previewImages, setPreviewImages] = useState([]); // Store preview URLs

  const [categoryList, setCategoryList] = useState([]);
  const [category, setCategory] = useState('');
  const [featured, setFeatured] = useState(false);
  const [price, setPrice] = useState('');
  const [vat, setVat] = useState(false);
  const [stock, setStock] = useState('');
  const [sale, setSale] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [barcode, setBarcode] = useState('');

  useEffect(() => {
    axios
      .get(`${baseURL}/api/category`)
      .then((response) => {
        setCategoryList(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const onImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setImages(selectedFiles);

    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewImages(previewUrls);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    images.forEach((image) => formData.append('images', image)); // Append each image
    formData.append('category', category);
    formData.append('featured', featured);
    formData.append('price', price);
    formData.append('vat', vat);
    formData.append('stock', stock);
    formData.append('sale', sale);
    formData.append('barcode', barcode);
    formData.append('description', description)

    axios
      .post(`${baseURL}/api/products`, formData)
      .then((response) => {
        console.log(response.data);
        setMessage('Product created successfully');
      })
      .catch((error) => {
        console.log(error);
        setErrorMessage('Error: Product was not created');
      });
  };

  return (
    <div>
      <div className="container d-flex flex-fill justify-content-center pt-5">
        <form className="form mb-4" onSubmit={onSubmit}>
          <div className="mb-3">
            <label htmlFor="uploadbtn" className="d-block text-center">
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  border: '2px dashed #ccc',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  margin: '0 auto 10px',
                }}
              >
                {previewImages.length === 0 ? (
                  <span style={{ color: '#999' }}>Upload Images</span>
                ) : (
                  <img
                    src={previewImages[0]}
                    alt="Main Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '10px',
                    }}
                  />
                )}
              </div>
            </label>
            <input
              type="file"
              id="uploadbtn"
              name='images'
              onChange={onImageChange}
              hidden
              multiple
            />
            <div className="image-preview-container d-flex justify-content-center flex-wrap gap-2">
              {previewImages.map((preview, index) => (
                <img
                  key={index}
                  src={preview}
                  alt={`Preview ${index}`}
                  className="img-thumbnail"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    margin: '5px',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="row g-3 form-row form-group">

            <div className="col-6">
<div className="form-holder">

<input type="text" className="form-control" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}/>
</div>
</div>
            {/* <div className="col-6">
              <select
                className="custom-select form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                {categoryList.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div> */}

<div className="col-6">
<div className=" input-group">
<select className="custom-select form-control" id="inputGroupSelect01" value={category} onChange={(e) => setCategory(e.target.value)} >
<option selected>Select Category</option>
    {categoryList.map(categoryList => (
      <option value={categoryList._id}>{categoryList.name}</option>
    ))}
  </select>
  <i className="bi bi-arrow-down-square-fill input-group-text"></i>
</div>
</div>


<div className="col-12">
<div className="form-holder">

<input type="text" className="form-control" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}/>
</div>
</div>

            {/* <div className="col-6">
              <input
                type="number"
                className="form-control"
                placeholder="Stock"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div> */}

            <div className="col-6">
<div className="input-group">
<input type="number" className="form-control" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)}/>
</div>
</div>
            {/* <div className="col-6">
              <div className="input-group">
                <span className="input-group-text">AED</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div> */}


<div className="col-6">
<div className="input-group">
<span className="input-group-text">AED</span>
<input type="number" className="form-control" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)}/>
</div>
</div>


            {/* <div className="col-6">
              <input
                type="text"
                className="form-control"
                placeholder="Barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div> */}

<div className="col-6">
<div className="input-group">
<span className="input-group-text">barcode</span>
<input type="text" className="form-control" placeholder="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)}/>
</div>
</div>



            {/* <div className="col-4">
              <div className="btn-group">
                <input
                  type="radio"
                  className="btn-check"
                  name="vat"
                  id="vat1"
                  checked={vat}
                  onChange={() => setVat(true)}
                />
                <label className="btn btn-secondary" htmlFor="vat1">
                  VAT
                </label>
                <input
                  type="radio"
                  className="btn-check"
                  name="vat"
                  id="vat2"
                  checked={!vat}
                  onChange={() => setVat(false)}
                />
                <label className="btn btn-secondary" htmlFor="vat2">
                  No VAT
                </label>
              </div>
            </div> */}


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


<div className="col-6">
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

          <button className="btn btn-primary float-end mt-3" type="submit">
            Upload
          </button>
        </form>

        {message && <Alert severity="success">{message}</Alert>}
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      </div>
    </div>
  );
};

export default ProductUpload;
