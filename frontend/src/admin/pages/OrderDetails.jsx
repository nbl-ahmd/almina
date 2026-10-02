import { Container, Grid, Card, Box, Typography, TextField, Chip, Alert, Dialog, Modal, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import baseURL from '../../axiosConfig';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from 'react-bootstrap';
import BackToTopButton from '../../client/components/BackToTopButton';


const OrderDetails = () => {
  const { OrderId } = useParams();
  const [order, setOrder] = useState([]);
  const [lifecycleError, setLifecycleError] = useState('');
  const [documentId, setDocumentId] = useState(''); // Add state for document ID
  const [documentIdError, setDocumentIdError] = useState('');
  const [documentAmount, setDocumentAmount] = useState(); // Add state for document ID
  const [documentAmountError, setDocumentAmountError] = useState('');
  const [documentAmountValidateError, setDocumentAmountValidateError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // State to manage the delete modal
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    axios
      .get(`${baseURL}/api/orders/${OrderId}`)
      .then((response) => {
        setOrder(response.data);
      })
      .catch(() => setLifecycleError('Unable to load this order.'));
    setDocumentId('');
    setDocumentIdError('');
  }, [OrderId]);

  function formatTimestamp(timestamp) {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    const formattedDate = new Date(timestamp).toLocaleDateString('en-US', options);
    return formattedDate;
  }

  const formattedDate = formatTimestamp(order.createdAt);

  function getSaleTypeClass(saleType) {
    switch (saleType) {
      case 'price_cut':
        return 'bg-p-or';
      case 'percentage_offer':
        return 'offer-badge';
      case 'combo_offer':
        return 'bg-p-pu';
      default:
        return 'bg-p-or';
    }
  }



  const handleDispatchOrder = async (orderId) => {
    if (!documentId && !documentAmount) {
      // Both fields are empty
      setDocumentIdError('Document ID is required');
      setDocumentAmountError('Document Amount is required');
      return;
    } else if (!documentId) {
      setDocumentIdError('Document ID is required');
      // Clear the other error state to clear previous errors
      setDocumentAmountError('');
      return;
    } else if (!documentAmount) {
      setDocumentAmountError('Document Amount is required');
      // Clear the other error state to clear previous errors
      setDocumentIdError('');
      return;
    }

    if (documentAmount !== order.customer.totalAmount) {
      setDocumentAmountValidateError('bill Amount not same');
      return;
    } else {
      setDocumentAmountValidateError('');

    }
    if (documentIdError) {
      return;
    }

    try {
      await axios.put(`${baseURL}/api/orders/${orderId}`, { dispatched: true, billno: documentId, billamount: documentAmount });
      // After a successful update, update the order state
      setOrder((prevOrder) => ({
        ...prevOrder,
        dispatched: true,
        status: 'dispatched',
      }));

    } catch (error) {
      setLifecycleError('The server rejected dispatch. Check the order status and recorded bill amount.');
    }
  };
  const handleCancelOrder = async (orderId) => {

    try {
      await axios.put(`${baseURL}/api/orders/cancel/${orderId}`, { cancelled: true });
      setShowDeleteModal(false);
      // After a successful update, update the order state
      setOrder((prevOrder) => ({
        ...prevOrder,
        canceled: true,
        status: 'cancelled',
      }));

    } catch (error) {
      setLifecycleError('The server rejected cancellation. Reload the order to check its current status.');
    }
  };

  const cancelOrder = () => {
    // Show the delete confirmation modal
    setShowDeleteModal(true);
  };
  const hideDeleteModal = () => {
    // Close the delete confirmation modal without performing any action
    setShowDeleteModal(false);
  };

  const openGallery = (imageURL) => {
    setSelectedImage(imageURL);
    setGalleryOpen(true);
  };

  return (
    <Container sx={{ mt: 2, marginBottom: '5rem' }}>
      {lifecycleError && <Alert severity='error'>{lifecycleError}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 5, fontFamily: 'Poppins, sans-serif', fontWeight: '300', fontSize: '15px' }}>
        <div>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 600 }}>Order # {order.orderId} <Chip label={order.status || 'pending'} variant='outlined' />

          </Typography>
          <Typography sx={{ color: 'rgb(145, 158, 171)' }}>{formattedDate}</Typography>
        </div>

        {['pending', 'confirmed', 'packed'].includes(order.status || 'pending') && (
          <Box>
            <Button className="btn btn-p me-3" onClick={() => handleDispatchOrder(order._id)}>Dispatch</Button>
            <Button className="btn btn-danger" onClick={() => cancelOrder(order._id)}>Cancel</Button>
          </Box>
        )}
      </Box>
      <Dialog
        open={showDeleteModal}
        onClose={hideDeleteModal}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Cancel the order"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            are you sure you want to cancel the order
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="default" onClick={hideDeleteModal}>No</Button>
          <Button variant="danger" onClick={() => { handleCancelOrder(order._id) }} autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
      {/* Render the delete confirmation modal */}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
            <div className="d-flex justify-content-between ">
              <h6>Details</h6>
              {!order.snapshotAvailable && <Alert severity='info'>Historical line snapshots were not recorded. Product labels below are current catalog hints; recorded order totals are preserved.</Alert>}


            </div>

            <Box>
              {order !== null &&
                Array.isArray(order.cartItems) &&
                order.cartItems.length > 0 &&
                order.cartItems.map((cartItem, index) => (
                  <Box key={index} sx={{ py: 3, bgcolor: '#fff', borderRadius: '15px', display: 'flex', alignItems: 'center', mb: 1, fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: '400' }}>
                    <div className="d-flex flex-grow-1">
                      {cartItem._id.image && <div
                        className="image-container"
                        onClick={() => openGallery(cartItem._id.image)}
                      >
                        <img
                          src={`${baseURL}/api/products/images/${cartItem._id.image}`}
                          alt=""
                          width={'100px'}
                          className="me-4 bg-body border rounded-3"
                        />
                      </div>}


                      <div className="d-flex flex-column justify-content-center user-details">
                        <span>
                          {cartItem._id.sale && (
                            <span className={`badge mb-2 ${getSaleTypeClass(cartItem._id.saleType)}`}>{cartItem._id.saleBadge || 'sale'}</span>
                          )}
                        </span>
                        <span className="mb-1">
                          {cartItem._id.name}
                        </span>
                        <Typography sx={{ fontWeight: '300' }}>{cartItem._id.category?.name}</Typography>
                      </div>
                    </div>

                    <div className="d-flex w-25 justify-content-between">
                      <div>x {cartItem.quantity}</div>

                      <div>
                        {cartItem._id.sale && cartItem._id.salePrice != null ? (
                          <>
                            <span className="">
                              <span className="text-strike me-2">{cartItem._id.price ?? 'Unknown'}</span>
                              {cartItem._id.salePrice}
                            </span>
                          </>
                        ) : (
                          <span>{cartItem._id.price ?? 'Unknown'}</span>
                        )}
                      </div>
                    </div>
                  </Box>
                ))}
              {order !== null && Array.isArray(order.cartItems) && order.cartItems.length > 0 && (<Box sx={{ display: 'flex', alignItems: 'end', flexDirection: 'column', fontFamily: 'Poppins, sans-serif', fontSize: '15px', fontWeight: '300' }}>
                <div className='mb-2 '>
                  <span>Subtotal </span>
                  <span className='ms-5'>AED {order.customer.totalSalePrice}</span>
                </div>
                <div className='mb-2'>
                  <span>Shipping </span>
                  <span className='ms-5'>AED {parseFloat(order.customer.deliveryFee).toFixed(0)}</span>
                </div>
                <div>
                  <span className='text-or fw-500'>Total </span>
                  <span className='ms-5 fw-500'> AED {order.customer.totalAmount}</span>
                </div>
              </Box>)}
            </Box>
          </Card>
          <Card sx={{ mt: 3, p: 3, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>

            <div className="d-flex justify-content-between align-items-center">
              <h6>Document id :</h6>

              {/* Display the error message if documentIdError is not empty */}
              {documentIdError && <Alert severity="error">{documentIdError}</Alert>}
              <TextField
                required
                id="outlined-required"
                placeholder={order.billno || 'Enter document id'}
                value={documentId}
                onChange={(e) => {

                  const inputText = e.target.value;
                  // Define a regular expression to match only digits (0-9)
                  const regex = /^[0-9]+$/;
                  if (!regex.test(inputText) || inputText.length < 5) {
                    // If the input doesn't match the regex, set an error message
                    setDocumentIdError('Enter a valid document number with minimum 5 digits (numbers only).');
                  } else {
                    // If the input is valid, clear the error message
                    setDocumentIdError('');
                  }
                  setDocumentId(inputText);




                }}

              />

            </div>
            <div className="d-flex justify-content-between align-items-center mt-4">
              <h6>Document amount :</h6>
              {/* Display the error message if documentIdError is not empty */}
              {documentAmountError && <Alert severity="error">{documentAmountError}</Alert>}


              <input type="number" className="form-control" name="price" placeholder={order.billamount || 'Enter order Amount'} value={documentAmount || ''} onChange={(e) => {
                setDocumentAmount(parseFloat(e.target.value))
              }}
                style={{ width: '180px' }} />

              {/* Display the error message if documentIdError is not empty */}
              {documentAmountValidateError && <Alert severity="error">{documentAmountValidateError}</Alert>}
            </div>


          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, boxShadow: 'rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px' }}>
            <div className="d-flex mb-2">
              <h6>Customer info</h6>
            </div>

            {order !== null &&
              Array.isArray(order.cartItems) &&
              order.cartItems.length > 0 && (
                <>
                  <div className="d-flex flex-column customer-info">
                    <p className="mb-2">{order.customer.name}</p>
                    <Link to={`tel:${order.customer.mobile}`}>{order.customer.mobile}</Link>
                    <Link to={`tel:${order.customer.email}`}>{order.customer.email}</Link>
                  </div>

                  <div className="mt-5">
                    <h6 className="mb-2">Shipping</h6>

                    <div className="d-flex flex-column customer-info">
                      <p>
                        Address : <span>Building: {order.customer.buildingname}, room: {order.customer.flatno}, {order.customer.address} {order.customer.city}, {order.customer.emirate}</span>
                      </p>

                      <p>Note: {order.customer.note}</p>
                      <p>Payment Method: {order.customer.payment}</p>
                      <p>
                        Map Link: <Link to={order.customer.maplink}>{order.customer.maplink}</Link>
                      </p>
                    </div>
                  </div>
                </>
              )}
          </Card>
        </Grid>

      </Grid>

      <Grid item xs={12} md={8}></Grid>
      <Dialog
        open={galleryOpen}
        onClose={() => {
          setGalleryOpen(!galleryOpen);
        }}>
        <img
          src={`${baseURL}/api/products/images/${selectedImage}`}
          alt=""
          width={'400px'}
        />
      </Dialog>
    </Container>
  );
};

export default OrderDetails;
