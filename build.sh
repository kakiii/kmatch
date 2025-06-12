#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define the name of the extension and the output zip file.
EXTENSION_NAME="kmatch-firefox"
ZIP_FILE="${EXTENSION_NAME}.zip"
DIST_DIR="dist"

# Create the distribution directory if it doesn't exist.
mkdir -p "$DIST_DIR"

# Full path for the zip file.
FULL_ZIP_PATH="$DIST_DIR/$ZIP_FILE"

# Remove the old zip file if it exists.
rm -f "$FULL_ZIP_PATH"

# Create the zip archive with all the necessary files.
zip "$FULL_ZIP_PATH" \
  manifest.json \
  background.js \
  content.js \
  popup.js \
  popup.html \
  popup.css \
  welcome.html \
  welcome.css \
  confetti.js \
  icon16.png \
  icon32.png \
  icon48.png \
  icon128.png \
  sponsors.json \
  LICENSE \
  README.md

echo "✅ Extension packaged successfully into $FULL_ZIP_PATH" 