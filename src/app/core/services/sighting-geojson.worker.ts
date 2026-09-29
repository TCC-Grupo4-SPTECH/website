/// <reference lib="webworker" />

addEventListener('message', async ({ data: url }: MessageEvent<string>) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load deforestation data (${response.status})`);

    const payload = await response.json() as { data?: unknown };
    const collection = payload.data;
    if (
      !collection || typeof collection !== 'object'
      || (collection as { type?: unknown }).type !== 'FeatureCollection'
      || !Array.isArray((collection as { features?: unknown }).features)
    ) {
      throw new Error('The dashboard/map endpoint returned an invalid GeoJSON response');
    }

    postMessage({ collection });
  } catch (error) {
    postMessage({ error: error instanceof Error ? error.message : 'Could not load deforestation data' });
  }
});
