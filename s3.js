const aws = require("aws-sdk");
const fs = require("fs");

let secrets;
if (process.env.NODE_ENV == "production") {
    secrets = process.env; // in prod the secrets are environment variables
} else {
    secrets = require("./secrets"); // in dev they are in secrets.json which is listed in .gitignore
}

const s3 = new aws.S3({
    accessKeyId: secrets.AWS_KEY,
    secretAccessKey: secrets.AWS_SECRET,
});

exports.upload = (req, res, next) => {
    if (!req.file) {
        return res.sendStatus(500);
    }

    //this gives additional info about the file that was just uploaded
    const { filename, mimetype, size, path } = req.file;

    const promise = s3
        .putObject({
            Bucket: "imageboardbucketclem",
            ACL: "public-read",
            Key: filename,
            Body: fs.createReadStream(path),
            ContentType: mimetype,
            ContentLength: size,
        })
        .promise();

    promise
        .then(() => {
            console.log("Upload to AWS successful");
            next();
            //This deletes the image that was just uploaded to AWS
            fs.unlink(path, () => {});
        })
        .catch((err) => {
            // uh oh
            console.log("Error in uploading file to AWS: ", err);
        });
};
