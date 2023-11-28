import sql from "mssql";

class Order {
  constructor({
    user,
    orderItems,
    shippingAddress,
    paymentMethod,
    paymentResult,
    itemsPrice = 0.0,
    taxPrice = 0.0,
    shippingPrice = 0.0,
    totalPrice = 0.0,
    isPaid = false,
    isDelivered = false,
    paidAt,
    deliveredAt,
  }) {
    this.user = user;
    this.orderItems = orderItems;
    this.shippingAddress = shippingAddress;
    this.paymentMethod = paymentMethod;
    this.paymentResult = paymentResult;
    this.itemsPrice = itemsPrice;
    this.taxPrice = taxPrice;
    this.shippingPrice = shippingPrice;
    this.totalPrice = totalPrice;
    this.isPaid = isPaid;
    this.isDelivered = isDelivered;
    this.paidAt = paidAt;
    this.deliveredAt = deliveredAt;
  }
}

export default Order;
