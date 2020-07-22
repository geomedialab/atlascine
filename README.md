# Atlas Template

A repository containing an AtlasCine atlas template. It contains all of the files (e.g. modules, schemas, custom code) needed to create an AtlasCine atlas, minus the atlas content. 

## Steps to fork and run the atlascine template:
The following steps describe the process of forking the atlascine atlas template, configuring the atlas, and running it.

### Forking the atlas template repository to your own account:
1. Fork the repository to your own account by clicking on the 'Fork' button (top right corner of the https://gitlab.gcrc.carleton.ca/Atlascine/atlas-template).
2. You should see a list of accounts to fork the repository to, click the one with your user name.
3. You should now see a fork in progress screen (this process may take a while to finish).
4. Upon completion your browser should open to your newly forked repository. 

### Clone your forked version of the repository to your system:
1. From your forked atlas template page, click on the blue 'Clone' button and copy the url from the Clone with HTTP text box
2. On your local system, using a terminal type `git clone <your-forked-clone-url>`. e.g. `git clone https://gitlab.gcrc.carleton.ca/boikle/atlas-template.git`
3. Enter your GCRC gitlab username and password.
4. At this point you should now have a clone of the forked repository on your own system.

### How to run your cloned atlas template:
The clone of the repository contains an the following structure. 
```
/atlas-template  
├── .gitignore
├── atlascine <- this directory contains the copy of the AtlasCine template
└── README.md
```

1. Within the atlascine sub-directory you will need to run the `nunaliit config` command to configure the atlas (e.g. setting the CouchDb password, atlas name, port number, etc). Note: The template doesn't have these values set initially so you will need to do so.
2. Next, within the atlascine sub-directory you will run the `nunaliit update` & `nunaliit run` commands. 
3. Open a browser to `localhost:<your_specified_port>` (e.g. localhost:8080), and you should see the template running.

*Note:* For the above steps to work properly, make sure you have the latest branch-for-atlascine Nunaliit build. Currently there is code unique to atlascine in this branch which is required to run this type of atlas.

### Create a branch in your forked repository:
You will likely want to make multiple versions of your atlas-template which will likly be different. I would recommend you store these differences using git branches. 

To create a new branch, do the following;
1. In your atlas-template directory run the following command `git checkout -b your-new-branchname` e.g. `git checkout -b rwanda-atlas-template`.
2. Git should create this branch locally and switch your current branch to it. 
3. To see what branch you're in, you can type the `git branch`, and the branch which is currently active will have an '*' beside it.
4. (Optional) if you want to push this new branch to the GCRC gitlab server, you will need to push this change up, using the `git push --set-upstream origin <your-branch-name>` command and providing your username and password.
 * Tip: if you just type `git push` you will get an error message that will provide you with this command for pushing the branch upstream to the GCRC Gitlab server.
5. To switch to a different branch you can use the `git checkout <branch-name>` command. e.g. `git checkout master`

### Commit and Push changes:
Now that you have a forked repository with different branches, you will likely need to save the changes you made and store them on the GCRC Gitlab server.

Here is the workflow for this process through the terminal;
1. To check the status of your current branch (i.e. see what's changed), type `git status` into the terminal.
2. If things have change in any files you may want to commit those changes. 
 * Note: You can see specifically see what's changed in a file with the `git diff <address-of-file-that-has-changed>` e.g. `git diff atlascine/htdocs/css/atlas.css`.
3. The first thing you need to do is stage your changes with the `git add <file-name-you-want-to-change>` e.g. `git add atlascine/htdocs/css/atlas.css`
4. Repeat step 3 for all related files changes. 
 * Tip: It's usually better to have many smaller commits broken up into specific tasks, than one large commit containing all the changes. 
5. After all the changes you want commited have been staged, you now can commit them, using the `git commit -m <commit message>` e.g. `git commit -m "Updated background colour of atlas nav-bar"`.
6. Lastly you will need to push these committed changes to the GCRC Gitlab, using the `git push` command, and then providing your user credentials.

Note: Alternativelly you could also do this work through an IDE. Visual Studio Code is a free and popular IDE for JavaScript, and offers an easy environment to do stage/commit/push your changes.

### Make a pull/merge request:
Pull requests are a way for you to request changes you made to be incorporated in another repository (e.g. https://gitlab.gcrc.carleton.ca/Atlascine/atlas-template)

Steps to make a pull/merge request
1. On the Gitlab site, go to your forked atlas-template repository.
2. Select the branch of code you want merged
3. Click the Blue 'Create merge request' button (top right corner).
4. Make sure the from and into branches specified at the top of the merge request screen are correct 
5. Provide a merge request title and description
6. Click the Green 'Submit merge request' button at the bottom of the page to submit the request.
7. If the request is approved, the 'from' repository will be merged into the 'into' repository.

Workflow Example: 
1. Identify an issue in the atlascine template. e.g. 'All atlas-templates should use red text for the nav-bar text'.
2. Create a new issue (if it doesn't already exist) in the Atlascine/atlas-template branch.
3. If you want to take on the issue, you could make a new branch on your forked repository for the specific issue.
4. Make/stage/commit/push your changes to that new branch.
5. Then lastly make the merge request through Gitlab.

* Note: Successful Pull/Merge requests are commonly small changes often focused on a specific issue.

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
2. Next create a new subtitle document and adding a reference to the media document in step 1. This can be done either in the data browser tools page or in the editor module.
3. Lastly create a new cinemap document through the editor module, and reference the media document you created in step 1. 

Note: If you need a sample video and srt document, you can find one at this [URL](http://www.storiesinflight.com/js_videosub/)
