#!/bin/bash

##########################################################################
# A script to build the desktop app and run it
# On Windows, ensure that you have first set Git bash as the node.js shell
# npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
##########################################################################

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Get the platform
#
case "$(uname -s)" in

  Darwin)
    PLATFORM="MACOS"
 	;;

  MINGW64*)
    PLATFORM="WINDOWS"
	;;

  Linux)
    PLATFORM="LINUX"
	;;
esac

#
# Download dependencies
#
if [ ! -d 'node_modules' ]; then
  npm install
  if [ $? -ne 0 ]; then
    echo 'Problem encountered downloading dependencies'
    exit
  fi
fi

#
# Check code quality
#
npm run lint
if [ $? -ne 0 ]; then
  echo 'Code quality checks failed'
  exit
fi

#
# Build the code
#
npm run build
if [ $? -ne 0 ]; then
  echo 'Problem encountered building the desktop app'
  exit
fi

#
# Run differently depending on the platform
#
npx electron .
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi

#
# You may also need to run these commands on Linux
# https://github.com/electron/electron/issues/17972
#
# sudo chown root node_modules/electron/dist/chrome-sandbox
# sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
