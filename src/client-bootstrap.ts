import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './client/App';

const body = document.querySelector('body') as Element;
const root = ReactDOM.createRoot(body);
root.render(React.createElement(App));
