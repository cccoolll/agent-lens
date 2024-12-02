#!/bin/bash

vips dzsave src/frontend/img/example_image.png src/frontend/tiles_output --layout google
python src/backend/rebuild_cell_db_512.py
python src/backend/embed-image-vectors.py