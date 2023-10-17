import axios from 'axios';
import React, { useEffect, useState } from 'react'
import product from './product';
import { Link } from 'react-router-dom';
import baseURL from '../../axiosConfig';
import DeleteConfirmation from './delete confirmation';
import { Button, Modal } from 'react-bootstrap';
import ProductUpdate from './ProductUpdate'

const ProductCard_admin = ({productData}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false); // State to manage the delete modal
    const [productFilter, setProductFilter] = useState();
    const [showEditModal, setShowEditModal] = useState(false); // State to manage the edit modal
    const [product, setProduct] = useState(productData); // State to store edited product data
  
useEffect(()=>{
console.log(product);
}, []);
    // Function to receive data from the child component
  const updatedProducts = (data) => {
    setProduct(data);
  }



    const deleteProduct = (id) => {
      console.log(id);
      // Show the delete confirmation modal
      setShowDeleteModal(true);
    };
  
    const confirmDelete = (id) => {
      console.log(id);
      axios
      .delete(`${baseURL}/api/products/${id}`)
      .then((res) => {
          // Handle successful deletion if needed
        })
        .catch((error) => console.log(error));
  
      // Close the delete confirmation modal
      setShowDeleteModal(false);
    };
  
    const hideDeleteModal = () => {
      // Close the delete confirmation modal without performing any action
      setShowDeleteModal(false);
      console.log('id');
    };


    const handleEditClick = () => {
      setShowEditModal(true);
    };
 
    
  return (
  <div className="admin p-0">
   <div className="p-1 p-md-2 h-100">
   <div className="admin-products p-2">
            <div className=" card-product">
           {product.sale?( <div className="text-center position-relative">
                  <div className=" position-absolute top-0 start-0">
                    <span className="badge">Sale</span>
                  </div>
                  </div>): ''}
            <img src={`${baseURL}/api/products/images/${product.image}`} alt="Product image" className="card-img img-fluid admin-product-image"  />
              <div className="pt-3 product-details-card">
               
                <div className="mb-1">
                  
                  <div className="d-flex justify-content-between">
                  <span className='category-name text-pb fw-400 text-small'>{product.category.name}</span>
                
                  
                  </div>

                <h6 className="fw-500 mt-1 overflow product-name">{product.name}</h6>
                <div className="">
                
                </div>
                </div>
               
                <div className="">
                <span className="product-price">AED {product.price}</span>
                 <div className='d-flex justify-content-between'>
                 <div className=' d-flex  align-items-center rounded-1'>
                  <div className="btn  btn-sm text-pr d-flex p-0 text-sm d-flex align-items-center" onClick={() => deleteProduct(product._id)}>
                    <i className="bi bi-trash fs-6 pe-1 text-sm"></i>
                    <span>
                      Delete
                    </span>
                      </div></div>
                      <div className=' d-flex  '>
                      <button className="btn btn-sm d-flex" onClick={handleEditClick}>
                  <i className="bi bi-pen pe-2 text-pg text-sm"></i>
                  <span className="text-pg text-sm">Edit</span>
                </button>
                      </div>
                 </div>
                </div>
              </div>
            </div>

            {/* Render the delete confirmation modal */}
      <DeleteConfirmation
        showModal={showDeleteModal}
        hideModal={hideDeleteModal}
        confirmModal={() => confirmDelete(product._id)}
        id={product._id}
        type="product"
        message="Are you sure you want to delete this product?"
      />


       {/* Render the Edit Modal */}
       <Modal show={showEditModal} fullscreen={true} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Product</Modal.Title>
          </Modal.Header>
          <Modal.Body>
          <ProductUpdate id = {product._id} products = {product}  editedProduct = {updatedProducts}/>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Close
            </Button>
            {/* Add a Save button to save the edited product */}
          </Modal.Footer>
        </Modal>

        
          </div>
   </div>
    
 
   </div>
  )
}

export default ProductCard_admin
