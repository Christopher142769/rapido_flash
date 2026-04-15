import React from 'react';
import './PageLoader.css';

const PageLoader = ({ message = 'Chargement...' }) => {
  return (
    <div className="page-loader">
      <div className="page-loader-content">
        <div className="page-loader-wrap" aria-label="Chargement">
          <div className="page-loader-ring" />
          <div className="page-loader-ring page-loader-ring--inner" />
          <div className="page-loader-orbit">
            <span className="page-loader-dot" />
          </div>
          <div className="page-loader-logo-container">
            <img
              src="/images/logo.png"
              alt="Rapido Logo"
              className="page-loader-logo"
            />
          </div>
        </div>
        {message && <p className="page-loader-message">{message}</p>}
      </div>
    </div>
  );
};

export default PageLoader;
