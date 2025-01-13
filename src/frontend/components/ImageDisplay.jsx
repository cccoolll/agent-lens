import React, { useEffect, useRef } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { Projection, addProjection } from 'ol/proj';
import 'ol/ol.css';

const ImageDisplay = ({ mapRef, isAuthenticated, userId, snapshotImage, handleImageClick, openControls: toggleControls }) => {
  const map = useRef(null);

  useEffect(() => {
    if (!map.current && mapRef.current) {
      const imageWidth = 2048;
      const imageHeight = 2048;
      const extent = [0, 0, imageWidth, imageHeight];

      const projection = new Projection({
        code: 'deepzoom-image',
        units: 'pixels',
        extent: extent,
      });

      addProjection(projection);

      map.current = new Map({
        target: mapRef.current,
        layers: [],
        view: new View({
          projection: 'deepzoom-image',
          center: [imageWidth / 2, imageHeight / 2],
          zoom: 2,
          minZoom: 0,
          maxZoom: 10,
        }),
      });
    }
  }, [mapRef]);

  useEffect(() => {
    if (map.current && userId) {
      const tileUrl = isLocal()
        ? `${window.location.protocol}//${window.location.hostname}:9000/public/apps/microscope-control/tiles`
        : "https://hypha.aicell.io/agent-lens/apps/microscope-control/tiles";

      const tileLayer = new TileLayer({
        source: new XYZ({
          url: `${tileUrl}?tile={z}/{x}/{y}.jpg`,
          crossOrigin: 'anonymous',
          tileSize: 256,
          maxZoom: 10,
          projection: 'deepzoom-image',
        }),
      });

      map.current.addLayer(tileLayer);
      map.current.getView().fit(extent, { size: map.current.getSize() });
    }
  }, [map, isAuthenticated, userId]);

  useEffect(() => {
    if (map.current) {
      const handleMapClick = (event) => {
        const coordinate = event.coordinate;
        handleImageClick(coordinate);
      };

      map.current.on('click', handleMapClick);

      return () => {
        map.current.un('click', handleMapClick);
      };
    }
  }, [map, handleImageClick]);

  return (
    <div id="image-display">
      <div id="map" ref={mapRef} className="w-full h-full"></div>
      <button
        className="settings-button"
        onClick={toggleControls}
      >
        <i className="fas fa-cog icon"></i>
      </button>
      <select
        id="segmentation-model"
        className="segmentation_model-button"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        <option value="vit_b_lm">ViT-B LM</option>
        <option value="vit_l_lm">ViT-L LM</option>
        <option value="vit_b">ViT-B</option>
        <option value="vit_b_em_organelles">ViT-B EM Organelles</option>
      </select>
      <button className="segment_cell-button" onClick={activatePenTool}>
        <i className={`fas ${isPenActive ? "fa-pencil-alt icon" : "fa-magic icon"}`}></i>
      </button>
      <button
        className="segment_all_cells-button"
        onClick={handleSegmentAllCells}
        disabled={!snapshotImage || !segmentService}
      >
        <i className="fas fa-layer-group icon"></i>
      </button>
      <button className="add_point-button" onClick={startDrawingPoints}>
        <i className="fas fa-map-marker-alt icon"></i>
      </button>
      <button className="add_polygon-button" onClick={startDrawingPolygons}>
        <i className="fas fa-draw-polygon icon"></i>
      </button>
      <button id="open-chatbot" className="chatbot-button" onClick={openChatbot}>
        <i className="fas fa-comments icon"></i>
      </button>
    </div>
  );
};

export default ImageDisplay;