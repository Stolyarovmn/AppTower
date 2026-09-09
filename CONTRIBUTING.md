# Contributing

Use a feature or fix branch and open a pull request to `main`. Release candidates
are created from `release/X.Y.Z` and tagged `vX.Y.Z` only after the CI checks and
browser verification are complete.

Run `npm ci --ignore-scripts` and `npm test` in `extension/` before a pull
request. Never add signing keys, packed `.crx` files or browser profiles.
