# Atlas Template

A repository containing an AtlasCine atlas template. It contains all of the files (e.g. modules, schemas, custom code) needed to create an AtlasCine atlas, minus the atlas content. 

## Steps to copy and run the atlascine template:
The following steps describe the process of copying the atlascine atlas template, configuring the atlas, and running it.

1. Clone the repository to your system in a terminal using the `git clone https://gitlab.gcrc.carleton.ca/Atlascine/atlas-template.git` and enter your gitlab username and password.
2. Alternatively, you can also download this entire branch through the gitlab web interface.
3. Copy the atlas template directory 'atlascine' contents to the location you want a new Nunaliit atlas to be.
4. If you're renaming the atlas, rename the folder from 'atlascine' to 'your_atlas_name'.
4. Run the `nunaliit config` command inside the atlas directory to configure the atlas (e.g. setting the CouchDb password, atlas name, port number, etc).
5. Run a `nunaliit update` & `nunaliit run` on your new atlas. 
6. Open a browser to localhost:<your_specified_port> (e.g. localhost:8080).

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

### Adding Videos and SRT Files:
The template atlas comes with no Cinemap, media, or subtitle files. 

Steps to Create Cinemap Documents:

1. First create a new media document, fill in the form details, and save the document. This can be done in either the data browser tools page or on the editor module. 
2. Next create a subtitle document for the media doc in step 1. Open that media document in the editor module, and click the 'add releated item' button and select the drop down option 'sub-title'. Next fill in the details for creating a new sub-title document and save.
3. Lastly create a new cinemap document through the editor module, and reference the media document you created in step 1. 

Note: If you need a sample video and srt document, you can find one at this [URL](http://www.storiesinflight.com/js_videosub/)
