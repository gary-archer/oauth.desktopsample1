#!/bin/bash

##############################
# Build the code in watch mode
##############################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Build the main side of the app
#
echo 'Building main code ...'
NODE_OPTIONS='--import tsx' npx webpack --config webpack/main.config.ts
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the main code'
  read -n 1
  exit 1
fi

#
# Build the renderer side of the app in watch mode
#
echo
echo 'Building renderer code in watch mode ...'
NODE_OPTIONS='--import tsx' npx webpack --config webpack/renderer.config.ts --watch
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the renderer code'
  read -n 1
  exit 1
fi
