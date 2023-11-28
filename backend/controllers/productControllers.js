import asyncHandler from "express-async-handler";
import Product from "../models/productModel.js";
import sql from "mssql";
import config from "../config/dbconfig.js";

// @desc fetch all the products
// @route GET /api/products
// @access PUBLIC
const getAllProducts = asyncHandler(async (req, res) => {
  const pool = await sql.connect(config);
  const page = Number(req.query.pageNumber) || 1; // the current page number being fetched
  const pageSize = Number(req.query.pageSize) || 10; // the total number of entries on a single page

  const keyword = req.query.keyword
    ? `WHERE name LIKE '%${req.query.keyword}%'`
    : "";

  // Count the total number of products which match with the given key
  const countResult = await pool
    .request()
    .query(`SELECT COUNT(*) AS count FROM products ${keyword}`);
  const count = countResult.recordset[0].count;

  // Find all products that need to be sent for the current page, by skipping the documents included in the previous pages
  // and limiting the number of documents included in this request
  const productsResult = await pool
    .request()
    .query(
      `SELECT * FROM products ${keyword} ORDER BY createdAt DESC OFFSET ${
        pageSize * (page - 1)
      } ROWS FETCH NEXT ${pageSize} ROWS ONLY`
    );
  const products = productsResult.recordset;

  // send the list of products, current page number, total number of pages available
  res.json({ products, page, pages: Math.ceil(count / pageSize) });
});

// @desc Fetch a single product by id
// @route GET /api/products/:id
// @access PUBLIC
const getProductById = asyncHandler(async (req, res) => {
  const pool = await sql.connect(config);

  const productId = req.params.id;

  const productQuery = `SELECT * FROM products WHERE id = '${productId}'`;
  const productResult = await pool.request().query(productQuery);

  const product = productResult.recordset[0];

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc Delete a product
// @route DELETE /api/products/:id
// @access PRIVATE/ADMIN
const deleteProduct = asyncHandler(async (req, res) => {
  const pool = await sql.connect(config);
  const productId = req.params.id;

  // Check if product exists in the database
  const checkProductQuery = `SELECT * FROM products WHERE id = '${productId}'`;
  const checkProductResult = await pool.request().query(checkProductQuery);

  const product = checkProductResult.recordset[0];

  if (product) {
    // Delete product from the database
    const deleteProductQuery = `DELETE FROM products WHERE id = '${productId}'`;
    await pool.request().query(deleteProductQuery);

    res.json({ message: "Product removed from DB" });
  } else {
    // Throw a custom error so that our error middleware can catch them and return appropriate JSON
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc Create a product
// @route POST /api/products/
// @access PRIVATE/ADMIN
const createProduct = asyncHandler(async (req, res) => {
  try {
    const {
      userId,
      name,
      price,
      brand,
      category,
      countInStock,
      description,
      image,
    } = req.body;
    const pool = await sql.connect();
    const request = pool.request();

    // create a new product with the given details
    const product = {
      user_id: userId,
      name: name,
      brand: brand,
      category: category,
      numReviews: 0,
      countInStock: countInStock,
      price: price,
      rating: 0,
      image: image,
      description: description,
    };

    // insert the product into the database
    const result = await request.query(`
      INSERT INTO products (user_id,name, brand, category, num_reviews, rating,count_in_stock, price, image, description)
      VALUES ('${product.user_id}','${product.name}', '${product.brand}', '${product.category}', '${product.numReviews}','${product.rating}', ${product.countInStock}, ${product.price}, '${product.image}', '${product.description}')
    `);

    // send the newly created product in the response
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc Update a product
// @route PUT /api/products/:id
// @access PRIVATE/ADMIN
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    brand,
    category,
    numReviews,
    countInStock,
    description,
    image,
  } = req.body;

  const pool = await sql.connect(config);
  const product = await pool
    .request()
    .input("productId", sql.Int, req.params.id)
    .query("SELECT * FROM products WHERE id = @productId");
  console.log(product);
  if (product.recordset.length > 0) {
    let query = "UPDATE products SET ";
    const updateFields = [];
    if (name) updateFields.push(`name = '${name}'`);
    if (price) updateFields.push(`price = '${price}'`);
    if (brand) updateFields.push(`brand = '${brand}'`);
    if (category) updateFields.push(`category = '${category}'`);
    if (numReviews) updateFields.push(`num_reviews = '${numReviews}'`);
    if (countInStock) updateFields.push(`count_in_Stock = '${countInStock}'`);
    if (description) updateFields.push(`description = '${description}'`);
    if (image) updateFields.push(`image = '${image}'`);
    query += updateFields.join(", ");
    query += ` WHERE id = ${req.params.id}`;

    const result = await pool.request().query(query);
    if (result.rowsAffected[0] > 0) {
      res.status(201).json({ message: "Product updated successfully" });
    } else {
      res.status(400);
      throw new Error("Product not updated");
    }
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc Create a product review
// @route POST /api/products/:id/reviews
// @access PRIVATE
const createProductReview = async (req, res) => {
  const pool = await sql.connect(config);
  const { rating, review } = req.body;

  try {
    const productId = req.params.id;
    const userId = req.user._id;

    // Check if the user has already reviewed this product
    const { recordset: reviews } = await pool
      .request()
      .input("productId", sql.Int, productId)
      .input("userId", sql.NVarChar(50), userId)
      .query(
        `SELECT * FROM ProductReview WHERE ProductId = @productId AND UserId = @userId`
      );

    if (reviews.length > 0) {
      res.status(400);
      throw new Error("Product Already Reviewed");
    }

    // Create a new review object
    const { recordset: user } = await pool
      .request()
      .input("userId", sql.NVarChar(50), userId)
      .query(`SELECT * FROM Users WHERE Id = @userId`);

    const newReview = {
      name: user[0].name,
      user: userId,
      avatar: user[0].avatar,
      rating: Number(rating),
      review,
    };

    // Insert the new review into the database
    const { rowsAffected } = await pool
      .request()
      .input("productId", sql.Int, productId)
      .input("userId", sql.NVarChar(50), userId)
      .input("name", sql.NVarChar(50), newReview.name)
      .input("avatar", sql.NVarChar(255), newReview.avatar)
      .input("rating", sql.Float, newReview.rating)
      .input("review", sql.NVarChar(sql.MAX), newReview.review)
      .query(
        `INSERT INTO ProductReview (ProductId, UserId, Name, Avatar, Rating, Review) VALUES (@productId, @userId, @name, @avatar, @rating, @review)`
      );

    if (rowsAffected[0] !== 1) {
      res.status(400);
      throw new Error("Review could not be added");
    }

    // Update the product's rating and number of reviews
    const { recordset: product } = await pool
      .request()
      .input("productId", sql.Int, productId)
      .query(`SELECT * FROM Products WHERE Id = @productId`);

    const { recordset: productReviews } = await pool
      .request()
      .input("productId", sql.Int, productId)
      .query(`SELECT * FROM ProductReview WHERE ProductId = @productId`);

    const numReviews = productReviews.length;
    const ratingSum = productReviews.reduce(
      (acc, review) => acc + review.rating,
      0
    );
    const rating = ratingSum / numReviews;

    const { rowsAffected: productRowsAffected } = await pool
      .request()
      .input("productId", sql.Int, productId)
      .input("numReviews", sql.Int, numReviews)
      .input("rating", sql.Float, rating)
      .query(
        `UPDATE Products SET NumReviews = @numReviews, Rating = @rating WHERE Id = @productId`
      );

    if (productRowsAffected[0] !== 1) {
      res.status(400);
      throw new Error("Product could not be updated");
    }

    res.status(201).json({ message: "Review Added" });
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  } finally {
    pool.close();
  }
};

// @desc fetch top rated products
// @route GET /api/products/top
// @access PUBLIC
const getTopProducts = asyncHandler(async (req, res) => {
  try {
    const pool = await sql.connect(config); // establish a connection to the database
    const result = await pool
      .request()
      .query("SELECT TOP 4 * FROM products ORDER BY rating DESC");
    res.json(result.recordset);
  } catch (error) {
    res.status(500);
    throw new Error("Server Error");
  }
});

export {
  getProductById,
  getAllProducts,
  deleteProduct,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
};
