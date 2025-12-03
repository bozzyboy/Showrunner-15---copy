import { useState, useEffect } from 'react';
import { getImageFromDB } from '../services/storageService';

// Transparent 1x1 pixel base64 to prevent broken image icons
const FALLBACK_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Hook to resolve an image ID (prefixed with 'img_') to a Blob URL.
 * If the input is already a data URI or http URL, it returns it as is.
 */
export const useImageResolver = (urlOrId: string | undefined) => {
    const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(urlOrId);

    useEffect(() => {
        if (!urlOrId) {
            setResolvedUrl(undefined);
            return;
        }

        // If it's a UUID reference
        if (urlOrId.startsWith('img_')) {
            let active = true;
            let objectUrl: string | null = null;

            const fetchImage = async () => {
                try {
                    const blob = await getImageFromDB(urlOrId);
                    if (blob && active) {
                        objectUrl = URL.createObjectURL(blob);
                        setResolvedUrl(objectUrl);
                    } else if (active) {
                        // Image missing in DB. Use fallback to prevent UI crash.
                        // We log a warning only once per session ideally, but for now standard console warn is fine.
                        console.warn(`[ImageResolver] Image ID ${urlOrId} referenced but NOT found in DB. Returning fallback.`);
                        setResolvedUrl(FALLBACK_IMAGE);
                    }
                } catch (e) {
                    console.error(`[ImageResolver] Failed to resolve image ${urlOrId}`, e);
                    if (active) setResolvedUrl(FALLBACK_IMAGE);
                }
            };

            fetchImage();

            return () => {
                active = false;
                if (objectUrl) URL.revokeObjectURL(objectUrl);
            };
        } else {
            // It's a standard URL or data URI
            setResolvedUrl(urlOrId);
        }
    }, [urlOrId]);

    return resolvedUrl;
};