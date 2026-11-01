import { test, expect } from '../helpers/ld-fixture';

test('TTS advertises French alongside English', async ({ request, ld }) => {
  const response = await request.get(`${ld.baseURL}/api/tts/status`);
  expect(response.ok()).toBe(true);
  expect((await response.json()).supportedLanguages).toEqual(['en', 'fr']);
});

// Opt in: exercises the real optional runtime and downloads the model on first use.
test('Kokoro synthesizes French and English through the real server', async ({ request, ld }) => {
  test.skip(process.env.LD_TEST_TTS !== '1', 'Set LD_TEST_TTS=1 to run real model inference');
  test.setTimeout(180_000);
  for (const [language, text] of [
    ['fr', 'Bonjour, cette documentation peut maintenant être lue en français.'],
    ['en', 'Hello, this documentation can still be read in English.'],
  ]) {
    const response = await request.post(`${ld.baseURL}/api/tts`, {
      data: { text, language },
      timeout: 150_000,
    });
    expect(response.status(), response.ok() ? undefined : await response.text()).toBe(200);
    expect(response.headers()['content-type']).toContain('audio/wav');
    expect(response.headers()['x-tts-sample-rate']).toBe('24000');
    const audio = await response.body();
    expect(audio.toString('ascii', 0, 4)).toBe('RIFF');
    expect(audio.toString('ascii', 8, 12)).toBe('WAVE');
    expect(audio.length).toBeGreaterThan(24_000);
    // Reject silent or corrupt output, rather than just checking an HTTP status.
    expect(audio.subarray(44).some(value => value !== 0)).toBe(true);
  }
});
