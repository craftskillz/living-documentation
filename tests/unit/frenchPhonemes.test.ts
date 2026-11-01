import assert from 'node:assert/strict';
import { test } from 'node:test';
import { phonemizeFrench } from '../../src/lib/tts/adapters/frenchPhonemes';

let installed = true;
try { require.resolve('@echogarden/espeak-ng-emscripten'); } catch { installed = false; }

test('French phonemization preserves nasals, liaison and punctuation', { skip: !installed }, async () => {
  const phonemes = await phonemizeFrench('Bonjour, les enfants boivent du bon vin !');
  assert.match(phonemes, /bɔ̃ʒˈuʁ/);
  assert.match(phonemes, /lez/); // liaison, not isolated word-by-word conversion
  assert.match(phonemes, /ɑ̃/);
  assert.match(phonemes, /ɛ̃/);
  assert.match(phonemes, /,/);
  assert.ok(phonemes.endsWith('!'));
  assert.doesNotMatch(phonemes, /[_\n]/);
});

test('French decimals are pronounced as numbers and repeated calls remain stable', { skip: !installed }, async () => {
  const [number, words, repeated] = await Promise.all([
    phonemizeFrench('10,5 euros.'),
    phonemizeFrench('dix virgule cinq euros.'),
    phonemizeFrench('10,5 euros.'),
  ]);
  // eSpeak stresses spelled-out words differently from numeric notation.
  assert.equal(number.replace(/[ˈˌ]/g, ''), words.replace(/[ˈˌ]/g, ''));
  assert.equal(number, repeated);
  assert.ok(number.endsWith('.'));
});
