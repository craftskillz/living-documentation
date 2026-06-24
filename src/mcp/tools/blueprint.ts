import { listBlueprintBox } from '../../lib/blueprint';
import { readConfig } from '../../lib/config';

export function toolListBlueprintBox(docsPath: string, args: { path: string }) {
  const config = readConfig(docsPath);
  const relPath = typeof args.path === 'string' ? args.path : '';
  const listing = listBlueprintBox(config.sourceRoot, relPath);
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(listing, null, 2),
    }],
  };
}
