import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
} from "reactstrap";
import { apiRequest, getAuthErrorMessage } from "../../utils/auth";

const CRIME_LEVEL_OPTIONS = [
  { value: "yashil", label: "Yashil mahalla" },
  { value: "sariq", label: "Sariq mahalla" },
  { value: "qizil", label: "Qizil mahalla" },
];

function createFormState(neighborhood) {
  return {
    name: neighborhood?.name ?? "",
    crime_level: neighborhood?.crime_level ?? "yashil",
    lat: neighborhood?.lat ?? "",
    long: neighborhood?.long ?? "",
    neighborhood_chairman: neighborhood?.neighborhood_chairman ?? "",
    neighborhood_phone: neighborhood?.neighborhood_phone ?? "",
    prevention_inspector: neighborhood?.prevention_inspector ?? "",
    inspector_phone: neighborhood?.inspector_phone ?? "",
  };
}

function NeighborhoodEditModal({
  isOpen,
  toggle,
  neighborhood,
  onSuccess,
  mode = "edit",
}) {
  const isCreateMode = mode === "create";
  const [formData, setFormData] = useState(() => createFormState(neighborhood));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData(createFormState(neighborhood));
    setError("");
    setSubmitting(false);
  }, [isOpen, neighborhood]);

  const updateField = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isCreateMode && !neighborhood?.id) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await apiRequest(
        isCreateMode ? "/neighborhoods" : `/neighborhoods/${neighborhood.id}`,
        {
          method: isCreateMode ? "POST" : "PUT",
          body: {
            ...formData,
            lat: String(formData.lat).trim(),
            long: String(formData.long).trim(),
          },
          authenticated: true,
          stopOnStatuses: [401, 422],
        }
      );

      onSuccess?.(response.data);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = isCreateMode
    ? "Yangi mahalla qo'shish"
    : "Mahallani tahrirlash";

  const submitLabel = submitting
    ? isCreateMode
      ? "Qo'shilmoqda..."
      : "Saqlanmoqda..."
    : isCreateMode
      ? "Qo'shish"
      : "Saqlash";

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>{modalTitle}</ModalHeader>

      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && <Alert color="danger">{error}</Alert>}

          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-name">Mahalla nomi</Label>
                <Input
                  id="edit-neighborhood-name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>

            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-crime-level">Mahalla turi</Label>
                <Input
                  id="edit-neighborhood-crime-level"
                  type="select"
                  value={formData.crime_level}
                  onChange={(event) => updateField("crime_level", event.target.value)}
                  disabled={submitting}
                  required
                >
                  {CRIME_LEVEL_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-lat">Latitude</Label>
                <Input
                  id="edit-neighborhood-lat"
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(event) => updateField("lat", event.target.value)}
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>

            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-long">Longitude</Label>
                <Input
                  id="edit-neighborhood-long"
                  type="number"
                  step="any"
                  value={formData.long}
                  onChange={(event) => updateField("long", event.target.value)}
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-chairman">Mahalla raisi</Label>
                <Input
                  id="edit-neighborhood-chairman"
                  type="text"
                  value={formData.neighborhood_chairman}
                  onChange={(event) =>
                    updateField("neighborhood_chairman", event.target.value)
                  }
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>

            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-phone">Telefon</Label>
                <Input
                  id="edit-neighborhood-phone"
                  type="text"
                  value={formData.neighborhood_phone}
                  onChange={(event) =>
                    updateField("neighborhood_phone", event.target.value)
                  }
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-inspector">
                  Profilaktika inspektori
                </Label>
                <Input
                  id="edit-neighborhood-inspector"
                  type="text"
                  value={formData.prevention_inspector}
                  onChange={(event) =>
                    updateField("prevention_inspector", event.target.value)
                  }
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>

            <Col md="6">
              <FormGroup>
                <Label for="edit-neighborhood-inspector-phone">
                  Inspektor telefoni
                </Label>
                <Input
                  id="edit-neighborhood-inspector-phone"
                  type="text"
                  value={formData.inspector_phone}
                  onChange={(event) =>
                    updateField("inspector_phone", event.target.value)
                  }
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={submitting}>
            Bekor qilish
          </Button>

          <Button color="primary" type="submit" disabled={submitting}>
            {submitLabel}
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
}

export default NeighborhoodEditModal;
