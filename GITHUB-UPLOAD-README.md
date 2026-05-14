# Bibmaxxing GitHub Upload Folder

This folder is the public-safe source tree for Bibmaxxing.

## Upload

1. Create a new GitHub repository.
2. Upload the contents of this folder, not the parent `dist/` folder.
3. Keep local reference PDFs out of the repository. This folder includes only `references/MANIFEST.json` files.

## Run after cloning

```sh
npm run serve
```

No `npm install` is required; the web app and scripts use Node's standard library.

## One-click Windows deploy

Double-click `Deploy Bibmaxxing.bat` to build, test, package, and create `dist/bibmaxxing-portable-<version>/Run Bibmaxxing.bat`.

The portable runner opens the app in a browser. Use the in-app **Exit** button to close the local server.
