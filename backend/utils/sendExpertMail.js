import dotenv from "dotenv";
import transporter from "../utils/transporter.js";
import generateToken from "../utils/generateToken.js";

dotenv.config();

const sendExpertMail = async (name, email, expertMail, message, option) => {
  const frontendURL = process.env.FRONTEND_BASE_URL;

  // send email to expert
  if (option === "send mail to expert") {
    console.log(process.env.MAIL_USERNAME);
    // set the correct mail option
    const mailOptions = {
      from: process.env.MAIL_USERNAME, // sender address
      to: expertMail,
      subject: "New Evaluation Mail", // Subject line
      html: `<div>
					<h2>Require Evaluation</h2>
                    <strong>Person Name:</strong>${name}<br>
                    <strong>Person Email:</strong>${email}<br>
					<strong>Person Message: </strong>${message}<br>
					<br>
					
				</div>
				
			`,
    };

    const mailSent = await transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });

    // send a promise since nodemailer is async
    if (mailSent) return Promise.resolve(1);
  }
};

export default sendExpertMail;
