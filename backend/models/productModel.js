class Reviews {
  constructor(user, name, avatar, rating, review) {
    this.user = user;
    this.name = name;
    this.avatar = avatar;
    this.rating = rating;
    this.review = review;
  }
}

class Product {
  constructor(
    user,
    name,
    image,
    brand,
    category,
    description,
    reviews,
    rating,
    numReviews,
    price,
    countInStock
  ) {
    this.user = user;
    this.name = name;
    this.image = image;
    this.brand = brand;
    this.category = category;
    this.description = description;
    this.reviews = reviews || [];
    this.rating = rating || 0;
    this.numReviews = numReviews || 0;
    this.price = price || 0;
    this.countInStock = countInStock || 0;
  }

  addReview(user, name, avatar, rating, review) {
    const reviewObj = new Reviews(
      user,
      name,
      avatar,
      rating,
      review,
      new Date()
    );
    this.reviews.push(reviewObj);
    this.numReviews = this.reviews.length;
    this.rating =
      this.reviews.reduce((acc, item) => item.rating + acc, 0) /
      this.numReviews;
  }
}

export default Product;
