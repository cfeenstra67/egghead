##############
Development
##############

If you want to add additional features or fix bugs in Egghead, contributions are welcome! You can raise an issue on Github or submit a PR, and I will get back to you promptly. The instructions here should provide all you need to get up and running.

Getting Started
###################

In order to develop the application, the first thing you need to do is install the dependencies. Run the following command at the project root to install all of the Javascript dependencies.

.. code-block:: bash

   $ yarn install

You also need to compile the ``ohm-js`` grammar definition in order for the rest of the app to build. You only need to do this once unless you edit the `query-string.ohm <https://github.com/cfeenstra67/egghead/blob/main/src/server/query-string.ohm>`_ file:

.. code-block:: bash

   $ npm run ohm-generate

This is all of the setup needed to be able to develop the app. The app is built using ``webpack``, and there are three different configurations you can use:

* ``prod`` - the full extension, ready to be loaded into Chrome.

  * development command - ``npx webpack --config-name prod --watch``

  * build command - ``npx webpack --config-name prod``

* ``dev`` - a web version of the extension history page for local development.

  * development command - ``npx webpack serve --config-name dev --no-client-overlay``. You can access the app at ``http://localhost:8080/history.html``

  * build command - ``npx webpack --config-name dev``. You can then access the app by opening the ``dist/dev/history.html`` file in your browser.

  * **Important**: you need a database file to load into the dev version of the app; it should be located at ``./data/dev/dev.db``. You can use the following one-liner to download the demo database used on `the demo site`_:

.. code-block:: bash

   $ mkdir -p data/dev && curl https://egghead.camfeenstra.com/demo.db -o data/dev/dev.db

* ``demo`` - a slightly modified version of the ``dev`` app that includes a wrapper for choosing which demo database to download before loading the actual app. This is what's hosted at `egghead.camfeenstra.com <https://egghead.camfeenstra.com>`_.

  * development command - ``npx webpack server --config-name demo --no-client-overlay``. You can access the app at ``http://localhost:8080/history.html``.
  
  * build command - ``npx webpack --config-name demo``. You can then access the app by opening the ``dist/demo/history.html`` file in your browser.

  * **Important**: you need a full sized and smaller database file to load into the demo version of the app; they should be located at ``./data/demo/{demo,demo-small}.db``. You can use the following one-liner to download the demo databases used on `the demo site`_:

.. code-block:: bash

   $ mkdir -p data/demo && curl https://egghead.camfeenstra.com/demo.db -o data/demo/demo.db && curl https://egghead.camfeenstra.com/demo-small.db -o data/demo/demo-small.db

For local development, generally running the ``dev`` configuration makes the most sense.

Documentation
##################

The documentation is built using Sphinx. As this comes from the world of Python and uses Python to run, you'll need Python in order to build the documentation. Specifically, you'll need to install Poetry. The documentation & installation instructions for Poetry can be found `here <https://python-poetry.org/docs/>`_. 

Once you have poetry installed, you can install the Python dependencies by running:

.. code-block:: bash

   $ poetry install

You can then edit the documentation pages found in the `docs <https://github.com/cfeenstra67/egghead/tree/main/docs>`_ directory of the project. To generate the documentation, run:

.. code-block:: bash

   $ make html

The documentation site can be found in ``dist/docs/html``. On a Mac, you can open the docs with the following command:

.. code-block:: bash

   $ open dist/docs/html/index.html

.. _the demo site: https://egghead.camfeenstra.com
