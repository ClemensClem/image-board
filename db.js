const spicedPg = require("spiced-pg");
let db;
if (process.env.DATABASE_URL) {
    //this will run if petition is running on heroku
    db = spicedPg(process.env.DATABASE_URL);
} else {
    //this will run if project is running on localhost
    db = spicedPg(
        process.env.DATABASE_URL ||
            "postgres:postgres:postgres@localhost:5432/vanilla-imageboard"
    );
}

module.exports.getImages = () => {
    return db.query(
        `SELECT images.id, images.url, images.title, images.description, images.username, images.created_at FROM images ORDER BY id DESC LIMIT 6`
    );
};

module.exports.getNextSetOfImages = (lastId) => {
    return db.query(
        `SELECT * , (
              SELECT id FROM images
              ORDER BY id ASC
              LIMIT 1) AS "lowestId" 
      FROM images
      WHERE id < $1
      ORDER BY id DESC
      LIMIT 4`,
        [lastId]
    );
};

module.exports.getModalImage = (imageId) => {
    return db.query(
        `SELECT images.url, images.username, images.title, images.description, images.created_at FROM images WHERE images.id=$1`,
        [imageId]
    );
};

module.exports.getComments = (imageId) => {
    return db.query(
        `SELECT comments.id, comments.username, comments.comment, comments.created_at FROM comments WHERE comments.picture_id=$1 ORDER BY comments.id DESC`,
        [imageId]
    );
};

module.exports.addImage = (url, username, title, description) => {
    return db.query(
        `INSERT INTO images (url, username, title, description) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
        [url, username, title, description]
    );
};

module.exports.addComment = (username, comment, imageId) => {
    return db.query(
        `INSERT INTO comments (username, comment, picture_id) VALUES ($1, $2, $3) RETURNING id, created_at`,
        [username, comment, imageId]
    );
};

module.exports.checkImageExists = (imageId) => {
    return db.query(`SELECT EXISTS(SELECT * FROM images WHERE id = $1)`, [
        imageId,
    ]);
};
