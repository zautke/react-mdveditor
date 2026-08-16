#!/bin/bash
# NSUserUnixTask wrapper for the sandboxed FinderSync extension.
#
# Installed by build.sh into:
#   ~/Library/Application Scripts/com.braisenly.mde.finder.OpenInMDEFinder/
# which is the sandbox-permitted location NSUserUnixTask executes from. It runs
# OUTSIDE the appex sandbox and delegates to the canonical launcher, which does
# extension filtering + talks to the MDE dev server.
exec "$HOME/.local/bin/open_in_mde" "$@"
