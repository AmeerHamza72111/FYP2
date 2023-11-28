import React, { useEffect, useState } from "react";
import Rating from "./Rating";
import { Link } from "react-router-dom";
import { Card } from "react-bootstrap";
import axios from "axios";
import "../styles/product.css";
import { getUserDetailsById } from "../actions/userActions";
import { useDispatch, useSelector } from "react-redux";

const Product = ({ product }) => {
  console.log(product);
  const sellerId = product.user_id;
  console.log(sellerId);
  const userDetails = useSelector((state) => state.userDetailsById);
  console.log("User Details", userDetails);
  const { loading, seller, error } = userDetails;
  console.log(seller);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getUserDetailsById(sellerId));
  }, [sellerId]);

  return (
    <Card className="mt-3 p-0">
      <Link to={`/product/${product.id}`}>
        <Card.Img
          loading="lazy"
          className="product-image"
          src={product.image}
          variant="top"
          alt={product.name}
        />
      </Link>

      <Card.Body>
        <Link
          to={`/product/${product.id}`}
          style={{ color: "dimgray", textDecoration: "none" }}
        >
          <Card.Title className="product-title" as="p">
            <strong>{product.name}</strong>
          </Card.Title>
        </Link>
        <Card.Text as="div">
          {product && product.rating && (
            <Rating
              value={product.rating}
              text={`${product.numReviews} Review${
                product.numReviews > 1 ? "s" : ""
              }`}
            />
          )}
        </Card.Text>
        <Card.Text as="h4">
          {product.price &&
            product.price.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
              style: "currency",
              currency: "INR",
            })}
        </Card.Text>
        <Card.Title as="p">
          <strong>Seller Details</strong>
        </Card.Title>
        {seller && seller.isSeller != true ? (
          <>
            <Link
              to={`/sellerDetail/${sellerId}`}
              style={{ color: "dimgray", textDecoration: "none" }}
            >
              <Card.Text>
                <strong>Seller Name: </strong>
                {seller.name}
              </Card.Text>
              <Card.Text>
                <strong>Seller Worth: </strong>
                {seller.SellerWorth} Million
              </Card.Text>
            </Link>
          </>
        ) : (
          <></>
        )}
      </Card.Body>
    </Card>
  );
};

export default Product;
