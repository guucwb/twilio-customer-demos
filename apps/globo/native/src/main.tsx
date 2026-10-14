import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import App from './App';
import Presentation from './Presentation';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{new URLSearchParams(location.search).get('presentation')==='1'?<Presentation/>:<App/>}</React.StrictMode>);
