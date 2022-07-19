################
Egghead
################

`Read documentation here <https://docs.egghead.camfeenstra.com>`_

Introduction
#################

.. image:: https://docs.egghead.camfeenstra.com/_static/screenshot.png
   :alt: Egghead Screenshot
   :width: 600px
   :align: center

Egghead is a browser history replacement that aims to let you actually make use of your browser history. The default history app in Chrome is woefully underdeveloped, and it doesn't allow you to answer basic questions about what you actually did in the past. For example--very commonly I found myself searching for something on Google, finding the answer, then wanting to go find that answer again to refresh my memory later. Chrome's search may allow you to find the google search itself, but it offers no way of actually figuring out what where you went from there. Also, it doesn't allow you to perform any sort of advanced searching other than a simple text query.

Egghead offers a faceted search engine that allows you to narrow things down to your heart's desire. I built egghead after years of my own frustration with the default Chrome history, and I've personally found it quite useful so far. I hope you do too.

Technical Specs
##################

Egghead is written entirely in Typescript and uses SQLite as its back end, and specifically it heavily relies on SQLite's FTS5 module for searching.

It's distributed as a browser extension; hopefully it will be available via browser extension stores soon.

A live demo of the app is also available at `egghead.camfeenstra.com <https://egghead.camfeenstra.com>`_.

.. ### Generate Migration

.. ```bash
.. $ npm run typeorm migration:generate -- -d ./local-db.ts src/migrations/my-migration-name
.. ```

.. Also need to manually add it to `migrations` array in `migrations/index.ts`

.. ### Run Migrations

.. ```bash
.. npm run typeorm migration:run -- -d ./local-db.ts
.. ```
