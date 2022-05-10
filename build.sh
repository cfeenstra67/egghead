#!/bin/bash
set -eo pipefail

rm -rf dist

cp -r public dist

npx webpack --config-name extension
