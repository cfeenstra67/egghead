import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import Layout from '../components/Layout';
import { processExtensionRequest } from '../../extension/client';
import { ServerClient } from '../../server/client';

export default function Home() {
  const [value, setValue] = useState('<calculating>');

  useEffect(() => {
    const client = new ServerClient(processExtensionRequest);

    client
      .runQuery({ query: 'SELECT 1 + 1 as test' })
      .then((response) => setValue(JSON.stringify(response)));
  });

  return (
    <Layout>
      <h1>Hello, world! {value}</h1>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/other">Other</Link></li>
      </ul>
    </Layout>
  );
}
