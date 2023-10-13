import React, { useEffect, useState } from 'react'
import { Link, useResolvedPath } from 'react-router-dom'; // Import useResolvedPath

const Breadcrumbs = ({catname}) => {
    const resolvedPath = useResolvedPath().pathname; // Use useResolvedPath to get the resolved pathname

    
     // Dynamically generate the breadcrumb based on the resolved pathname
  const getBreadcrumbItems = () => {
    const parts = resolvedPath.split('/').filter((part) => part);
    let path = '';
    return parts.map((part, index) => {
      path += `/${part}`;
      if (index === parts.length - 1) {
        return (
          <li className="breadcrumb-item active" aria-current="page" key={index}>
            {catname ? catname : part}
          </li>
        );
      }
      return (
        <li className="breadcrumb-item" key={index}>
          <Link to={path}>{part}</Link>
        </li>
      );
    });
  };

  return (
   <div className="container pt-3 px-4">
     <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to={'/'}>Home</Link>
          </li>
          {getBreadcrumbItems()}
        </ol>
      </nav>
   </div>

  )
}

export default Breadcrumbs
