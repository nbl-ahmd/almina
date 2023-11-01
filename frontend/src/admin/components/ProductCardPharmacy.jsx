// import axios from 'axios';
// import React, { useEffect, useState } from 'react'
// import product from './product';
// import { Link } from 'react-router-dom';
// import baseURL from '../../axiosConfig';
// import DeleteConfirmation from './delete confirmation';
// import { Button, Modal } from 'react-bootstrap';
// import ProductUpdate from './ProductUpdate'
// import { Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Card, Box, Switch } from '@mui/material';

// const ProductCard_admin = ({productData}) => {
//   const [showDeleteModal, setShowDeleteModal] = useState(false); // State to manage the delete modal
//     const [productFilter, setProductFilter] = useState();
//     const [showEditModal, setShowEditModal] = useState(false); // State to manage the edit modal
//     const [product, setProduct] = useState(productData); // State to store edited product data
  
// useEffect(()=>{
// console.log(product);
// }, []);
//     // Function to receive data from the child component
//   const updatedProducts = (data) => {
//     setProduct(data);
//   }



//     const deleteProduct = (id) => {
//       console.log(id);
//       // Show the delete confirmation modal
//       setShowDeleteModal(true);
//     };
  
//     const confirmDelete = (id) => {
//       console.log(id);
//       axios
//       .delete(`${baseURL}/api/products/${id}`)
//       .then((res) => {
//           // Handle successful deletion if needed
//         })
//         .catch((error) => console.log(error));
  
//       // Close the delete confirmation modal
//       setShowDeleteModal(false);
//     };
  
//     const hideDeleteModal = () => {
//       // Close the delete confirmation modal without performing any action
//       setShowDeleteModal(false);
//       console.log('id');
//     };


//     const handleEditClick = () => {
//       setShowEditModal(true);
//     };
//     function getSaleTypeClass(saleType) {
//       switch (saleType) {
//         case 'price_cut':
//           return 'bg-p-or'; // Replace with your actual class name
//         case 'percentage_offer':
//           return 'offer-badge'; // Replace with your actual class name
//         case 'combo_offer':
//           return 'bg-p-pu'; // Replace with your actual class name
//         default:
//           return 'bg-p-or'; // Default class when saleType doesn't match any specific type
//       }
//     }

    
    
//   return (
//     <TableRow
//     key={product.name}
//     sx={{fontFamily: 'Poppins, sans-serif'}}
//   >
//     <TableCell >
//      <Box sx={{display: 'flex',
//  alignItems: 'center',
//  maxWidth:'500px'}}>
//      <img src=
//       {`${baseURL}/api/products/images/${product.image}`} width={'100px'} className='me-2 border border-1 rounded-3'/>
//       <Box sx={{ml:2}} >
//       <span>
//                         {product.sale &&
//                     <span className={`badge mb-2 ${getSaleTypeClass(product.saleType)}`}>{product.saleBadge || 'sale'}</span>
//                     }
//                         </span>
//       <p className='mb-1'>
//       {product.name}
//       </p>
//       <p className='fw-300'>
//       {product.category.name}
//       </p>
//       </Box>
//      </Box>
//     </TableCell>
    
//     <TableCell align="left">{product.stock}</TableCell>
//     <TableCell align="left">AED {product.price}</TableCell>
//     <TableCell align="left">
// <Switch
// checked={!product.disabled}
// onChange={() => handleToggleProduct(product)}
// color="primary"
// name="toggleProduct"
// inputProps={{ 'aria-label': 'toggle product' }}
// />
// </TableCell>
    
//   </TableRow>
//   )
// }

// export default ProductCard_admin
