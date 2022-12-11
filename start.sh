#!/bin/bash

##############################################
# A script to build the desktop app and run it
##############################################

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
if [ "$PLATFORM" == 'WINDOWS' ]; then
  node_modules/.bin/electron.cmd .
else
  node_modules/.bin/electron .
fi
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi
