// SPDX-License-Identifier: MIT
import { type RouteConfig, index, route } from '@react-router/dev/routes';

/**
 * Route manifest.
 *
 * Every URL the app responds to is listed here. Adding a new route
 * means adding a new line. Keeping the manifest explicit (rather
 * than file-system conventions) means the routing tree is visible
 * in one place.
 */
export default [
  index('routes/home.tsx'),
  route('about', 'routes/about.tsx'),
  route('projects', 'routes/projects.tsx'),
  route('projects/wiretrace', 'routes/projects.wiretrace.tsx'),
  route('writing', 'routes/writing.tsx'),
  route('privacy', 'routes/privacy.tsx'),
  route('*', 'routes/$.tsx'),
] satisfies RouteConfig;
