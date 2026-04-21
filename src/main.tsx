import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import App from './App';
import './styles.css';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

updateSW = registerSW({
  onNeedRefresh() {
    if (
      window.confirm(
        'Há uma nova versão do app. Recarregar agora para atualizar?',
      )
    ) {
      void updateSW?.(true);
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
