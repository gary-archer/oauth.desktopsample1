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

#
# Download dependencies
#
npm install
if [ $? -ne 0 ]; then
  echo 'Problem encountered downloading dependencies'
  exit
fi

#
# Copy deployable assets that are not Javascript bundles
#
if [ -d 'dist' ]; then
  rm -rf dist
fi
mkdir dist
cp index.html desktop.config.json *.css package.json src/preload.js dist

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
# On Linux, work around this Electron issue:
# - https://github.com/electron/electron/issues/42510
#  
if [ "$PLATFORM" == 'LINUX' ]; then
  sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
fi

#
# Run differently depending on the platform
#
npx electron ./dist
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi
