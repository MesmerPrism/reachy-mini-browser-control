# Simulated camera panorama

`demo-room-panorama.png` is an AI-generated synthetic living-room scene. It is
not a recording from a robot or a photograph of a person's home. It was
generated for MesmerPrism using OpenAI's built-in image-generation tool on
September 30, 2026, and is distributed under this application's MIT terms.
No official Reachy CAD or third-party panorama was used in its creation.

SHA-256: `ea4fe2bad1e747547dfb20d1e1d1e17d02c20b41a9ac6b6ccf8bf2163a536e96`.

The demo projects the 2:1 image as a spherical environment and derives camera
rotation from simulated head feedback. Its field of view is approximate and is
not a calibration of Reachy's lens. A single panorama has no scene depth;
translation controls animate the robot but do not produce camera parallax.
Generated geometry and the panorama seam may contain visual inconsistencies.
The scene has no audio. It is displayed only in simulation, never as a fallback
for a missing or failed real camera stream.

## Generation prompt

Use case: photorealistic-natural. Asset type: equirectangular 360-degree
environment texture for a simulated tabletop robot camera in a public browser
demo. Generate a 2:1 wide image, ideally 2048 by 1024 pixels, exact
latitude-longitude equirectangular projection covering 360 degrees horizontally
and 180 degrees vertically, level horizon at vertical center, seamless
left/right boundary. A natural, believable quiet living room/workshop in
daytime, viewed from the center of a small table at tabletop camera height.
Central front view has a softly sunlit window with trees outside and a
bookshelf off to the side, ordinary chairs, plants, warm wood surfaces, neutral
walls, an open doorway behind. Distinct spatial landmarks in all directions for
demonstrating head turns. Photographic materials and natural lighting, no
cinematic effects. Zenit ceiling and nadir table/floor must have spherical
equirectangular distortion appropriate for mapping to an inside-out sphere.
No people, no robot, no writing, no text, no logos, no watermark, no panorama
frame or collage. This is a continuous spherical environment, not a cropped
wide-angle photograph. Neutral forward camera will look at the middle of the
image.
