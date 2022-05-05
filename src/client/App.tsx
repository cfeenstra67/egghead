import { useState, useEffect } from 'react';
import { processExtensionRequest } from '../page-client';
import { ServerClient } from '../server/client';

export default function App() {
  const [value, setValue] = useState('<calculating>');

  useEffect(() => {
    const client = new ServerClient(processExtensionRequest);

    client
      .runQuery({ query: 'SELECT 1 + 1 as test' })
      .then((response) => setValue(JSON.stringify(response)));
  });

  return <h1>Hello, world! {value}</h1>;
}
