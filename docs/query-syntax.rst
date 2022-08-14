Query Syntax
==============

Egghead offers a powerful query syntax that aims to let you find *exactly* what you're looking for in your history. It can handle anything from basic keyword queries to complex boolean clauses with parentheses, ``AND``, ``OR``, and ``NOT``. You can also filter by specific fields.

The easiest way to explain the query syntax is by way of example. To search for one or more specific keywords, you can simply enter them. They can either be surrounded by double quotes or not, up to you.

.. code-block::
   
   google "mysearch"

This is the same as combining the terms with ``AND`` (case insensitive), like so:

.. code-block::

   google and mysearch

You can also put this whole expression in parentheses, or put each term in parentheses, and both will once again have the same effect:

.. code-block::

   (google and mysearch)

.. code-block::

   (google) and (mysearch)

Where it gets interesting is when you start to include ``OR`` and ``NOT`` as well; you can create any sort of condition that you might want using these constructs, for example:

.. code-block::

   not (google mysearch) or (twitter and not (home or latest))

You can also include queries for specific fields. The "session" fields that are available to query are:

* ``startedAt`` - timestamp when the session initially started, meaning when the page was first loaded.

* ``endedAt`` - timestamp when the session ended, meaningi when the tab and/or window was closed. **Tip:** ``endedAt:null`` or ``endedAt:ne:null`` will allow you to filter down the results to only active sessions or vice versa.

* ``title`` - The last seen title on the web page.

* ``url`` - The cleaned URL of the session. This does not include hash or query parameters.

* ``rawUrl`` - The full, raw URL of the session. This includes all hash and query parameters.

* ``host`` - the host value of the ``url``, for example ``www.google.com``.

You can include queries for specific fields with the syntax ``<field>:[<operator>:]<value>``. ``operator`` can either be omitted or one of:

* ``eq`` - Equals

* ``ne`` - Does not equal

* ``gt`` - Greater than

* ``ge`` - Greater than or equal to

* ``lt`` - Less than

* ``le`` - Less than or equal to

Some examples:

.. code-block::

   (host:google and startedAt:lt:7/1/2022) mysearch

.. code-block::

   title:twitter NOT url:twitter startedAt:gt:"2022-07-01 12:00"

The full query syntax is defined using a parsing library called `ohm <https://www.npmjs.com/package/ohm-js>`_, and the full syntax definition can be found `here <https://github.com/cfeenstra67/egghead/blob/main/src/server/query-string.ohm>`_. If you're familiar with grammars and parsers, this may be the right way to familiarize with the syntax.

There are also a set of `unit tests <https://github.com/cfeenstra67/egghead/blob/main/test/search.spec.ts>`_ where you can find examples of queries. If you come across a query that causes an error or doesn't behave how you expect, feel free to raise an issue on Github and I can add a test case if the behavior you're experiencing isn't covered.
