################
Egghead
################

.. raw:: html

    <table>
      <tr>
         <th align="center" width="500px">
            <a
               href="https://chrome.google.com/webstore/detail/egghead-history/gnbambehlmjiemgkmekipjgooacicknb"
               target="_blank"
            >
               <img src="/public/chrome-badge.png" />
            </a>
         </th>
         <th align="center" width="500px">
            <a
               href="https://addons.mozilla.org/en-US/firefox/addon/egghead-history/"
               target="_blank"
            >
               <img src="/public/firefox-badge.png" />
            </a>
         </th>
      </tr>
    </table>

`Live Demo <https://egghead.camfeenstra.com>`_

`Read documentation here <https://docs.egghead.camfeenstra.com>`_

Introduction
#################

.. raw:: html
    
   <p align="center">
     <img src="https://docs.egghead.camfeenstra.com/_static/screenshot.png" width="600px" alt="Egghead Screenshot" >
   </p>

**Egghead** is a browser history replacement that aims to let you actually make use of your browser history.

I personally haven't found the default history app in Chrome to be very useful, and I've struggled to answer basic questions I have about pages I've visited in the past. For example--very commonly I found myself searching for something on Google, finding the answer, then wanting to go find that answer again to refresh my memory later. Chrome's search may allow you to find the google search itself, but it offers no way of actually figuring out what where you went from there. Also, it doesn't allow you to perform any sort of advanced searching other than a simple text query.

Egghead offers a faceted search engine that allows you to narrow things down to your heart's desire. I built egghead after years of my own frustration with the default Chrome history, and I've personally found it quite useful so far. I hope you do too.

Technical Specs
##################

Egghead is written entirely in Typescript and uses SQLite as its back end, and specifically it heavily relies on SQLite's FTS5 module for searching.

It's distributed as a browser extension; hopefully it will be available via browser extension stores soon.

A live demo of the app is also available at `egghead.camfeenstra.com <https://egghead.camfeenstra.com>`_. This demo will allow you to perform searches against a demo database, but in order to see the real power of egghead you'll have to use it as an extension.

Building the Extension
#######################

In order to build the extension for use in your browser, first clone the repository. From the repo root, run ``yarn install`` to install dependencies.

Once that's done, run ``npm run ohm-generate && npx webpack --config-name chrome`` to build the extension. The final output will be found in the ``dist/chrome`` directory relative to the repostiory root. You can find instructions on how to load this directory as an extension into your browser manually `here <https://developer.chrome.com/docs/extensions/mv3/getstarted/>`_.

Contact
#########

If you have problems using this repository, please open an issue or reach out to me at `cameron.l.feenstra@gmail.com <cameron.l.feenstra@gmail.com>`_ for help.

License
#########

Egghead is licensed under GPL v3.

.. code-block::

   Copyright (C) 2022 Cameron Feenstra
 
   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.
 
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
 
   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <https://www.gnu.org/licenses/>.
