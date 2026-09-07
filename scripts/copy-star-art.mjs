import { copyFileSync } from 'node:fs';
copyFileSync('packages/extension/public/star-manifold.svg', 'packages/extension/dist-star-preview/star-manifold.svg');
