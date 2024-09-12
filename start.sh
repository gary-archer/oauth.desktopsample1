#!/bin/bash

##########################################################################
# A script to build the desktop app and run it
#
# On Windows, ensure that you have first set Git bash as the node.js shell
# - npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
#
# On Ubuntu 24 you may also need to run the command from this thread:
# - https://github.com/electron/electron/issues/42510
# - sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
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

if [ ! -d 'node_modules' ]; then
  
  #
  # Download dependencies
  #
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
