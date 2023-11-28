import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";
import sql from "mssql";
import config from "../config/dbconfig.js";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc  create a new order
// @route GET /api/orders
// @access PRIVATE
const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  } = req.body;

  if (orderItems && !orderItems.length) {
    res.status(401);
    throw new Error("No order items");
  } else {
    try {
      const pool = await sql.connect(config); // replace `config` with your database configuration object
      const request = pool.request();

      const user = req.user._id; // assuming `req.user._id` is a valid user ID

      // insert the order into the `orders` table
      const result = await request
        .input("user", sql.Int, user)
        .input("orderItems", sql.NVarChar, JSON.stringify(orderItems))
        .input("shippingAddress", sql.NVarChar, JSON.stringify(shippingAddress))
        .input("paymentMethod", sql.NVarChar, paymentMethod)
        .input("itemsPrice", sql.Decimal(10, 2), itemsPrice)
        .input("shippingPrice", sql.Decimal(10, 2), shippingPrice)
        .input("taxPrice", sql.Decimal(10, 2), taxPrice)
        .input("totalPrice", sql.Decimal(10, 2), totalPrice)
        .query(
          `INSERT INTO orders (user_id, order_items, shipping_address, payment_method, items_price, shipping_price, tax_price, total_price)
          VALUES (@user, @orderItems, @shippingAddress, @paymentMethod, @itemsPrice, @shippingPrice, @taxPrice, @totalPrice);
          SELECT SCOPE_IDENTITY() AS orderId;`
        );

      const orderId = result.recordset[0].orderId; // get the ID of the newly inserted order

      res.status(201).json({
        _id: orderId,
        user,
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
      });
    } catch (error) {
      console.log(error);
      res.status(500);
      throw new Error("Server error");
    }
  }
});

// @desc  get an order by id
// @route GET /api/orders/:id
// @access PRIVATE
const getOrderById = asyncHandler(async (req, res) => {
  const pool = await sql.connect(config);
  const request = pool.request();
  request.input("id", sql.Int, req.params.id);
  const result = await request.query("SELECT * FROM Orders WHERE id = @id");

  if (result.recordset.length === 0) {
    res.status(401);
    throw new Error("Order not found");
  }

  const order = result.recordset[0];
  const reqOrder = new Order({
    id: order.id,
    user: order.user,
    orderItems: order.orderItems,
    shippingAddress: order.shippingAddress,
    paymentMethod: order.paymentMethod,
    paymentResult: order.paymentResult,
    itemsPrice: order.itemsPrice,
    taxPrice: order.taxPrice,
    shippingPrice: order.shippingPrice,
    totalPrice: order.totalPrice,
    isPaid: order.isPaid,
    isDelivered: order.isDelivered,
    paidAt: order.paidAt,
    deliveredAt: order.deliveredAt,
  });

  res.status(201).json(reqOrder);
});

// @desc  update the order object once paid
// @route PUT /api/orders/:id/pay
// @access PRIVATE
const updateOrderToPay = async (req, res) => {
  const pool = await sql.connect(config);

  try {
    const order = await pool
      .request()
      .input("orderId", sql.Int, req.params.id)
      .query("SELECT * FROM Orders WHERE id = @orderId");

    if (!order.recordset[0]) {
      res.status(401);
      throw new Error("Order not found");
    }

    const { paymentMode } = req.body;
    const { id, status } = req.body;
    const { update_time, payer, receipt_email } = req.body;

    const updateResult = await pool
      .request()
      .input("orderId", sql.Int, req.params.id)
      .input("isPaid", sql.Bit, true)
      .input("paidAt", sql.DateTime2, new Date())
      .input(
        "paymentResult",
        sql.NVarChar,
        JSON.stringify({
          type: paymentMode,
          id,
          status,
          email_address:
            paymentMode === "paypal" ? payer.email_address : receipt_email,
          update_time,
        })
      )
      .query(
        `UPDATE Orders SET is_paid = @isPaid, paid_at = @paidAt, payment_result = @paymentResult WHERE id = @orderId`
      );

    if (updateResult.rowsAffected[0] !== 1) {
      throw new Error("Failed to update order payment status");
    }

    const updatedOrder = {
      ...order.recordset[0],
      isPaid: true,
      paidAt: new Date(),
      paymentResult: {
        type: paymentMode,
        id,
        status,
        email_address:
          paymentMode === "paypal" ? payer.email_address : receipt_email,
        update_time,
      },
    };

    res.status(201).json(updatedOrder);
  } catch (error) {
    res.status(500);
    throw new Error(`Error updating order payment status: ${error.message}`);
  } finally {
    pool.close();
  }
};

// @desc  update the order object once delivered
// @route PUT /api/orders/:id/pay
// @access PRIVATE/ADMIN
const updateOrderToDeliver = async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM orders WHERE id = @id");

    const order = result.recordset[0];
    if (order) {
      order.isDelivered = true;
      order.deliveredAt = new Date();

      const updatedResult = await pool
        .request()
        .input("isDelivered", sql.Bit, order.isDelivered)
        .input("deliveredAt", sql.DateTime, order.deliveredAt)
        .input("id", sql.Int, req.params.id)
        .query(
          "UPDATE orders SET is_delivered = @isDelivered, delivered_at = @deliveredAt WHERE id = @id"
        );

      res.status(201).json(updatedResult);
    } else {
      res.status(404);
      throw new Error("Order not found");
    }
  } catch (error) {
    res.status(500);
    throw new Error(`Error updating order: ${error.message}`);
  }
};

// @desc  fetch the orders of the user logged in
// @route GET /api/orders/myorders
// @access PRIVATE
const getMyOrders = async (req, res) => {
  console.log(req.user);
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.id)
      .query(
        "SELECT * FROM Orders WHERE user = @userId ORDER BY createdAt DESC"
      );
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(`Error retrieving orders: ${error.message}`);
  }
};

// @desc  fetch all orders
// @route GET /api/orders
// @access PRIVATE/ADMIN
const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const page = Number(req.query.pageNumber) || 1; // the current page number in the pagination
    const pageSize = 20; // total number of entries on a single page

    const countResult = await pool
      .request()
      .query("SELECT COUNT(*) AS count FROM Orders");
    const count = countResult.recordset[0].count; // total number of documents available

    // find all orders that need to be sent for the current page, by skipping the documents included in the previous pages
    // and limiting the number of documents included in this request
    // sort this in desc order that the document was created at
    const queryResult = await pool
      .request()
      .input("pageSize", sql.Int, pageSize)
      .input("page", sql.Int, pageSize * (page - 1))
      .query(
        `SELECT * FROM Orders ORDER BY createdAt DESC OFFSET @page ROWS FETCH NEXT @pageSize ROWS ONLY`
      );

    // send the list of orders, current page number, total number of pages available
    res.json({
      orders: queryResult.recordset,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  } finally {
    sql.close();
  }
});

// @desc  create payment intent for stripe payment
// @route POST /api/orders/stripe-payment
// @access PUBLIC
const stripePayment = asyncHandler(async (req, res) => {
  const { price, email } = req.body;

  // Need to create a payment intent according to stripe docs
  // https://stripe.com/docs/api/payment_intents
  const paymentIntent = await stripe.paymentIntents.create({
    amount: price,
    currency: "inr",
    receipt_email: email,
    payment_method_types: ["card"],
  });

  // send this payment intent to the client side
  res.send({
    clientSecret: paymentIntent.client_secret,
  });

  // another way to include payments, is to create a new charge for a new customer, each time
  // similar to Hitesh's video on accepting stripe payments
  // But uses out dated stripe technique, so excluded for the current implementation

  // const { order, token } = req.body;
  // const idempotencyKey = nanoid();
  // return stripe.customers
  // 	.create({
  // 		email: token.email,
  // 		source: token.id,
  // 	})
  // 	.then((customer) => {
  // 		stripe.charges.create(
  // 			{
  // 				amount: order.totalPrice * 100,
  // 				currency: 'inr',
  // 				customer: customer.id,
  // 				receipt_email: token.email,
  // 				// description: product.name,
  // 			},
  // 			{ idempotencyKey }
  // 		);
  // 	})
  // 	.then((result) => res.status(200).json(result))
  // 	.catch((err) => console.log(err));
});

export {
  addOrderItems,
  getOrderById,
  updateOrderToPay,
  updateOrderToDeliver,
  getMyOrders,
  getAllOrders,
  stripePayment,
};
