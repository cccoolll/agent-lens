#!/bin/bash

vips dzsave agent_lens/assets/example_image.png agent_lens/tiles_output --layout google
python agent_lens/rebuild_cell_db_512.py
python agent_lens/embed-image-vectors.py