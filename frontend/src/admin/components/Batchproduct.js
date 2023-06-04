import React, { useState } from "react";
import axios from "axios";
import baseUrl from '../../axiosConfig';

const UploadCSV = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      await axios.post(`${baseUrl}/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // File uploaded successfully
      console.log("File uploaded successfully");
    } catch (error) {
      // Error uploading file
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div>
      <h2>Upload CSV File</h2>
      <input type="file" name="file" accept=".csv" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file}>
        Upload
      </button>
    </div>
  );
};

export default UploadCSV;
