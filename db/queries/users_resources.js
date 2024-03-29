const bcrypt = require("bcrypt");

//---------------USERS--------------------//
//Get a single user from the database given their email
const getUserWithEmail = function(db, loginInput) {
  let queryParams = [loginInput.email];
  let queryString = `
    SELECT *
    FROM users
    WHERE users.email = $1 `;

  return db
    .query(queryString, queryParams)
    .then(res => {
      if (bcrypt.compareSync(loginInput.password, res.rows[0].password)) {
        return res.rows[0];
      } else {
        console.log("goes here");
        return ""; //wrong password
      }
    })
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getUserWithEmail = getUserWithEmail;

//Get a single user from the database given their id
const getUserWithId = function(db, userId) {
  let queryParams = [userId];
  let queryString = `
    SELECT *
    FROM users
    WHERE users.id = $1; `;
  return db
    .query(queryString, queryParams)
    .then(res => {
      console.log(res.rows[0]);
      return res.rows[0];
    })
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getUserWithId = getUserWithId;

//edit current user profile
const updateUserWithId = function(db, newUserParams) {
  let queryParams = [];
  let queryString = `
    UPDATE users `;
  if (newUserParams.username) {
    queryParams.push(`${newUserParams.username}`);
    queryString += `SET username = $${queryParams.length} `;
  }
  if (newUserParams.email) {
    queryParams.push(`${newUserParams.email}`);
    if (queryParams.length > 1) {
      queryString += `, email = $${queryParams.length} `;
    } else {
      queryString += `SET email = $${queryParams.length} `;
    }
  }
  if (newUserParams.password) {
    queryParams.push(`${bcrypt.hashSync(newUserParams.password, 10)}`);
    if (queryParams.length > 1) {
      queryString += `, password = $${queryParams.length} `;
    } else {
      queryString += `SET password = $${queryParams.length} `;
    }
  }
  if (newUserParams.profile_pic) {
    queryParams.push(`${newUserParams.profile_pic}`);
    if (queryParams.length > 1) {
      queryString += `, profile_pic = $${queryParams.length} `;
    } else {
      queryString += `SET profile_pic = $${queryParams.length} `;
    }
  }
  queryParams.push(newUserParams.userId);
  queryString += `WHERE users.id = $${queryParams.length} RETURNING *`;

  return db
    .query(queryString, queryParams)
    .then(res => {
      console.log(res);
      return res.rows[0];
    })
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.updateUserWithId = updateUserWithId;

//Add a new user to the database
const addUser = function(db, newUserParams) {
  let queryParams = [
    newUserParams.username,
    newUserParams.email,
    bcrypt.hashSync(newUserParams.password, 10)
  ];

  let queryString = `
    INSERT INTO users`;

  if (newUserParams.profile_pic) {
    queryParams.push(newUserParams.profile_pic);
    queryString += `
    (username, email, password, profile_pic)
    VALUES ($1, $2, $3, $4)
    RETURNING * `;
  } else {
    queryString += `
    (username, email, password)
    VALUES ($1, $2, $3)
    RETURNING * `;
  }

  return db
    .query(queryString, queryParams)
    .then(res => {
      return res.rows[0];
    })
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addUser = addUser;

///--------------------------resources-----------------------------------//
//get all resources depending on the options
const getAllResources = function(db, options, limit = 20) {
  const queryParams = [];
  let queryString = `
    SELECT resources.*, users.username as username, users.profile_pic as user_profile_pic, count(liked_resources.resource_id) as number_of_likes, average_rating
    FROM resources
    LEFT OUTER JOIN liked_resources ON liked_resources.resource_id = resources.id
    LEFT OUTER JOIN users ON resources.user_id = users.id
    LEFT OUTER JOIN categories ON resources.category_id = categories.id
    LEFT OUTER JOIN (SELECT resource_id, round(avg(resource_ratings.rating), 1) as average_rating
              FROM resource_ratings
              GROUP BY resource_id
              ORDER BY resource_id) as average_ratings ON resources.id = average_ratings.resource_id
`;

  if (options.userId) {
    queryParams.push(options.userId);
    queryString += `WHERE (liked_resources.user_id = $${queryParams.length} OR resources.user_id = $${queryParams.length}) `;
  }

  if (options.category_id) {
    queryParams.push(`${options.category_id}`);

    if (queryParams.length > 1) {
      queryString += `AND resources.category_id = $${queryParams.length} `;
    } else {
      queryString += `WHERE resources.category_id = $${queryParams.length} `;
    }
  }

  if (options.keyword) {
    queryParams.push(`%${options.keyword.toUpperCase()}%`);
    if (queryParams.length > 1) {
      queryString += `AND (upper(resources.title) LIKE $${queryParams.length} OR upper(resources.description) LIKE $${queryParams.length}) `;
    } else {
      queryString += `WHERE (upper(resources.title) LIKE $${queryParams.length} OR upper(resources.description) LIKE $${queryParams.length}) `;
    }
  }

  queryString += `
    GROUP BY resources.id, average_ratings.average_rating, users.username, users.profile_pic
  `;

  if (options.rating) {
    queryParams.push(`${options.rating}`);
    queryString += `HAVING average_rating >= $${queryParams.length}`;
  }

  queryParams.push(limit);
  queryString += `
    ORDER BY number_of_likes DESC, resources.id
    LIMIT $${queryParams.length};
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getAllResources = getAllResources;

const getAverageRatings = function(db) {
  const queryParams = [];
  let queryString = `
  `;
};
exports.getAverageRatings = getAverageRatings;

////get resource from resource_id
const getResourceFromId = function(db, resource_id) {
  const queryParams = [resource_id];
  let queryString = `
    SELECT resources.*, users.username as username, users.profile_pic as user_profile_pic, count(liked_resources.resource_id) as number_of_likes, average_rating
    FROM resources
    LEFT OUTER JOIN liked_resources ON liked_resources.resource_id = resources.id
    LEFT OUTER JOIN ratings ON resource_ratings.resource_id = resources.id
    LEFT OUTER JOIN users ON resources.user_id = users.id
    LEFT OUTER JOIN (SELECT resource_id, round(avg(resource_ratings.rating), 2) as average_rating
                FROM resource_ratings
                GROUP BY resource_id
                ORDER BY resource_id) as average_ratings ON resources.id = average_ratings.resource_id
    WHERE resources.id = $${queryParams.length}
    GROUP BY resources.id, average_ratings.average_rating, users.username, users.profile_pic;
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getResourceFromId = getResourceFromId;

//add new resource
const addResource = function(db, newResourceParams) {
  const queryParams = [
    newResourceParams.user_id,
    newResourceParams.category_id,
    newResourceParams.title,
    newResourceParams.url,
  ];
  let queryString = `
    INSERT INTO resources
      (user_id, category_id, title, url, description)
    VALUES($1, $2, $3, $4, $5) `;

  if (newResourceParams.description) {
    queryParams.push(newResourceParams.description);
  } else {
    queryParams.push(null);
  }

  queryString += `RETURNING *`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addResource = addResource;

//delete resource
const deleteResource = function(db, resourceId) {
  let queryParams = [resourceId];
  let queryString = `
    UPDATE resources
    SET is_active = false
    WHERE resources.id = $1
    RETURNING * `;
  // console.log(queryString, queryParams);
  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.deleteResource = deleteResource;

//add a new like
const addLike = function(db, likeParams) {
  const queryParams = [likeParams.user_id, likeParams.resource_id];
  // let queryString = `
  //   INSERT INTO liked_resources (user_id, resource_id)
  //   VALUES ($1, $2)
  //   RETURNING (SELECT count(liked_resources.resource_id)
  //         FROM liked_resources
  //         GROUP BY resource_id
  //         HAVING resource_id = $2)`;

  let queryString = `
    INSERT INTO liked_resources (user_id, resource_id)
    VALUES ($1, $2)
    RETURNING *
    `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0].resource_id)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addLike = addLike;

const countLikes = function(db, resource_id) {
  const queryParams = [resource_id];
  const queryString = `
    SELECT count(liked_resources.resource_id)
    FROM liked_resources
    GROUP BY resource_id
    HAVING resource_id = $1
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.countLikes = countLikes;

const getLikeId = function(db, user_id, resource_id) {
  const queryParams = [user_id, resource_id];
  const queryString = `
    SELECT id
    FROM liked_resources
    WHERE user_id = $1
      AND resource_id = $2;
  `;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0].id)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.getLikeId = getLikeId;

const deleteLike = function(db, like_id) {
  const queryParams = [like_id];
  console.log(like_id);
  const queryString = `
    DELETE FROM liked_resources
    WHERE liked_resources.id = $1
    RETURNING *
  `;
  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.deleteLike = deleteLike;

const usersLikedResources = (db, user_id) => {
  const queryParams = [user_id];
  const queryString = `
    SELECT resource_id
    FROM liked_resources
    WHERE user_id = $1`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.usersLikedResources = usersLikedResources;

//fetch and add comments

const fetchComments = (db, resource_id) => {
  let queryParams = [resource_id];
  let queryString = `
    SELECT comments.*, users.username as username, users.profile_pic as user_profile_pic
    FROM comments
    JOIN users on user_id = users.id
    WHERE resource_id = $1
    ORDER BY comments.comment_date DESC`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.fetchComments = fetchComments;

const addNewComment = (db, newCommentParams) => {
  let queryParams = [
    newCommentParams.user_id,
    newCommentParams.resource_id,
    newCommentParams.message
  ];
  let queryString = `
    INSERT INTO comments (user_id, resource_id, comment)
    VALUES ($1, $2, $3)
    RETURNING *;`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0].resource_id)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addNewComment = addNewComment;

//----------------------RATINGS-------------------------------//

const usersRatedResources = (db, user_id) => {
  const queryParams = [user_id];
  const queryString = `
    SELECT resource_id, rating
    FROM resource_ratings
    WHERE user_id = $1`;
  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.usersRatedResources = usersRatedResources;

const updateRatings = (db, ratingParams) => {
  const queryParams = [
    ratingParams.rating,
    ratingParams.user_id,
    ratingParams.resource_id
  ];
  const queryString = `
    UPDATE resource_ratings
    SET rating = $1
    WHERE user_id = $2 AND resource_id = $3`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.updateRatings = updateRatings;

const addRating = (db, ratingParams) => {
  const queryParams = [
    ratingParams.user_id,
    ratingParams.resource_id,
    ratingParams.rating
  ];
  const queryString = `
    INSERT INTO resource_ratings (user_id, resource_id, rating)
    VALUES ($1, $2, $3)`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.addRating = addRating;

const fetchAverageRating = (db, resource_id) => {
  const queryParams = [resource_id];
  const queryString = `
    SELECT round(AVG(rating),1)
    FROM resource_ratings
    WHERE resource_id = $1
    GROUP BY resource_id`;

  return db
    .query(queryString, queryParams)
    .then(res => res.rows[0])
    .catch(err => {
      console.error("query error", err.stack);
    });
};
exports.fetchAverageRating = fetchAverageRating;
