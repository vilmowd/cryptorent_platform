import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.js'; // <-- ADD THE .js EXTENSION HERE

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);