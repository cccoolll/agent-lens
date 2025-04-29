import ImageStatic from 'ol/source/ImageStatic';
import ImageLayer from 'ol/layer/Image';
import { fromExtent as polygonFromExtent } from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import { getCenter } from 'ol/extent';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Fill, Stroke } from 'ol/style';

export const getSnapshotArray = async (snapshotImage) => {
    if (!snapshotImage) {
        throw new Error('No snapshot image provided');
    }
    
    try {
        const response = await fetch(snapshotImage);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Validate that we have an image blob
        if (!blob.type.startsWith('image/')) {
            throw new Error(`Invalid image format: ${blob.type}`);
        }
        
        const arrayBuffer = await new Response(blob).arrayBuffer();
        return new Uint8Array(arrayBuffer);
    } catch (error) {
        console.error('Error processing snapshot image:', error);
        throw error;
    }
};

export const overlaySegmentationMask = (maskData, map, extent) => {
    // Before adding a new mask, remove any existing segmentation layers
    map.getLayers().getArray()
        .filter(layer => layer.get('isSegmentationLayer'))
        .forEach(layer => map.removeLayer(layer));
    
    // Create image source from the mask base64 data
    const maskSource = new ImageStatic({
        url: `data:image/png;base64,${maskData}`,
        imageExtent: extent,
        projection: map.getView().getProjection(),
    });

    // Create an image layer with the mask
    const maskLayer = new ImageLayer({
        source: maskSource,
        opacity: 0.5, // Semi-transparent overlay
        zIndex: 10, // Set a high z-index to show above other layers
    });

    // Add properties to identify this layer
    maskLayer.set('isSegmentationLayer', true);
    maskLayer.set('name', 'segmentation-mask');

    // Add the image layer to the map
    map.addLayer(maskLayer);

    // Also create a vector outline of the mask for better visibility
    try {
        // Create a feature with the extent of the mask
        const maskFeature = new Feature({
            geometry: polygonFromExtent(extent)
        });

        // Create a vector source with the mask feature
        const vectorSource = new VectorSource({
            features: [maskFeature]
        });

        // Create a vector layer with the mask feature
        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: new Style({
                stroke: new Stroke({
                    color: 'rgba(255, 0, 0, 1)', // Red border
                    width: 2
                }),
                fill: new Fill({
                    color: 'rgba(255, 0, 0, 0.05)' // Very light red fill
                })
            }),
            zIndex: 11 // Above the mask layer
        });

        // Add properties to identify this layer
        vectorLayer.set('isSegmentationLayer', true);
        vectorLayer.set('name', 'segmentation-outline');

        // Add the vector layer to the map
        map.addLayer(vectorLayer);

        // Center the view on the mask if it's not already visible
        const center = getCenter(extent);
        map.getView().animate({
            center: center,
            duration: 500
        });
    } catch (error) {
        console.error('Error creating segmentation outline:', error);
    }

    console.log('Segmentation mask added to map');
};