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
import { getAuthErrorMessage, loginWithCredentials } from "../../utils/auth";
import "./LoginModal.css";

function LoginModal({ isOpen, toggle, onSuccess }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLogin("");
      setPassword("");
      setError("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const user = await loginWithCredentials(login, password);
      onSuccess(user);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
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
            <Label for="map-login">Telefon</Label>
            <Input
              id="map-login"
              type="text"
              placeholder="Telefon raqamingizni kiriting"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              disabled={submitting}
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
              disabled={submitting}
            />
          </FormGroup>

          <Button color="primary" className="login-modal-submit" disabled={submitting}>
            {submitting ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </Form>
      </ModalBody>
    </Modal>
  );
}

export default LoginModal;
