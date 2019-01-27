const Article = require("../models/article");
const Feed = require("../models/feed");
const Setting = require("../models/setting");

const Sequelize = require("sequelize");
const Op = Sequelize.Op;

//the getArticles function returns an array with all the article ids
exports.getArticles = async (req, res, next) => {
  try {
    //set default values
    var categoryId = "%";
    var feedId = "%";
    var status = "unread";
    var sort = "DESC";

    //retrieve previous used settings from the database if firstLoad is true
    if (req.query.firstLoad) {
      const sortSetting = await Setting.findOne({
        where: { key_name: "sort" },
        attributes: ["key_value"],
        raw: true
      });
      const feedIdSetting = await Setting.findOne({
        where: { key_name: "feedId" },
        attributes: ["key_value"],
        raw: true
      });
      const categoryIdSetting = await Setting.findOne({
        where: { key_name: "categoryId" },
        attributes: ["key_value"],
        raw: true
      });
      const statusSetting = await Setting.findOne({
        where: { key_name: "status" },
        attributes: ["key_value"],
        raw: true
      });

      //use database values, if available
      if (categoryIdSetting) categoryId = categoryIdSetting.key_value;
      if (feedIdSetting) feedId = feedIdSetting.key_value;
      if (statusSetting) status = statusSetting.key_value;
      if (sortSetting) sort = sortSetting.key_value;
    }

    //use query parameters instead if provided
    if (req.query.categoryId) categoryId = req.query.categoryId;
    if (req.query.feedId) feedId = req.query.feedId;
    if (req.query.status) status = req.query.status;
    if (req.query.sort) sort = req.query.sort;

    //set default values before querying all items
    let search = req.query.search || "%";
    if (search !== "%") search = "%" + search + "%";

    //populate an array with all the feed ids based on the categoryId
    if (categoryId == "%") {
      feeds = await Feed.findAll({
        attributes: ["id"]
      });
    } else {
      feeds = await Feed.findAll({
        attributes: ["id"],
        where: {
          categoryId: {
            [Op.like]: categoryId
          }
        }
      });
    }

    //if the feedId is set, set it equal to all feedIds
    if (feedId != "%") {
      feedIds = feedId;
    } else {
      //build array based on previous results and push all ids to the array
      feedIds = [];
      if (feeds.length > 0) {
        feeds.forEach(feed => {
          feedIds.push(feed.id);
        });
      }
    }

    //if star isn't set, then use the status field to query against
    if (status != "star") {
      articles = await Article.findAll({
        attributes: ["id"],
        order: [["published", sort]],
        where: {
          status: status,
          feedId: feedIds,
          subject: {
            [Op.like]: search
          },
          content: {
            [Op.like]: search
          }
        }
      });
    }

    //if star is set, then use the starInd field to query against
    if (status == "star") {
      articles = await Article.findAll({
        attributes: ["id"],
        order: [["published", sort]],
        where: {
          feedId: feedIds,
          subject: {
            [Op.like]: search
          },
          content: {
            [Op.like]: search
          },
          starInd: 1
        }
      });
    }

    //push all ids to the array
    itemIds = [];
    if (articles.length > 0) {
      articles.forEach(article => {
        itemIds.push(article.id);
      });
    }

    //return all query params and itemIds
    res.status(200).json({
      query: [
        { 
          categoryId: categoryId, 
          feedId: feedId, 
          sort: sort, 
          status: status 
        }
      ],
      itemIds: itemIds
    });

    //destroy settings
    await Setting.destroy({ where: {} });

    //update all settings
    await Setting.create({
      key_name: "sort",
      key_value: sort
    });

    await Setting.create({
      key_name: "status",
      key_value: status
    });

    await Setting.create({
      key_name: "categoryId",
      key_value: categoryId
    });

    await Setting.create({
      key_name: "feedId",
      key_value: feedId
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
};

//the getArticle function returns the article details based on the articleId (array) argument
exports.getArticle = (req, res, next) => {
  const articleId = req.params.articleId;
  Article.findByPk(articleId, {
    include: [
      {
        model: Feed,
        required: true
      }
    ]
  })
    .then(article => {
      console.log(article);
      res.status(200).json({
        article: article
      });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json(err);
    });
};
