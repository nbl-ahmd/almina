import React, { useState, useEffect, useRef, useContext } from 'react';
import { CartContext } from '../../context/cartcontext';
import { Link, useParams } from 'react-router-dom';
import baseURL, { apiFetch } from '../../axiosConfig';
import BackToTopButton from '../components/BackToTopButton';
import { CustomHelmet } from '../components/CustomHelmet';
import ProductCard from '../components/ProductCard';

const ProductDetails = () => {
  const { addToCart } = useContext(CartContext);
  const { id } = useParams(); // Get the product ID from the URL
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const zoomContainerRef = useRef(null);
  const zoomImageRef = useRef(null);
  const zoomBoxRef = useRef(null);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await apiFetch(`${baseURL}/api/products/details/${id}`);
        const data = await response.json();
        console.log('hreee data got', data.product)
        setProduct(data.product);
        setRelatedProducts(data.relatedProducts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product details:', error);
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!product) {
    return <div>Product not found.</div>;
  }

  const handleAddToCart = () => {
    addToCart(product, quantity); // Pass the selected quantity
  };

  const handleMouseEnter = () => {
    const zoomBox = zoomBoxRef.current;
    if (zoomBox) {
      zoomBox.style.display = 'block';
    }
  };

  const handleMouseMove = (e) => {
    const zoomContainer = zoomContainerRef.current;
    const zoomImage = zoomImageRef.current;
    const zoomBox = zoomBoxRef.current;

    if (zoomContainer && zoomImage && zoomBox) {
      const containerRect = zoomContainer.getBoundingClientRect();
      const offsetX = e.pageX - containerRect.left;
      const offsetY = e.pageY - containerRect.top;

      const xPercent = (offsetX / zoomContainer.offsetWidth) * 100;
      const yPercent = (offsetY / zoomContainer.offsetHeight) * 100;

      const x = (xPercent * (zoomImage.offsetWidth - zoomContainer.offsetWidth)) / 100;
      const y = (yPercent * (zoomImage.offsetHeight - zoomContainer.offsetHeight)) / 100;

      zoomBox.style.left = `${offsetX - zoomBox.offsetWidth / 2}px`;
      zoomBox.style.top = `${offsetY - zoomBox.offsetHeight / 2}px`;

      zoomImage.style.transform = `translate(-${x}px, -${y}px) scale(1.5)`;
    }
  };

  const handleMouseLeave = () => {
    const zoomBox = zoomBoxRef.current;
    const zoomImage = zoomImageRef.current;
    if (zoomBox && zoomImage) {
      zoomBox.style.display = 'none';
      zoomImage.style.transform = 'scale(1)';
    }
  };

  const handleThumbnailClick = (image) => {
    zoomImageRef.current.src = `${baseURL}/api/products/images/${image}`;
  };

  const getSaleTypeClass = (saleType) => {
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
  };

  return (
    <>
      <CustomHelmet
        title={product.name}
        description={product.description}
        url={`${baseURL}/products/${product._id}`}
        image={`${baseURL}/api/products/images/${product.images[0]}`}
      />
      <main>
        <div className="container py-4">
          <div className="row">
            {/* Image Section */}
            <div className="col-md-6 text-center">
              <div
                className="zoom-container card shadow-sm border-0"
                ref={zoomContainerRef}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ borderRadius: '10px', overflow: 'hidden' }}
              >
                <img
                  ref={zoomImageRef}
                  src={
                    product.images && product.images[0] // Check if `product.images` exists and has at least one image
                      ? `${baseURL}/api/products/images/${product.images[0]}`
                      : `${baseURL}/api/products/images/${product.image}` // Fallback to `product.image`
                  }
                  alt={product.images && product.images[0] ? product.images[0] : product.image}
                  className="img-fluid zoom-image"
                />

                <div
                  ref={zoomBoxRef}
                  className="zoom-box"
                  style={{
                    position: 'absolute',
                    display: 'none',
                    width: '100px',
                    height: '100px',
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                ></div>
              </div>

              {/* Thumbnails */}
              <div className="image-thumbnails mt-3 d-flex justify-content-center flex-wrap gap-2">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={`${baseURL}/api/products/images/${image}`}
                    alt={`Thumbnail ${index + 1}`}
                    className="img-thumbnail mx-1"
                    style={{
                      width: '80px',
                      height: '80px',
                      cursor: 'pointer',
                      objectFit: 'cover',
                    }}
                    onClick={() => handleThumbnailClick(image)}
                  />
                ))}
              </div>
            </div>

            {/* Product Info Section */}
            <div className="col-md-6">
              <h5 className="fw-bold">{product.name}</h5>
              <Link
                to={`/categories/${product.category._id}`}
                className="text-pb fw-300 text-sm d-block mb-2"
              >
                {product.category.name}
              </Link>

              <div className="mb-3">
                {product.salePrice ? (
                  <>
                    <span className="product-price me-2">AED {product.salePrice}</span>
                    <span className="text-strike text-small">AED {product.price}</span>
                    <span className={`badge ms-2 ${getSaleTypeClass(product.saleType)}`}>
                      {product.saleBadge}
                    </span>
                  </>
                ) : (
                  <span className="product-price">AED {product.price}</span>
                )}
              </div>

              {product.stock > 0 ? (
                <>
                  <div className="d-flex align-items-center mb-3">
                    <label htmlFor="quantity" className="me-3">
                      Quantity:
                    </label>
                    <div className="d-flex align-items-center border rounded">
                      <button
                        className="btn btn-sm btn-light border-end"
                        onClick={() => setQuantity((prev) => Math.max(prev - 1, 1))}
                      >
                        <i className="bi bi-dash"></i>
                      </button>
                      <input
                        id="quantity"
                        type="text"
                        value={quantity}
                        readOnly
                        className="form-control text-center border-0"
                        style={{ width: '50px' }}
                      />
                      <button
                        className="btn btn-sm btn-light border-start"
                        onClick={() => setQuantity((prev) => prev + 1)}
                      >
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleAddToCart}
                  >
                    Add to Cart
                  </button>
                </>
              ) : (
                <span className="text-danger">Out of Stock</span>
              )}

              <div className="mt-4">
                <h6 className="fw-bold">Product Description</h6>
                <p>{product.description}</p>
              </div>
            </div>
          </div>

          {/* Related Products */}
          <div className="title pt-2 px-4">
            <h5>Similar Products</h5>
          </div>
          <div className="container mb-5">
            <div className="row row-cols-auto row-cols-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-5 mt-3 px-2 mb-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct._id} product={relatedProduct} />
              ))}
            </div>
          </div>
        </div>
        <BackToTopButton />
      </main>
    </>
  );
};

export default ProductDetails;
