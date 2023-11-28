import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Form,
  Button,
  InputGroup,
  FloatingLabel,
  Row,
  Col,
} from "react-bootstrap";
import Loader from "../components/Loader";
import Message from "../components/Message";
import FormContainer from "../components/FormContainer";
import { registerSellerUser } from "../actions/userActions";
import "../styles/sellerAccount.css";

const SellerAcountRegistration = ({ location, history }) => {
  const [typePassword, setTypePassword] = useState("password");
  const [typeConfirmPassword, setTypeConfirmPassword] = useState("password");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [revenueWeight, setRevenueWeight] = useState();
  const [netIncomeWeight, setIncomeWeight] = useState();
  const [growthWeight, setGrowthWeight] = useState();
  const [marketWeight, setMarketWeight] = useState();
  const [employeeWeight, setEmployeeWeight] = useState();
  const [debtWeight, setDebtWeight] = useState();
  const [cashOnWeight, setCashOnWeight] = useState();
  const [customerWeight, setCustomerWeight] = useState();
  const [IntellectualWeight, setIntellectualWeight] = useState();
  const [ManagementWeight, setManagementWeight] = useState();
  const [isSeller, setIsSeller] = useState(1);
  console.log({
    name,
    email,
    password,
    isSeller,
    revenueWeight,
    netIncomeWeight,
    growthWeight,
    marketWeight,
    employeeWeight,
    debtWeight,
    cashOnWeight,
    customerWeight,
    IntellectualWeight,
    ManagementWeight,
  });
  const dispatch = useDispatch();

  const redirect = location.search ? location.search.split("=")[1] : "";
  const userRegister = useSelector((state) => state.userRegister);
  const { loading, userInfo, error } = userRegister;

  useEffect(() => {
    if (userInfo) {
      localStorage.setItem("promptEmailVerfication", "true");
      history.push(redirect);
    }
  }, [history, redirect, userInfo]);

  const showHidePassword = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTypePassword(typePassword === "password" ? "text" : "password");
  };
  const showHideConfirmPassword = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTypeConfirmPassword(
      typeConfirmPassword === "password" ? "text" : "password"
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords do not match. Please retry.");
    } else {
      dispatch(
        registerSellerUser(
          name,
          email,
          password,
          isSeller,
          revenueWeight,
          netIncomeWeight,
          growthWeight,
          marketWeight,
          employeeWeight,
          debtWeight,
          cashOnWeight,
          customerWeight,
          IntellectualWeight,
          ManagementWeight
        )
      );
    }
  };

  return (
    <div>
      <div className="form-inner-container">
        <div className="form-heading">
          <h1>Seller Account Registration</h1>
        </div>
        {message && (
          <Message dismissible variant="warning" duration={10}>
            {message}
          </Message>
        )}
        {error && (
          <Message dismissible variant="danger" duration={10}>
            {error}
          </Message>
        )}
        {loading ? (
          <Loader />
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="name" className="mb-2">
              <FloatingLabel
                controlId="nameinput"
                label="Name"
                className="mb-3"
              >
                <Form.Control
                  size="lg"
                  placeholder="Enter Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FloatingLabel>
            </Form.Group>
            <Form.Group controlId="email" className="my-2">
              <FloatingLabel
                controlId="emailinput"
                label="Email Address"
                className="mb-3"
              >
                <Form.Control
                  size="lg"
                  placeholder="Enter Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FloatingLabel>
            </Form.Group>
            <Form.Group>
              <InputGroup>
                <FloatingLabel
                  controlId="passwordinput"
                  label="Password"
                  style={{
                    display: "flex",
                    width: "100%",
                  }}
                  className="mb-3"
                >
                  <Form.Control
                    size="lg"
                    type={typePassword}
                    placeholder="Enter your password"
                    value={password}
                    style={{
                      borderRight: "none",
                    }}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="input-group-append">
                    <InputGroup.Text
                      onClick={showHidePassword}
                      style={{
                        fontSize: "1rem",
                        height: "100%",
                        marginLeft: "-0.5em",
                        background: "transparent",
                        borderLeft: "none",
                      }}
                    >
                      {typePassword === "text" ? (
                        <i className="far fa-eye-slash" />
                      ) : (
                        <i className="far fa-eye" />
                      )}
                    </InputGroup.Text>
                  </div>
                </FloatingLabel>
              </InputGroup>
            </Form.Group>
            <Form.Group>
              <InputGroup>
                <FloatingLabel
                  controlId="confirmpasswordinput"
                  label="Confirm password"
                  style={{ display: "flex", width: "100%" }}
                  className="mb-3"
                >
                  <Form.Control
                    size="lg"
                    type={typeConfirmPassword}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    style={{
                      borderRight: "none",
                    }}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className="input-group-append">
                    <InputGroup.Text
                      onClick={showHideConfirmPassword}
                      style={{
                        fontSize: "1rem",
                        height: "100%",
                        marginLeft: "-0.5em",
                        background: "transparent",
                        borderLeft: "none",
                      }}
                    >
                      {typeConfirmPassword === "text" ? (
                        <i className="far fa-eye-slash" />
                      ) : (
                        <i className="far fa-eye" />
                      )}
                    </InputGroup.Text>
                  </div>
                </FloatingLabel>
              </InputGroup>
            </Form.Group>
            <Row>
              <h2 class="worthHeading">
                Please Specify more details about your Business for Worth
                Calculations
              </h2>
              <fieldset>
                <legend>
                  <b>Question 1: What is the business's annual revenue?</b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q1"
                    value="1"
                    onChange={(e) => setRevenueWeight(1)}
                  />{" "}
                  Less than $1 million
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q1"
                    value="3"
                    onChange={(e) => setRevenueWeight(3)}
                  />{" "}
                  Between $1 million and $10 million
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q1"
                    value="5"
                    onChange={(e) => setRevenueWeight(5)}
                  />{" "}
                  More than $10 million
                </label>
                <br />
              </fieldset>
              <fieldset>
                <legend>
                  <b>Question 2: What is the business's net income?</b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q2"
                    value="1"
                    onChange={(e) => setIncomeWeight(1)}
                  />{" "}
                  Negative (loss)
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q2"
                    value="3"
                    onChange={(e) => setIncomeWeight(3)}
                  />{" "}
                  Between $0 and $1 million
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q2"
                    value="5"
                    onChange={(e) => setIncomeWeight(5)}
                  />{" "}
                  More than $1 million
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>Question 3: What is the industry growth rate?</b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q3"
                    value="1"
                    onChange={(e) => setGrowthWeight(1)}
                  />{" "}
                  Less than 5%
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q3"
                    value="3"
                    onChange={(e) => setGrowthWeight(3)}
                  />{" "}
                  Between 5% and 10%
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q3"
                    value="5"
                    onChange={(e) => setGrowthWeight(5)}
                  />{" "}
                  More than 10%
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>Question 4: What is the business's market share?</b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q4"
                    value="1"
                    onChange={(e) => setMarketWeight(1)}
                  />{" "}
                  Less than 5%
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q4"
                    value="3"
                    onChange={(e) => setMarketWeight(3)}
                  />{" "}
                  Between 5% and 20%
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q4"
                    value="5"
                    onChange={(e) => setMarketWeight(5)}
                  />{" "}
                  More than 20%
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>Question 5: How many employees does the business have?</b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q5"
                    value="1"
                    onChange={(e) => setEmployeeWeight(1)}
                  />{" "}
                  Less than 10
                </label>
                <br />

                <label>
                  <input
                    type="radio"
                    name="q5"
                    value="3"
                    onChange={(e) => setEmployeeWeight(3)}
                  />{" "}
                  Between 10 and 50
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q5"
                    value="5"
                    onChange={(e) => setEmployeeWeight(5)}
                  />{" "}
                  More than 50
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>Question 6: How much debt does the business have?</b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q6"
                    value="5"
                    onChange={(e) => setDebtWeight(5)}
                  />{" "}
                  No debt
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q6"
                    value="3"
                    onChange={(e) => setDebtWeight(3)}
                  />{" "}
                  Between $1 million and $5 million
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q6"
                    value="1"
                    onChange={(e) => setDebtWeight(1)}
                  />{" "}
                  More than $5 million
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>
                    Question 7: How much cash does the business have on hand?
                  </b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q7"
                    value="1"
                    onChange={(e) => setCashOnWeight(1)}
                  />{" "}
                  Less than $500,000
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q7"
                    value="3"
                    onChange={(e) => setDebtWeight(3)}
                  />
                  Between $500,000 and $1 million
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q7"
                    value="5"
                    onChange={(e) => setDebtWeight(5)}
                  />{" "}
                  More than $1 million
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>
                    Question 8: What is the business's customer retention rate?
                  </b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q8"
                    value="1"
                    onChange={(e) => setCustomerWeight(1)}
                  />{" "}
                  Less than 50%
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q8"
                    value="3"
                    onChange={(e) => setCustomerWeight(3)}
                  />{" "}
                  Between 50% and 75%
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q8"
                    value="5"
                    onChange={(e) => setCustomerWeight(5)}
                  />{" "}
                  More than 75%
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>
                    Question 9: How much intellectual property does the business
                    own?
                  </b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q9"
                    value="1"
                    onChange={(e) => setIntellectualWeight(1)}
                  />
                  None
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q9"
                    value="3"
                    onChange={(e) => setIntellectualWeight(3)}
                  />{" "}
                  Some (patents, trademarks,etc.)
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q9"
                    value="5"
                    onChange={(e) => setIntellectualWeight(5)}
                  />{" "}
                  Significant (proprietary,technology, trade secrets, etc.)
                </label>
                <br />
              </fieldset>

              <fieldset>
                <legend>
                  <b>
                    Question 10: What is the quality of the business's
                    management team?
                  </b>
                </legend>
                <label>
                  <input
                    type="radio"
                    name="q10"
                    value="1"
                    onChange={(e) => setManagementWeight(1)}
                  />
                  Poor (high turnover, lack of experience, etc.)
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q10"
                    value="3"
                    onChange={(e) => setManagementWeight(3)}
                  />{" "}
                  Average (some experience,but room for improvement)
                </label>
                <br />
                <label>
                  <input
                    type="radio"
                    name="q10"
                    value="5"
                    onChange={(e) => setManagementWeight(5)}
                  />{" "}
                  Excellent (experienced,effective leadership, etc.)
                </label>
                <br />
              </fieldset>
            </Row>
            <Row>
              <Col
                style={{
                  display: "flex",
                }}
              >
                <Button
                  type="submit"
                  className="ms-auto"
                  style={{
                    padding: "0.5em 1em",
                    width: "8rem",
                  }}
                >
                  Register
                </Button>
              </Col>
            </Row>
          </Form>
        )}
      </div>
    </div>
  );
};
export default SellerAcountRegistration;
