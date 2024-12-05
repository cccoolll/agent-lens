#!/bin/bash
npm install --prefix src/frontend
vips dzsave src/frontend/img/example_image.png src/frontend/tiles_output --layout google
python src/backend/rebuild_cell_db_512.py
python src/backend/embed-image-vectors.py --image_folder src/frontend/tiles_output --datatype squid
mv src/frontend/tiles_output/1/1/1.jpg src/frontend/tiles_output/1/1/1.bmp