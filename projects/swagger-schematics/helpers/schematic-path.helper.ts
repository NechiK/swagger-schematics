/**
 * Path helpers copied from @schematics/angular (`utility/parse-name` and
 * `utility/find-module`), so the package doesn't depend on it: from 22 on it
 * pulls in TypeScript and oxc-parser, about 30 MB, for these two functions.
 * Their code is the same in every release from 12 to 22.
 *
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { basename, dirname, join, normalize, Path, relative } from '@angular-devkit/core';

export interface Location {
  name: string;
  path: Path;
}

/**
 * Splits a name that may contain a path (`'orders/order-dto'`) into the bare
 * name and its directory under `path`, normalized and rooted at `/`.
 */
export function parseName(path: string, name: string): Location {
  const nameWithoutPath = basename(normalize(name));
  const namePath = dirname(join(normalize(path), name));

  return {
    name: nameWithoutPath,
    path: normalize('/' + namePath),
  };
}

/**
 * The relative import path from one file to another (`./x`, `../y/x`).
 */
export function buildRelativePath(from: string, to: string): string {
  from = normalize(from);
  to = normalize(to);

  // Convert to arrays.
  const fromParts = from.split('/');
  const toParts = to.split('/');

  // Remove file names (preserving destination)
  fromParts.pop();
  const toFileName = toParts.pop();

  const relativePath = relative(normalize(fromParts.join('/') || '/'), normalize(toParts.join('/') || '/'));
  let pathPrefix = '';

  // Set the path prefix for same dir or child dir, parent dir starts with `..`
  if (!relativePath) {
    pathPrefix = '.';
  } else if (!relativePath.startsWith('.')) {
    pathPrefix = `./`;
  }
  if (pathPrefix && !pathPrefix.endsWith('/')) {
    pathPrefix += '/';
  }

  return pathPrefix + (relativePath ? relativePath + '/' : '') + toFileName;
}
