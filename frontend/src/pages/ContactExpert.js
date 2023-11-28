import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import "../styles/contactExpert.css";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { contactExpert } from "../actions/userActions";
import Message from "../components/Message";

const ContactExpert = () => {
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [message, setMessage] = useState();
  const [result, setResult] = useState();
  const dispatch = useDispatch();
  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(contactExpert(name, email, message));
    setResult("You Messages has been delivered successfully!");
  };

  return (
    <>
      <Form onSubmit={handleSubmit}>
        <div class="section-heading">
          <h4>Contact Expert</h4>
        </div>
        {result && (
          <Message dismissible variant="warning" duration={10}>
            {result}
          </Message>
        )}
        <div class="inputField">
          <input
            type="name"
            name="name"
            id="name"
            placeholder="Your name"
            autocomplete="on"
            onChange={(e) => setName(e.target.value)}
            required
          />
          <span class="valid_info_name"></span>
        </div>

        <div class="inputField">
          <input
            type="Email"
            name="email"
            id="email"
            placeholder="Your email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <span class="valid_info_email"></span>
        </div>

        <div class="inputField">
          <textarea
            name="message"
            placeholder="Your message"
            onChange={(e) => setMessage(e.target.value)}
            required
          ></textarea>
          <span class="valid_info_message"></span>
        </div>

        <div class="inputField">
          <button type="submit" id="form-submit" class="main-gradient-button">
            Send a message
          </button>
        </div>
      </Form>
    </>
  );
};

export default ContactExpert;
