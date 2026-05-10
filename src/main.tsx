import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './styles.css';
import { inicializarRegistroSw } from './pwaRegister';

document.title = 'Estudo de Questões';

inicializarRegistroSw();

function routerBasename(): string | undefined {
  const raw = import.meta.env.BASE_URL;
  if (raw === '/') {
    return undefined;
  }
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
