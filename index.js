const express = require("express");
const app = express();
const {
    getImages,
    getModalImage,
    getComments,
    getNextSetOfImages,
    addImage,
    addComment,
    checkImageExists,
} = require("./db");
const { uploader } = require("./upload");
const s3 = require("./s3");

//Middleware
//helps for reading data in req.body
app.use(express.json());

//makes the files in the public folder available
app.use(express.static("public"));

//call for making database request to get images for rendering on the page
app.get("/images", (req, res) => {
    getImages()
        .then((images) => {
            console.log('GET "/images"-route call');
            res.json(images.rows);
        })
        .catch((err) => {
            console.log('ERROR in GET "/images"-route: ', err);
        });
});

//Call for getting image comments
app.get("/images/:id", (req, res) => {
    //calling image data from database
    Promise.all([getModalImage(req.params.id), getComments(req.params.id)])
        .then((dataObj) => {
            let imageData = dataObj[0].rows[0];
            let commentData = dataObj[1].rows;
            res.json({
                imageData: imageData,
                commentData: commentData,
            });
        })
        .catch((err) => {
            console.log('"ERROR in GET "/images/:id": ', err);
        });
});

app.get("/check-image/:id", (req, res) => {
    checkImageExists(req.params.id)
        .then((dataObj) => {
            if (dataObj.rows[0].exists) {
                res.json({ imageExists: true });
            } else {
                res.json({ imageExists: false });
            }
        })
        .catch((err) => {
            console.log('ERROR at GET "/check-image/:id" ', err);
            res.json({ imageExists: false, error: err });
        });
});

app.get("/next-set-of-images/:id", (req, res) => {
    getNextSetOfImages(req.params.id)
        .then((dataObj) => {
            //check if there is at least one object in array
            if (dataObj.rows[0]) {
                res.json({ success: true, nextSetOfImages: dataObj.rows });
            } else {
                res.json({ success: false });
            }
        })
        .catch((err) => {
            console.log('ERROR in GET "/next-set-of-images/:id" ', err);
        });
});

//Uploader triggers our multer boilerplate which handles that files are being stored on our drive, to be precise in our upload folder
//single is a method that uploader gives us
//and 'file' comes from the property we have set on our formData
app.post("/upload", uploader.single("file"), s3.upload, (req, res) => {
    //if there is no error message, then everything was uploaded successfully to AWS --> "s3.upload" does the job
    //multer adds the file and the body to the request object
    if (req.file) {
        let url =
            "https://s3.amazonaws.com/imageboardbucketclem/" +
            req.file.filename;
        let { username, title, description } = req.body;
        //Storing image in database
        addImage(url, username, title, description)
            //addImage returns "id" of object in database
            .then((dbObj) => {
                console.log(
                    'Database insert "addImage" from POST "/upload" sucessful'
                );
                //values from database call are stored in dbObj.rows[0]
                //With this data the newly uploaded image is inserted on-top on the client side
                res.json({
                    success: true,
                    id: dbObj.rows[0].id,
                    url: url,
                    username: username,
                    title: title,
                    description: description,
                    created_at: dbObj.rows[0].created_at,
                });
            })
            .catch((err) => {
                console.log(
                    'Error in inserting data to  "images" at POST "/upload": ',
                    err
                );
            });
    } else {
        res.json({
            success: false,
        });
    }
});

//Call for posting comments:
app.post("/comment", (req, res) => {
    if (req.body) {
        console.log('POST "/comment" req.body: ', req.body);
        let { username, comment, imageId } = req.body;
        addComment(username, comment, imageId)
            .then((dbObj) => {
                console.log(
                    'Database insert "addComment" from POST "/comment" sucessful'
                );
                res.json({
                    success: true,
                    id: dbObj.rows[0].id,
                    username: username,
                    comment: comment,
                    created_at: dbObj.rows[0].created_at,
                });
            })
            .catch((err) => {
                console.log('ERROR in POST "/comment": ', err);
            });
    } else {
        res.json({
            success: false,
        });
    }
});

app.listen(8080, () => console.log("Server is there!"));
