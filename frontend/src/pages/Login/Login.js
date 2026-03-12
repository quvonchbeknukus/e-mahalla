import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert
} from "reactstrap";

import toshkent_img from "./toshkent_tumani.png";

function Login() {

  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    const staticLogin = "admin";
    const staticPassword = "12345";

    if (login === staticLogin && password === staticPassword) {

      localStorage.setItem("token", "true");
      navigate("/home");

    } else {

      setError("Login yoki parol noto'g'ri");

    }
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundImage: `url(${toshkent_img})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative"
      }}
    >

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.55)"
        }}
      />

      <Container style={{ height: "100%", position: "relative", zIndex: 2 }}>
        <Row className="align-items-center justify-content-center" style={{ height: "100%" }}>

          <Col md="4">

            <Card
              style={{
                backdropFilter: "blur(10px)",
                background: "rgba(255,255,255,0.9)",
                borderRadius: "15px",
                boxShadow: "0 15px 40px rgba(0,0,0,0.4)"
              }}
            >
              <CardBody>

                <h3 style={{ textAlign: "center", marginBottom: "25px", fontWeight: "600" }}>
                  Tizimga kirish
                </h3>

                {error && <Alert color="danger">{error}</Alert>}

                <Form onSubmit={handleLogin}>

                  <FormGroup>
                    <Label>Login</Label>
                    <Input
                      type="text"
                      placeholder="Login kiriting"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Parol</Label>
                    <Input
                      type="password"
                      placeholder="Parol kiriting"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </FormGroup>

                  <Button color="primary" block style={{ marginTop: "10px" }}>
                    Kirish
                  </Button>

                </Form>

              </CardBody>
            </Card>

          </Col>

        </Row>
      </Container>

    </div>
  );
}

export default Login;