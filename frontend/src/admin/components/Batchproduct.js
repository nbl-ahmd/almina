import React, { useState } from "react";
import axios from "axios";
import baseUrl from '../../axiosConfig';

const UploadCSV = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    try {
      setUploadStatus("Uploading...");

      const formData = new FormData();
      formData.append("file", file);

      await axios.post(`${baseUrl}/api/batch`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // File uploaded successfully
      setUploadStatus("Uploaded");
      console.log("File uploaded successfully");
    } catch (error) {
      // Error uploading file
      setUploadStatus("Upload Failed");
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Upload CSV File</h2>
      <div className="card p-2 border-0 shadow-sm mt-3">
      <div>
      
      <input type="file" name="file" accept=".csv" onChange={handleFileChange} />
      <button className="btn btn-p" onClick={handleUpload} disabled={!file}>
        Upload
      </button>
      
    </div>
      </div>
      <div className="mt-3">
      {uploadStatus && <p className="text-pg">{uploadStatus}</p>}
      </div>
    </div>
  );
};

export default UploadCSV;
