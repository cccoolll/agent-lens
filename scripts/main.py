import clip
import torch
import faiss

model, preprocess = clip.load("ViT-B/32")

# read the images, check the input of preprocess is a list or a nd.array
images = ... # this is the images, [image1, image2, ...]
metadata = ... # this is the metadata you will use later, need to be the same order as images, e.g. [{type: "type1", name: "image 1"}, {...}... ]

images = preprocess(images)
#texts = clip.tokenize(texts)

with torch.no_grad():
    image_features = model.encode_image(images)
    # text_features = model.encode_text(texts)



index = faiss.IndexFlatIP(d)  # d is the dimension of the vectors
index.add(image_features)  # indexing the features
# Note the indices will be the same as the labels, so we can use the indicies to retrieve the metadata

distances, indices = index.search(query_vectors, k=5)  # k is the number of nearest neighbors to search for

# get top-1
top_index = indices[0]
top_score = distances[0]
top_image = images[top_index]
top_metadata = metadata[top_index]