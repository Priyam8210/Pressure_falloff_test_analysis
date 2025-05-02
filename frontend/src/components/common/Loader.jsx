import React from "react";

const Loader = ({ message = "Loading..." }) => {
  return (
    <div className="loader">
      <div className="loader-spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default Loader;
