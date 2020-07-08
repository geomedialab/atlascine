# Atlas Template

A repository containing an AtlasCine atlas template. It contains all of the files (e.g. modules, schemas, custom code) needed to create an AtlasCine atlas, minus the atlas content. 

## Steps to copy and run atlascine template:
The following steps describe the process of copying the atlascine atlas template, configuring the atlas, and running it.

1. Clone the repository to your system in a terminal using the `git clone https://gitlab.gcrc.carleton.ca/Atlascine/atlas-template.git`.
2. Enter Gitlab Username and Password.
3. Copy the atlas template directory 'atlascine' contents to the location you want a new Nunaliit atlas.
4. Run the `nunaliit config` command to condifure the atlas (e.g. CouchDb password).
5. Run a `nunaliit update` & `nunaliit run` on your new atlas to apply the AtlasCine content changes. 

*Note:* For the above steps to work properly, make sure you have the latest branch-for-atlascine Nunaliit build. Currently there is code unique to atlascine in this branch which is required to run this type of atlas.

## Additional steps:
Since this atlas is a template, dummy content is in place which will need to be updated with your original content.

### Updating Wiki Documents:
The template contains no wiki documents, but does include dummy text for where you would link a wiki doc to a module. 

In this template's modules you may find in either/both of the en.html and the utilities.json files, the text `insert_wiki_doc_id`. You will need to replace this text with the doc id of the wikidocument you wish to show up. To do this following the following steps;

1. Login to the atlas.
2. Create a new wikidocument in the atlas (note: I typically do this through the data browser tool on the tool page).
3. Open the Tree view of the newly created wikidocument, and copy it's document id.
4. On disk replace the `insert_wiki_doc_id` values in the module's en.html and utilities.json files with the copied document id.
5. Run an `nunaliit update`.

### Updating the home page slides:
The atlas template includes a home page with a working slide show, but with 3 dummy slides images with loren ipsum dummy text content. 

To update this you will need to do the following;

1. If you're adding new images to the page, add them to the htdocs directory. I recommend the htdocs/images directory (note: you should see 3 slides image files already in there).
2. In the docs/module.home/introduction/content directory you will find the module's en.html file. Open this file for editting.
3. In this file you will be able to replace the background-image url references to the dummy images (e.g. replace `<div class="jr_slideshow_slide" style="background-image:url('./images/slide1.jpg')">` with `<div class="jr_slideshow_slide" style="background-image:url('./images/my_new_slide.jpg')">`)
4. Additionally you will be able to replace the text content found beneth the image you replaced in step 3. 

*Tip:* For full width slide images, I commonly try to have images which are a minimum of 2000px * 800px in dimensions. Since this is a large image, which can effect load times, it may be worth applying an image compression to the image (note: be careful to note over-compress the images since this will produce pixlated results).

### Updating web page styling:
Atlas style changes can be performed by adding style rules in the htdocs/css/atlas.css file. 

*Note*: If the style rules are not being picked up, use the browser developer tools to inspect the element. It's possible a more specific css rule is over-riding your new rule.