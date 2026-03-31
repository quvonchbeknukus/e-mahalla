import { useEffect, useRef, useState } from "react";
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
import {
  filterValidTaskImages,
  hasOversizedTaskImages,
  MAX_IMAGES_PER_TASK,
  optimizeTaskImages,
  TASK_IMAGE_AUTO_OPTIMIZE_NOTE,
  TASK_IMAGE_PROCESSING_MESSAGE,
  TASK_IMAGE_READY_MESSAGE,
  TASK_IMAGE_SIZE_ERROR_MESSAGE,
  TASK_IMAGE_WAIT_MESSAGE,
} from "../../utils/taskImages";

function createEmptyWork(id) {
  return {
    id,
    text: "",
    images: [],
    imageMessage: "",
    imageStatusMessage: "",
    processingImages: false,
  };
}

function WorkModal({ open, setOpen }) {
  const toggle = () => setOpen(!open);
  const nextWorkIdRef = useRef(1);
  const imageSelectionTokenRef = useRef({});

  const [mahalla, setMahalla] = useState("");
  const [yonalish, setYonalish] = useState("");
  const [sana, setSana] = useState("");
  const [works, setWorks] = useState([createEmptyWork(0)]);
  const [mahallalar, setMahallalar] = useState([]);
  const [yonalishlar, setYonalishlar] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    nextWorkIdRef.current = 1;
    imageSelectionTokenRef.current = {};
    setMahalla("");
    setYonalish("");
    setSana("");
    setWorks([createEmptyWork(0)]);
    setError("");
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let active = true;

    const loadOptions = async () => {
      setLoadingOptions(true);
      resetForm();

      try {
        const [neighborhoodResponse, directionResponse] = await Promise.all([
          apiRequest("/neighborhoods"),
          apiRequest("/directions"),
        ]);

        if (!active) {
          return;
        }

        setMahallalar(neighborhoodResponse.data ?? []);
        setYonalishlar(directionResponse.data ?? []);
      } catch (requestError) {
        if (active) {
          setError(getAuthErrorMessage(requestError));
        }
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, [open]);

  const addWork = () => {
    const workId = nextWorkIdRef.current;
    nextWorkIdRef.current += 1;

    setWorks((currentWorks) => [...currentWorks, createEmptyWork(workId)]);
  };

  const removeWork = (workId) => {
    delete imageSelectionTokenRef.current[workId];
    setWorks((currentWorks) => currentWorks.filter((work) => work.id !== workId));
  };

  const updateText = (workId, value) => {
    setWorks((currentWorks) =>
      currentWorks.map((work) =>
        work.id === workId
          ? {
              ...work,
              text: value,
            }
          : work
      )
    );
  };

  const updateImages = async (workId, fileList) => {
    const files = Array.from(fileList ?? []);
    const validFiles = filterValidTaskImages(files);
    const limitedFiles = validFiles.slice(0, MAX_IMAGES_PER_TASK);
    const imageMessage = hasOversizedTaskImages(files)
      ? TASK_IMAGE_SIZE_ERROR_MESSAGE
      : validFiles.length > MAX_IMAGES_PER_TASK
      ? `Har bir task uchun ${MAX_IMAGES_PER_TASK} tagacha rasm yuklash mumkin.`
      : "";
    const selectionToken = (imageSelectionTokenRef.current[workId] ?? 0) + 1;

    imageSelectionTokenRef.current[workId] = selectionToken;

    if (limitedFiles.length === 0) {
      setWorks((currentWorks) =>
        currentWorks.map((work) =>
          work.id === workId
            ? {
                ...work,
                images: [],
                imageMessage,
                imageStatusMessage: "",
                processingImages: false,
              }
            : work
        )
      );

      return;
    }

    setWorks((currentWorks) =>
      currentWorks.map((work) =>
        work.id === workId
          ? {
              ...work,
              images: [],
              imageMessage: "",
              imageStatusMessage: TASK_IMAGE_PROCESSING_MESSAGE,
              processingImages: true,
            }
          : work
      )
    );

    const { files: optimizedFiles, optimizedCount } = await optimizeTaskImages(
      limitedFiles
    );

    if (imageSelectionTokenRef.current[workId] !== selectionToken) {
      return;
    }

    setWorks((currentWorks) =>
      currentWorks.map((work) =>
        work.id === workId
          ? {
              ...work,
              images: optimizedFiles,
              imageMessage,
              imageStatusMessage:
                optimizedCount > 0 ? TASK_IMAGE_READY_MESSAGE : "",
              processingImages: false,
            }
          : work
      )
    );
  };

  const validateForm = () => {
    if (!mahalla || !yonalish || !sana) {
      return "Mahalla, yo'nalish va sana maydonlarini to'ldiring.";
    }

    const emptyWorkIndex = works.findIndex((work) => work.text.trim() === "");

    if (emptyWorkIndex !== -1) {
      return `${emptyWorkIndex + 1}-task uchun matn kiriting.`;
    }

    if (works.some((work) => work.processingImages)) {
      return TASK_IMAGE_WAIT_MESSAGE;
    }

    const invalidImagesIndex = works.findIndex(
      (work) => work.images.length > MAX_IMAGES_PER_TASK
    );

    if (invalidImagesIndex !== -1) {
      return `Har bir task uchun ${MAX_IMAGES_PER_TASK} tagacha rasm yuklash mumkin.`;
    }

    return "";
  };

  const submitData = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();

      works.forEach((work, index) => {
        formData.append(`tasks[${index}][neighborhood_id]`, mahalla);
        formData.append(`tasks[${index}][direction_id]`, yonalish);
        formData.append(`tasks[${index}][date]`, sana);
        formData.append(`tasks[${index}][text]`, work.text.trim());

        work.images.forEach((image) => {
          formData.append(`tasks[${index}][images][]`, image);
        });
      });

      await apiRequest("/tasks", {
        method: "POST",
        body: formData,
        authenticated: true,
        stopOnStatuses: [401, 422],
      });

      resetForm();
      setOpen(false);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Qilingan ishlarni kiritish</ModalHeader>

      <ModalBody>
        {error && <Alert color="danger">{error}</Alert>}

        <Form>
          <Row>
            <Col md="4">
              <FormGroup>
                <Label>Mahalla</Label>
                <Input
                  type="select"
                  value={mahalla}
                  onChange={(event) => setMahalla(event.target.value)}
                  disabled={loadingOptions || submitting}
                >
                  <option value="">Tanlang</option>

                  {mahallalar.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>

            <Col md="4">
              <FormGroup>
                <Label>Yo'nalish</Label>
                <Input
                  type="select"
                  value={yonalish}
                  onChange={(event) => setYonalish(event.target.value)}
                  disabled={loadingOptions || submitting}
                >
                  <option value="">Tanlang</option>

                  {yonalishlar.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>

            <Col md="4">
              <FormGroup>
                <Label>Sana</Label>
                <Input
                  type="date"
                  value={sana}
                  onChange={(event) => setSana(event.target.value)}
                  disabled={submitting}
                />
              </FormGroup>
            </Col>
          </Row>

          <hr />

          {works.map((item, index) => (
            <div key={item.id} className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>{index + 1}-task</strong>

                {works.length > 1 && (
                  <Button
                    type="button"
                    color="danger"
                    outline
                    size="sm"
                    onClick={() => removeWork(item.id)}
                    disabled={submitting || item.processingImages}
                  >
                    O'chirish
                  </Button>
                )}
              </div>

              <FormGroup>
                <Label>Qilingan ish</Label>
                <Input
                  type="textarea"
                  rows="3"
                  placeholder="Qilingan ishlarni yozing..."
                  value={item.text}
                  onChange={(event) => updateText(item.id, event.target.value)}
                  disabled={submitting || item.processingImages}
                />
              </FormGroup>

              <FormGroup>
                <Label>Rasmlar</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(event) => updateImages(item.id, event.target.files)}
                  disabled={submitting || item.processingImages}
                />

                <div className="small text-muted mt-2">
                  {TASK_IMAGE_AUTO_OPTIMIZE_NOTE}
                </div>

                {item.imageStatusMessage && (
                  <div className="small text-muted mt-1">
                    {item.imageStatusMessage}
                  </div>
                )}

                <div className="small text-muted mt-2">
                  {item.images.length} / {MAX_IMAGES_PER_TASK} rasm tanlandi
                </div>

                {item.images.length > 0 && (
                  <div className="small text-muted">
                    {item.images.map((image) => image.name).join(", ")}
                  </div>
                )}

                {item.imageMessage && (
                  <div className="small text-danger mt-1">{item.imageMessage}</div>
                )}
              </FormGroup>
            </div>
          ))}

          <Button
            type="button"
            color="success"
            onClick={addWork}
            disabled={submitting || loadingOptions}
          >
            + Yana ish qo'shish
          </Button>
        </Form>
      </ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={submitting}>
          Bekor qilish
        </Button>

        <Button
          color="primary"
          onClick={submitData}
          disabled={
            submitting ||
            loadingOptions ||
            works.some((work) => work.processingImages)
          }
        >
          {submitting
            ? "Yuborilmoqda..."
            : works.some((work) => work.processingImages)
            ? "Rasm tayyorlanmoqda..."
            : "Yuborish"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default WorkModal;
