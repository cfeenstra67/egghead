##############
Development
##############

If you want to add additional features or fix bugs in Egghead, contributions are welcome! You can raise an issue on Github or submit a PR, and I will get back to you promptly. The instructions here should provide all you need to get up and running.

Getting Started
###################

In order to develop the application, the first thing you need to do is install the dependencies. Run the following command at the project root to install all of the Javascript dependencies.

.. code-block:: bash

   $ pnpm install

You also need to compile the ``ohm-js`` grammar definition in order for the rest of the app to build. You only need to do this once unless you edit the `query-string.ohm <https://github.com/cfeenstra67/egghead/blob/main/src/server/query-string.ohm>`_ file:

.. code-block:: bash

   $ pnpm ohm-generate

This is all of the setup needed to be able to develop the app. The app is built using ``webpack``, and there are a number of different configurations you can use:

* ``chrome`` - the full extension, ready to be loaded into Chrome.

  * development command - ``pnpm webpack --config-name chrome --watch``

  * build command - ``pnpm webpack --config-name chrome``

* ``firefox`` - the full extension, ready to be loaded into firefox

  * development command - ``pnpm webpack --config-name firefox --watch``

  * build command - ``pnpm webpack --config-name firefox``

* ``firefox-mv2`` - the full extension, ready to be loaded into firefox using w/ manifest v2 (this was created because the Firefox add-on store isn't accepting manifest v3 extensions yet, though it still hasn't been submitted there due to other issues).

  * development command - ``pnpm webpack --config-name firefox --watch``

  * build command - ``pnpm webpack --config-name firefox``

* ``chrome-dev`` - the full extension ready to be loaded into chrome w/ development mode enabled. This enabled the "dev mode" option in settings by default and enables debug logging.

  * development command - ``pnpm webpack --config-name chrome-dev --watch``

  * build command - ``pnpm webpack --config-name chrome-dev``

* ``dev`` - a web version of the extension history page for local development.

  * development command - ``pnpm webpack serve --config-name dev --no-client-overlay``. You can access the app at ``http://localhost:8080/history.html``

  * build command - ``pnpm webpack --config-name dev``. You can then access the app by opening the ``dist/dev/history.html`` file in your browser.

  * **Important**: you need a database file to load into the dev version of the app; it should be located at ``./data/dev/dev.db``. You can use the following one-liner to download the demo database used on `the demo site`_:

.. code-block:: bash

   $ mkdir -p data/dev && curl https://egghead.camfeenstra.com/demo.db -o data/dev/dev.db

* ``demo`` - a slightly modified version of the ``dev`` app that includes a wrapper for choosing which demo database to download before loading the actual app. This is what's hosted at `egghead.camfeenstra.com <https://egghead.camfeenstra.com>`_.

  * development command - ``pnpm webpack serve --config-name demo --no-client-overlay``. You can access the app at ``http://localhost:8080/history.html``.
  
  * build command - ``pnpm webpack --config-name demo``. You can then access the app by opening the ``dist/demo/history.html`` file in your browser.

  * **Important**: you need a full sized and smaller database file to load into the demo version of the app; they should be located at ``./data/demo/{demo,demo-small}.db``. You can use the following one-liner to download the demo databases used on `the demo site`_:

.. code-block:: bash

   $ mkdir -p data/demo && curl https://egghead.camfeenstra.com/demo.db -o data/demo/demo.db && curl https://egghead.camfeenstra.com/demo-small.db -o data/demo/demo-small.db

For local development, generally running the ``dev`` configuration makes the most sense.

To build all production assets (the ``chrome``, ``firefox``, ``firefox-mv2``, and ``demo`` configurations), simply run ``npm run build``.

Documentation
##################

The documentation is built using Sphinx. As this comes from the world of Python and uses Python to run, you'll need Python in order to build the documentation. Also, you'll need to `install uv <https://docs.astral.sh/uv/getting-started/installation/>`.

Once you have `uv` installed, you can install the Python dependencies by running:

.. code-block:: bash

   $ uv sync

You can then edit the documentation pages found in the `docs <https://github.com/cfeenstra67/egghead/tree/main/docs>`_ directory of the project. To generate the documentation, run:

.. code-block:: bash

   $ make html

The documentation site can be found in ``dist/docs/html``. On a Mac, you can open the docs with the following command:

.. code-block:: bash

   $ open dist/docs/html/index.html

.. _the demo site: https://egghead.camfeenstra.com

Release Flow
###############

To create a new release:

1. Determine the new version number; this should be either bumping the major, minor, or patch version of the app. The type of version bump will depend on the changes, see the `semver <https://semver.org/spec/v2.0.0.html>`_ spec for guidance.

2. Update the ``version`` fields of ``package.json``, ``manifests/base.json``, and ``pyproject.toml`` with the new version.

3. Update the changelog to include descriptions of all changes, move anything from the "Unreleased" section to the section for the new version number.

4. Commit the changes.

5. Create a new tag with ``git tag v<version>``, e.g. ``git tag v1.0.3``.

6. Push the tag to the github repo with ``git push v<version>``. This will create a new release via a Github Actions workflow.

7. Download the ``chrome.zip`` and ``firefox-mv2.zip`` zip files and manually upload them to the chrome and firefox web store respectively. (Be sure to use ``firefox-mv2.zip`` and not ``firefox.zip``; firefox still supports manifest version 2 and it doesn't seem possible to use WASM w/ manifest version 3 on firefox last time I tested it).
