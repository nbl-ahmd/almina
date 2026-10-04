import React, { useEffect, useState } from 'react';
import axios from 'axios';
import baseURL from '../../axiosConfig';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Productskeleton from '../components/Productskeleton';
import Breadcrumbs from '../components/Breadcrumbs';
import BackToTopButton from '../components/BackToTopButton';
import { CustomHelmet } from '../components/CustomHelmet';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const [products, setProducts] = useState([]);
  const [catname, setCatname] = useState('');
  const [pagination, setPagination] = useState({ categoryId, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [retry, setRetry] = useState(0);
  const offset = pagination.categoryId === categoryId ? pagination.offset : 0;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    if (offset === 0) { setProducts([]); setCatname(''); }
    const category = offset === 0 ? axios.get(`${baseURL}/api/category/${categoryId}`, { signal: controller.signal }) : Promise.resolve(null);
    const catalog = axios.get(`${baseURL}/api/products`, { signal: controller.signal, params: {
      filter: JSON.stringify({ category: categoryId, disabled: false }), disabledCat: false, limit: 30, offset,
    } });
    Promise.all([category, catalog]).then(([categoryResult, result]) => {
      if (controller.signal.aborted) return;
      if (categoryResult) setCatname(categoryResult.data.name);
      setProducts(previous => offset === 0 ? result.data : [...previous, ...result.data.filter(item => !previous.some(old => old._id === item._id))]);
      setHasNext(result.data.length === 30 && offset + 30 <= 10000);
    }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [categoryId, offset, retry]);


  return (
<>
<CustomHelmet 
    title ={catname}
    description = {`Browse ${catname || "category"} products at Al Mina Pharmacy. Review product details and current AED prices.`}
    url = {`https://www.alminapharmacy.com/categories/${categoryId}`}
    image = {`${baseURL}/api/category/images/${products?.[0]?.category?.image || ''}`}
    />
    <section className='container h-100'>
    <Breadcrumbs catname = {catname} />
    <div className="title pt-1 px-4 mb-4">
        <h6>{catname}</h6>
      </div>
      <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 mt-3">

      {loading && products.length === 0 && Array.from({ length: 10 }).map((_, index) => (
        <Productskeleton key={index} />
      ))}
      {products.length > 0 ? (
      <>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
      </>): (
          !loading && !error ? <p>No products found in this category.</p> : null
        )}
    </div>
    {error ? <div role="alert"><p>Products could not be loaded.</p><button type="button" className="btn btn-outline-secondary" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : null}
    {loading ? <p role="status">Loading products…</p> : null}
    {!loading && !error && hasNext ? <button type="button" className="btn btn-outline-secondary" onClick={() => setPagination({ categoryId, offset: offset + 30 })}>Load more products</button> : null}
    <BackToTopButton />
  </section>

</>
  


  );
};

export default CategoryPage;
