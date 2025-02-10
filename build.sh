#!/usr/bin/env bash

set -eo pipefail

# Set up demo data if it doesn't exist
mkdir -p data/demo

if [[ ! -f data/demo/demo.db ]]; then
    curl -L --fail https://egghead.camfeenstra.com/demo.db -o data/demo/demo.db
fi

if [[ ! -f data/demo/demo-small.db ]]; then
    curl -L --fail https://egghead.camfeenstra.com/demo-small.db -o data/demo/demo-small.db
fi

rm -rf dist

pnpm webpack --config-name demo

make html

for config in chrome firefox firefox-mv2; do
    pnpm webpack --config-name $config
    zip -rj dist/$config.zip dist/$config
done
