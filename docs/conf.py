import json
import os
# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
# import os
# import sys
# sys.path.insert(0, os.path.abspath('.'))


# -- Project information -----------------------------------------------------
root_dir = os.path.join(os.path.dirname(__file__), "..")

with open(os.path.join(root_dir, "package.json")) as f:
    package_json = json.load(f)

project = 'Egghead'
copyright = '2023, Cam Feenstra'
author = 'Cam Feenstra'

# The full version, including alpha/beta/rc tags
release = package_json["version"]

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
]

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = []


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#
html_theme = "sphinxawesome_theme"
# html_theme = 'sphinx_material'

# html_theme_options = {
#     "nav_title": project,
#     "base_url": "https://docs.egghead.camfeenstra.com",
#     "color_primary": "blue",
#     "color_accent": "light-blue",
#     "repo_url": "https://github.com/cfeenstra67/egghead",
#     "repo_name": project,
#     # "globaltoc_depth": 3,
#     # "globaltoc_collapse": False,
#     # "globaltoc_includehidden": False,
# }

# html_sidebars = {
#     "**": ["globaltoc.html"]
# }

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']

html_css_files = ["custom.css"]
