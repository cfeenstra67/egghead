import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

const body = document.getElementById('body') as Element;
const root = ReactDOM.createRoot(body);
root.render(<App />);
