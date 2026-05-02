import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './styles.css';
import { inicializarRegistroSw } from './pwaRegister';

inicializarRegistroSw();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
