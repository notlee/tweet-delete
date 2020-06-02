const Twitter = require('twitter-lite');

const client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

const now = new Date();
const maxTweetsDaysAgo = Number.parseInt(process.env.MAX_TWEETS_DAYS_AGO, 10);
const maxLikesDaysAgo = Number.parseInt(process.env.MAX_LIKES_DAYS_AGO, 10);
const keepers = process.env.KEEP && process.env.KEEP.split(',');

const getMoreTweets = (options) => {
  return client.get("statuses/user_timeline", {
    user_id: process.env.USERNAME,
    include_rts: true,
    count: 200,
    ...options
  })
};

const getMoreLikes = (options) => {
  return client.get("favorites/list", {
    user_id: process.env.USERNAME,
    include_rts: true,
    count: 200,
    ...options
  })
};

const removeLike = (like) => {
  console.log(`remove like: ${like.id_str} - ${like.created_at}`);
  return client.post("favorites/destroy", { id: like.id_str });
};

const deleteTweet = (tweet) => {
  console.log(`delete tweet: ${tweet.id_str} - ${tweet.created_at}`);
  return client.post("statuses/destroy", { id: tweet.id_str });
};

module.exports.main = async (event, context) => {

  // Remove tweets.
  try {
    let tweets = await getMoreTweets();

    while(tweets.length) {
      let lastTweetId;
      for(let tweet of tweets) {
        const tweetAge = now - (new Date(Date.parse(tweet.created_at)));
        const daysAgo = Math.floor(tweetAge/60/60/24/1000)

        if(daysAgo > maxTweetsDaysAgo && !keepers.includes(tweet.id_str)) {
          await deleteTweet(tweet);
        } else {
          console.log(`keep tweet: ${tweet.id_str} - ${tweet.created_at}`);
        }
        lastTweetId = tweet.id_str;
      }
      tweets = await getMoreTweets({ max_id: `${BigInt(lastTweetId) - 1n}` });
    }
  } catch(e) {
    console.error(e, JSON.stringify(e, null, 2));
  }

  // Remove likes.
  try {
    let likes = await getMoreLikes();

    while(likes.length) {
      let lastLikeId;
      for(let like of likes) {
        const likeAge = now - (new Date(Date.parse(like.created_at)));
        const daysAgo = Math.floor(likeAge/60/60/24/1000)

        if (daysAgo > maxLikesDaysAgo) {
          await removeLike(like);
        } else {
          console.log(`keep like: ${like.id_str} - ${like.created_at}`);
        }
        lastLikeId = like.id_str;
      }
      likes = await getMoreLikes({ max_id: `${BigInt(lastLikeId) - 1n}` });
    }
  } catch(e) {
    console.error(e, JSON.stringify(e, null, 2));
  }
};
