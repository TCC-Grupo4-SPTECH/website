/// <reference lib="webworker" />

addEventListener('message', async ({ data: url }: MessageEvent<string>) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load deforestation data (${response.status})`);

    const payload = await response.json() as { data?: string | { url?: unknown }; url?: unknown };
    const signedUrl = typeof payload.data === 'string' ? payload.data : payload.data?.url ?? payload.url;
    if (typeof signedUrl !== 'string' || !signedUrl.trim()) {
      throw new Error('The deforestation endpoint did not return a signed URL');
    }

    let downloadUrl: URL;
    try {
      downloadUrl = new URL(signedUrl);
    } catch {
      throw new Error('The deforestation endpoint returned an invalid signed URL');
    }
    if (!['https:', 'http:'].includes(downloadUrl.protocol)) {
      throw new Error('The deforestation endpoint returned an invalid signed URL');
    }

    // Use the URL as supplied: changing its query parameters invalidates the signature.
    let geoJsonResponse: Response;
    try {
      geoJsonResponse = await fetch(signedUrl, { credentials: 'omit' });
    } catch {
      throw new Error('Could not download deforestation GeoJSON');
    }
    if (!geoJsonResponse.ok) {
      throw new Error(`Could not download deforestation GeoJSON (${geoJsonResponse.status})`);
    }
    const collection: unknown = await geoJsonResponse.json();
    if (
      !collection || typeof collection !== 'object'
      || (collection as { type?: unknown }).type !== 'FeatureCollection'
      || !Array.isArray((collection as { features?: unknown }).features)
    ) {
      throw new Error('The signed URL returned an invalid GeoJSON response');
    }

    postMessage({ collection });
  } catch (error) {
    postMessage({ error: error instanceof Error ? error.message : 'Could not load deforestation data' });
  }
});
