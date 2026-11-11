#!/bin/bash
# Stop at the first error, so a failed build never gets deployed.
set -e

count=${#files[@]}
echo "Deploying $count files" # shows how many went out

# The URL keeps its #anchor; only a # after a space starts a comment.
url=https://example.com/docs#setup
