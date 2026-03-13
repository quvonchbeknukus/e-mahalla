import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import { loginWithCredentials } from "../../utils/auth";
import "./LoginModal.css";

function LoginModal({ isOpen, toggle, onSuccess }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLogin("");
      setPassword("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const isValid = loginWithCredentials(login, password);

    if (!isValid) {
      setError("Login yoki parol noto'g'ri");
      return;
    }

    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered contentClassName="login-modal-content">
      <ModalHeader toggle={toggle} className="login-modal-header">
        Tizimga kirish
      </ModalHeader>
      <ModalBody className="login-modal-body">
        {error && <Alert color="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label for="map-login">Login</Label>
            <Input
              id="map-login"
              type="text"
              placeholder="Login kiriting"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </FormGroup>

          <FormGroup>
            <Label for="map-password">Parol</Label>
            <Input
              id="map-password"
              type="password"
              placeholder="Parol kiriting"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormGroup>

          <Button color="primary" className="login-modal-submit">
            Kirish
          </Button>
        </Form>
      </ModalBody>
    </Modal>
  );
}

export default LoginModal;
