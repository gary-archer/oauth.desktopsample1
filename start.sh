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
# Check code quality
#
npm run lint
if [ $? -ne 0 ]; then
  echo 'Code quality checks failed'
  exit
fi

#
# Prepare the dist folder
#
rm -rf dist 2>/dev/null
mkdir dist

#
# Build the code in watch mode
#
echo 'Bulding application bundles ...'
if [ "$PLATFORM" == 'MACOS' ]; then

  open -a Terminal ./build.sh

elif [ "$PLATFORM" == 'WINDOWS' ]; then
  
  GIT_BASH="C:\Program Files\Git\git-bash.exe"
  "$GIT_BASH" -c ./build.sh &

elif [ "$PLATFORM" == 'LINUX' ]; then

  gnome-terminal -- ./build.sh
fi

#
# Wait for built bundles to become available
#
while [ ! -f ./dist/app.bundle.js ]; do
  sleep 1
done

#
# On Linux, work around this Electron issue:
# - https://github.com/electron/electron/issues/42510
#  
if [ "$PLATFORM" == 'LINUX' ]; then
  sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
fi

#
# Run the app using Electron's platform support
#
npx electron ./dist
if [ $? -ne 0 ]; then
  echo 'Problem encountered running the desktop app'
  exit
fi
