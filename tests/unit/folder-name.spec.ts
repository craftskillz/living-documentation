import { test, expect } from '@playwright/test';
import {
  normalizeFolderPath,
  normalizeFolderSegment,
} from '../../dist/src/lib/folderName';

test.describe('folder name normalization', () => {
  test('replaces spaces and special characters with underscores', () => {
    expect(normalizeFolderSegment('204_CONNAISSANCE PERSONNE')).toBe('204_CONNAISSANCE_PERSONNE');
    expect(normalizeFolderSegment('R&D / Sales')).toBe('R_D_Sales');
  });

  test('removes accents and compacts underscores', () => {
    expect(normalizeFolderSegment(' Équipe  déjà-vu !!! ')).toBe('Equipe_deja-vu');
  });

  test('normalizes each path segment independently', () => {
    expect(normalizeFolderPath('204_CONNAISSANCE PERSONNE/équipe produit')).toBe(
      '204_CONNAISSANCE_PERSONNE/equipe_produit',
    );
  });
});
