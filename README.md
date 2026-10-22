# Snail Girl Folktale - GitHub Pages release

This folder contains the already-built website, models, embedded textures,
Draco decoders, shared styles and all three reading pages. No npm build is
needed on GitHub. This is the release package, not the development source.

1. Extract the ZIP.
2. Upload the CONTENTS to the root of the Snail_Girl_Folktale repository.
   index.html, assets/, models/, draco/ and readings/ must be at repository root.
   Replace the old index.html. Do not upload only the ZIP or wrap these files
   in an additional folder.
3. For branch-based Pages publishing, select the branch containing these files
   and /(root) as the publishing folder in repository Settings > Pages.
4. After GitHub finishes deployment, visit:
   https://sofiajiayihuang.github.io/Snail_Girl_Folktale/

Do not double-click index.html to run the 3D website through file://.
For a local preview, serve this folder over HTTP, for example:
   python3 -m http.server 8000
Then visit http://localhost:8000/.

Keep every release file together. The .nojekyll file is included.
