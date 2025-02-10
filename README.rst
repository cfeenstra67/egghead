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

It's distributed as a browser extension; check the top of the README for links to install it on the Chrome web store (which also works for any chrome-compatible browser such as Brave and Edge) or the Firefox add-on store.

A live demo of the app is also available at `egghead.camfeenstra.com <https://egghead.camfeenstra.com>`_. This demo will allow you to perform searches against a demo database, but in order to see the real power of egghead you'll have to use it as an extension.

Development
#######################

Check out the `development documentation <https://docs.egghead.camfeenstra.com/development.html>`_ for information on how to build and develop the extension for different targets.

Contact
#########

If you have problems using this extension, please open an issue or reach out to me at `cameron.l.feenstra@gmail.com <cameron.l.feenstra@gmail.com>`_ for help.
