import express from "express";
import {
  deleteProduct,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
} from "../controllers/productControllers.js";
import { protectRoute, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// @desc fetch all the products, create a product
// @route GET /api/products
// @access PUBLIC
router.route("/").get(getAllProducts).post(protectRoute, createProduct);

// @desc fetch top rated products
// @route GET /api/products/top
// @access PUBLIC
router.route("/top").get(getTopProducts);

// @desc Fetch a single product by id, Delete a product,  update a product
// @route GET /api/products/:id
// @access PUBLIC & PRIVATE/ADMIN
router
  .route("/:id")
  .get(getProductById)
  .delete(protectRoute, deleteProduct)
  .put(protectRoute, updateProduct);

// @desc Create a product review
// @route POST /api/products/:id/reviews
// @access PRIVATE
router.route("/:id/reviews").post(protectRoute, createProductReview);

export default router;
