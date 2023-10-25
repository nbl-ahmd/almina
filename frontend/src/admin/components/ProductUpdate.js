import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import baseURL from '../../axiosConfig';


const ProductUpdate = ({id, products, editedProduct}) => {

  const [product, setProduct] = useState([]);
  const [formData, setFormData] = useState({});
  const [imageFile, setImageFile] = useState([]);

  const [categoryList, setCategoryList] = useState([]);
  const [message, setMessage] = useState('');

  const [file, setFile] = useState('');


  const [salePrice, setSalePrice] = useState(0);
  const [offerPercentage, setOfferPercentage] = useState(formData.offerPercentage || 0);
  const [pageText, setPageText] = useState('');
  const [saleType, setSaleType] = useState('price_cut');
  const [displaySaleText, setDisplaySaleText] = useState('');



  useEffect(() => {

    console.log(file);
    axios.get(`${baseURL}/api/category`)
      .then(response => {
        setCategoryList(response.data);
      })
      .catch(error => {
        console.log(error);
      });
  }, [id]);

  useEffect(() => {
    setProduct(products);
    // Fetch the product data using the id
    axios.get(`${baseURL}/api/products/${id}`)
      .then(response => {
        setFormData({
          name: response.data.name,
          price: response.data.price,
          stock: response.data.stock,
          vat: String(response.data.vat),
          sale: String(response.data.sale),
          featured: String(response.data.featured),
          category: response.data.category,
          image: response.data.image,
          disabled: String(response.data.disabled),
          salePrice: response.data.salePrice,
          salePercent: response.data.salePercent,
          saleBadge: response.data.saleBadge,
          saleType: response.data.saleType,

        });
        setFile(`${baseURL}/api/products/images/${response.data.image}`);
      })
      .catch(error => {
        console.error('Error fetching product:', error);
      });

  }, [id]);



  const handleFormChange = (e) => {

    

    const { name, value } = e.target;
    console.log(product);


    if (name === 'category') {
      // Find the category object based on the selected ID
      const selectedCategory = categoryList.find((cat) => cat._id === value);
  
      setProduct((prevProduct) => ({
        ...prevProduct,
        category: selectedCategory,
      }));
    } 
    else if (name === 'salePercent'){
      const percentage = parseFloat(e.target.value);
      setOfferPercentage(percentage);
      
    
      // Calculate the new offer value by deducting the percentage from the original price
      const originalPrice = product.price;
      const discountAmount = (originalPrice * percentage) / 100;
      const newOfferValue = originalPrice - discountAmount;
    
      // Update the product form data with the new offer value
      setProduct((prevProduct) => ({
        ...prevProduct,
        salePercent: percentage,
        salePrice: Number(newOfferValue.toFixed(2)),

        saleBadge: percentage + '% offer',
        
      }));
    }
    else if(name === 'saleBadge'){
      setProduct((prevProduct) => ({
        ...prevProduct,
        salePercent: 0,
        salePrice: 0,
        saleBadge: e.target.value,
        
      }));
    }
   
    else {
      // For other form fields, update them as before
    const updatedValue = name === 'vat' || name === 'sale' || name === 'featured' || name === 'disabled' ? value === 'true' : value;
  
      setProduct((prevProduct) => ({
        ...prevProduct,
        [name]: updatedValue,
        saleBadge: displaySaleText,
      }));

  }
  };


  const handleImageChange = async (e) => {
    setFile(URL.createObjectURL(e.target.files[0]));
    await setImageFile(e.target.files[0]);
    console.log(e.target.files[0]);


  };

  const handleSubmit = (e) => {
    
    console.log(product);
    e.preventDefault();
    const formDataWithImage = new FormData();
    formDataWithImage.append('name', product.name);
    formDataWithImage.append('price', product.price);
    formDataWithImage.append('stock', product.stock);
    formDataWithImage.append('category', product.category._id);
    formDataWithImage.append('vat', product.vat);
    formDataWithImage.append('sale', product.sale);
    formDataWithImage.append('featured', product.featured);
    formDataWithImage.append('disabled', product.disabled);
    formDataWithImage.append('salePrice', product.salePrice);
    formDataWithImage.append('salePercent', product.salePercent);
    formDataWithImage.append('saleBadge', product.saleBadge);
    formDataWithImage.append('saleType', product.saleType);
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
        // Access the new image name from the API response
    const updatedImage = response.data.image;

    // Update the product state with the new image name
    editedProduct({ ...product, image: updatedImage });
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
  
  // const handleOfferPercentageChange = (e) => {
  //   const percentage = parseFloat(e.target.value);
  //   setOfferValue(percentage);
  
  //   // Calculate the new offer value by deducting the percentage from the original price
  //   const originalPrice = parseFloat(formData.price);
  //   const discountAmount = (originalPrice * percentage) / 100;
  //   const newOfferValue = originalPrice - discountAmount;
  
  //   // Update the product form data with the new offer value
  //   setFormData((prevFormData) => ({
  //     ...prevFormData,
  //     offerPercentage: percentage,
  //     salePrice: newOfferValue.toFixed(2), // Save the new offer value
  //   }));
  // };
  


  return (

    <div className=''>
      <div className="container d-flex flex-fill justify-content-center pt-5">
        <form className="form mb-4" onSubmit={handleSubmit}>

          <label htmlFor='uploadbtn' className="img-preview-wrapper mb-3 d-flex">

            <input type="file" id='uploadbtn' onChange={handleImageChange} hidden />
            {imageFile ? (
              <img src={file} className="img-preview" alt="" />
            ) : (
              <img
                src={`${baseURL}/api/products/images/${product.image}`}
                className="img-preview"
                alt=""
              />
            )}
            {!product.image ? (<span className='preview-text'>Upload Image</span>) : ''}

          </label>

          <div className="row g-3 form-row form-group mb-3">
            <div className="col-6">
              <div className="form-holder">
                <input type="text" name="name" className="form-control" placeholder="Name" value={product.name || ''} onChange={handleFormChange} />
              </div>
            </div>
            <div className="col-6">
              <div className=" input-group">
                <select className="custom-select form-control" id="inputGroupSelect01" name="category" value={product.category ? product.category._id : ''} onChange={handleFormChange} >
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
                <span className="input-group-text">Stock</span>
                <input type="number" className="form-control" name="stock" placeholder="Stock" value={product.stock || ''} onChange={handleFormChange} />
              </div>
            </div>
            <div className="col-6">
              <div className="input-group">
                <span className="input-group-text">AED</span>
                <input type="number" className="form-control" name="price" placeholder="Price" value={product.price || ''} onChange={handleFormChange} />
              </div>
            </div>
            <div className="col-12 mt-5">
              <div className="container">
                <div className="row">
                  <div className="col-6 ">
                    <div className="form-group mb-3">
                        <label htmlFor="vat" className='mb-2'>VAT</label>
                      <div className="btn-group">
                        <div>
                          <input type="radio" className="btn-check" id="vat-yes" name="vat" value={true} checked={product.vat === true} onChange={handleFormChange} />
                          <label htmlFor="vat-yes" className="btn btn-outline-primary me-1">Yes</label>
                        </div>
                        <div>
                          <input type="radio" className="btn-check" id="vat-no" name="vat" value={false} checked={product.vat === false} onChange={handleFormChange} />
                          <label htmlFor="vat-no" className="btn btn-outline-primary">No</label>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="col-6 mb-3">

                    <div className="form-group mb-3">
                        <label htmlFor="sale" className='col-form-label me-3'>Sale</label>
                      <div className="btn-group">
                        <div>
                          <input type="radio" className="btn-check" id="sale-yes" name="sale" value="true" checked={product.sale === true} onChange={(e)=>{
                  const isSale = e.target.value === 'true';
                  setFormData({ ...formData, sale: String(isSale) });
                  // Reset sale-specific fields when the sale option changes
                  setSaleType('');
                  setSalePrice(0);
                  setDisplaySaleText('');
                  console.log("Dsads");
                  handleFormChange(e);
                }} />
                          <label htmlFor="sale-yes" className="btn btn-outline-primary me-1">Yes</label>
                        </div>
                        <div>
                          <input type="radio" className="btn-check" id="sale-no" name="sale" value="false" checked={product.sale === false} onChange={(e)=>{
                  const isSale = e.target.value === 'true';
                  setFormData({ ...formData, sale: String(isSale) });
                  // Reset sale-specific fields when the sale option changes
                  setSaleType('');
                  setSalePrice(0);
                  setDisplaySaleText('');
                  console.log("Dsads");
                  handleFormChange(e);
                }} />
                          <label htmlFor="sale-no" className="btn btn-outline-primary">No</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 mb-3">

                    <div className="form-group mb-3">
                        <label htmlFor="featured" className='col-form-label me-3'>Featured</label>
                      <div className="btn-group">
                        <div>
                          <input type="radio" className="btn-check" id="featured-yes" name="featured" value="true" checked={product.featured === true} onChange={handleFormChange} />
                          <label htmlFor="featured-yes" className="btn btn-outline-primary me-1">Yes</label>
                        </div>
                        <div>
                          <input type="radio" className="btn-check" id="featured-no" name="featured" value="false" checked={product.featured === false} onChange={handleFormChange} />
                          <label htmlFor="featured-no" className="btn btn-outline-primary">No</label>
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="col-6 mb-3">

                    <div className="form-group mb-3">
                        <label htmlFor="disabled" className='col-form-label me-3'>disabled</label>
                      <div className="btn-group">
                        <div>
                          <input type="radio" className="btn-check" id="disabled-yes" name="disabled" value={true} checked={product.disabled === true} onChange={handleFormChange} />
                          <label htmlFor="disabled-yes" className="btn btn-outline-primary me-1">Yes</label>
                        </div>
                        <div>
                          <input type="radio" className="btn-check" id="disabled-no" name="disabled" value= {false} checked={product.disabled === false} onChange={handleFormChange} />
                          <label htmlFor="disabled-no" className="btn btn-outline-primary">No</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Additional fields displayed when 'Sale' is selected */}
            {product.sale && (
            <div>
              <div className="col-6 mb-3">
                <div className="form-group mb-3">
                  <label className="col-form-label me-3">Sale Type</label>
                  <select
                    className="form-select"
                    name="saleType"
                    value={product.saleType}
                    onChange={(e)=>{
                      handleFormChange(e);
                      setSaleType(e.target.value);
                    }}
                  >
                    <option value="price_cut">Price Cut</option>
                    <option value="percentage_offer">Percentage Offer</option>
                    <option value="combo_offer">Combo Offer</option>
                  </select>
                </div>
              </div>
              {saleType === 'price_cut' && (
                <div className="col-6">
                  <div className="input-group">
                    <span className="input-group-text">Sale Price</span>
                    <input
                      type="number"
                      className="form-control"
                      name="salePrice"
                      placeholder="Sale Price"
                      value={product.salePrice}
                      onChange={(e)=>{
                        handleFormChange(e);
                        setSalePrice(e.target.value);
                      setDisplaySaleText('sale')
                        
                      }}
                    />
                  </div>
                </div>
              )}
              {saleType === 'percentage_offer' && (
                <div className="col-6">
                <div className="input-group">
                  <span className="input-group-text">Offer Percentage</span>
                  <input
                    type="number"
                    className="form-control"
                    name="salePercent"
                    placeholder="Offer Percentage"
                    value={product.salePercent}
                    onChange={(e)=>{
                      handleFormChange(e);
                      setOfferPercentage(e.target.value);
                      setSalePrice(e.target.value);
                    }}
                  />
                </div>
                {product.sale && (
                  <p className="text-muted">Calculated Offer Value: AED {product.salePrice || 'enter percentage to calculate'}</p>
                )}
              </div>
              )}
              {saleType === 'combo_offer' && (
                <div className="col-12">
                  <div className="form-holder">
                    <input
                      type="text"
                      name="saleBadge"
                      className="form-control"
                      placeholder="Page Text"
                      value={product.saleBadge}
                      onChange={(e)=>{
                        handleFormChange(e);
                        setDisplaySaleText(e.target.value);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          </div>
          <div className="d-flex align-items-center">
            <button className='btn btn-primary me-5' type='submit'>Upload</button>
            <span className='d-block'> {message}
            </span>
          </div>
        </form>



      </div>

    </div>


  )
}

export default ProductUpdate;


