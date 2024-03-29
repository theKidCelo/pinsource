const dbHelperFunctions = require("../db/queries/users_resources");
const express = require("express");
const router = express.Router();
const auth = require("../lib/auth-middleware");
const moment = require("moment");

module.exports = db => {
  router.get("/", auth, (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      res.redirect("/api/users/login");
    }
    let options = req.query;

    dbHelperFunctions.getAllResources(db, options, 60).then(data => {
      const user = res.locals.user;
      res.render("index", { data, user });
      res.status(200);
    });
  });

  router.get("/my-resources", auth, (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
      res.redirect("/api/users/login");
    }
    let options = {};
    options.userId = userId;

    dbHelperFunctions.getAllResources(db, options, 60).then(data => {
      const user = res.locals.user;
      const likesArr = [];

      for (const el of data) {
        if (el.owner_id !== user.id) {
          likesArr.push(el);
        }
      }
      res.render("my-resources", { data, user, likesArr });
      res.status(200);
    });
  });

  //// Getting to the creation page
  router.get("/add-resource", auth, (req, res) => {
    const user = res.locals.user;
    console.log(user);
    if (req.session.userId) {
      res.render("resource_new", {user});
    } else {
      res.redirect("/api/users/login");
    }
  });

  //// Submit a new resource
  router.post("/add-resource", auth, (req, res) => {
    console.log(req.body);

    const { ...newResourceParams } = req.body;
    newResourceParams.user_id = req.session.userId;

    dbHelperFunctions.addResource(db, newResourceParams).then(data => {
      res.redirect("/api/resources");
      res.status(200);
    });
  });

  //// 'Delete' an existing resource
  router.post("/delete/:id", auth, (req, res) => {
    dbHelperFunctions.deleteResource(db, req.params.id).then(data => {
      res.redirect("/");
      res.status(200);
    });
  });

  //liking resources
  router.post("/:id/likes", auth, (req, res) => {
    const likeParams = {};
    likeParams.resource_id = req.params.id;
    likeParams.user_id = res.locals.user.id;

    dbHelperFunctions
      .addLike(db, likeParams)
      .then(resource_id => {
        return dbHelperFunctions.countLikes(db, resource_id);
      })
      .then(data => {
        const number_of_likes = data[0].count;
        res.json({ number_of_likes });
      });
  });

  router.post("/:id/likes/delete", auth, (req, res) => {
    const likeParams = {};
    likeParams.resource_id = Number(req.params.id);
    likeParams.user_id = res.locals.user.id;

    dbHelperFunctions
      .getLikeId(db, likeParams.user_id, likeParams.resource_id)
      .then(like_id => {
        return dbHelperFunctions.deleteLike(db, like_id);
      })
      .then(data => {
        return dbHelperFunctions.countLikes(db, data.resource_id);
      })
      .then(data => {
        let number_of_likes;
        if (data.length === 0) {
          number_of_likes = 0;
        } else {
          number_of_likes = data[0].count;
        }

        res.json({ number_of_likes });
      });
  });
  // get the individual resource page
  router.get("/:id", auth, (req, res) => {
    const resource_id = req.params.id;

    dbHelperFunctions.getResourceFromId(db, resource_id).then(data => {
      const user = res.locals.user;
      res.render("resource_page", { data, user });
    });
  });

  // get the comments for resource
  router.get("/:id/comments", auth, (req, res) => {
    const resource_id = req.params.id;

    dbHelperFunctions.fetchComments(db, resource_id).then(comments => {
      for (let comment of comments) {
        comment.comment_date = moment(comment.comment_date).format(
          "dddd, MMMM Do YYYY, h:mm:ss a"
        );
      }
      res.send(comments);
    });
  });

  // post a new comment to resource
  router.post("/:id/comments", auth, (req, res) => {
    const { ...newCommentParams } = req.body;
    newCommentParams.user_id = res.locals.user.id;

    dbHelperFunctions.addNewComment(db, newCommentParams).then(resource_id => {
      dbHelperFunctions.fetchComments(db, resource_id).then(comments => {
        res.send(comments);
      });
    });
  });

  //ratings
  router.post("/:id/ratings", auth, (req, res) => {
    const { ...ratingParams } = req.body;
    ratingParams.resource_id = req.params.id;
    ratingParams.user_id = res.locals.user.id;

    let action = "insert";
    for (let el of res.locals.user.ratings) {
      if (el[0] == ratingParams.resource_id) {
        action = "update";
      }
    }

    if (action === "update") {
      dbHelperFunctions
        .updateRatings(db, ratingParams)
        .then(() => {
          return dbHelperFunctions.fetchAverageRating(db, ratingParams.resource_id);
        })
        .then(averageRating => {
          res.json(averageRating);
        });
    }

    if (action === "insert") {
      dbHelperFunctions
        .addRating(db, ratingParams)
        .then(() => {
          return dbHelperFunctions.fetchAverageRating(db, ratingParams.resource_id);
        })
        .then(averageRating => {
          res.json(averageRating);
        });
    }
  });
  return router;
};
