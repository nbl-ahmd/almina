import { useEffect, useState } from 'react';

const useLazyLoad = (loadMoreCallback, limit, offset, threshold = 0) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        setIsLoading(true);
        loadMoreCallback(limit, offset)
          .then(() => setIsLoading(false))
          .catch((error) => {
            console.log(error);
            setIsLoading(false);
          });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loadMoreCallback, limit, offset, threshold]);

  return isLoading;
};

export default useLazyLoad;
