import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { React, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "../styles/sellerMileStone.css";
import Message from "../components/Message";
import { postSellerMileStone } from "../actions/userActions";

const SellerMileStone = () => {
  const [milestone, setMilestone] = useState();
  const [message, setMessage] = useState();

  const dispatch = useDispatch();
  const userLogin = useSelector((state) => state.userLogin);
  const { userInfo } = userLogin;
  console.log(userInfo);
  const userId = userInfo.id;
  console.log(userId);
  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(postSellerMileStone(userId, milestone));
    setMessage("You Milestone has been added successfully!");
  };
  console.log(milestone);
  return (
    <Form onSubmit={handleSubmit}>
      {message && (
        <Message dismissible variant="warning" duration={5}>
          {message}
        </Message>
      )}
      <div class="section-heading">
        <h4>Seller Milestones</h4>
      </div>

      <div class="">
        <textarea
          name="message"
          id="message"
          placeholder="Your milestone"
          onChange={(e) => setMilestone(e.target.value)}
          required
        ></textarea>
        <span class="valid_info_message"></span>
      </div>

      <div class=" btn">
        <button type="submit" id="form-submit" class="main-gradient-button">
          Submit
        </button>
      </div>
    </Form>
  );
};

export default SellerMileStone;
