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
import ImagePreviewModal from "../ImagePreviewModal/ImagePreviewModal";
import "./TaskEditModal.css";

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Zm-1 10h12l1-13H5l1 13Z"
        fill="currentColor"
      />
    </svg>
  );
}

function createFormState(task) {
  return {
    direction_id: task?.direction_id ? String(task.direction_id) : "",
    date: task?.date ?? "",
    text: task?.text ?? "",
    existingImages: task?.images ?? [],
    newImages: [],
    imageMessage: "",
    imageStatusMessage: "",
    processingImages: false,
  };
}

function TaskEditModal({
  isOpen,
  toggle,
  task,
  directionOptions = [],
  onSuccess,
  onImageDeleted,
}) {
  const imageSelectionTokenRef = useRef(0);
  const [formData, setFormData] = useState(() => createFormState(task));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingImageIds, setDeletingImageIds] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData(createFormState(task));
    setError("");
    setSubmitting(false);
    setDeletingImageIds([]);
    setPreviewImage(null);
    imageSelectionTokenRef.current = 0;
  }, [isOpen, task]);

  const updateField = (field, value) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  };

  const handleNewImagesChange = async (fileList) => {
    const files = Array.from(fileList ?? []);
    const validFiles = filterValidTaskImages(files);
    const imageMessage = hasOversizedTaskImages(files)
      ? TASK_IMAGE_SIZE_ERROR_MESSAGE
      : validFiles.length >
          Math.max(MAX_IMAGES_PER_TASK - formData.existingImages.length, 0)
      ? `Jami ${MAX_IMAGES_PER_TASK} tagacha rasm bo'lishi mumkin.`
      : "";

    const remainingSlots = Math.max(
      MAX_IMAGES_PER_TASK - formData.existingImages.length,
      0
    );
    const limitedFiles = validFiles.slice(0, remainingSlots);
    const selectionToken = imageSelectionTokenRef.current + 1;
    imageSelectionTokenRef.current = selectionToken;

    if (limitedFiles.length === 0) {
      setFormData((currentData) => ({
        ...currentData,
        newImages: [],
        imageMessage,
        imageStatusMessage: "",
        processingImages: false,
      }));

      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      newImages: [],
      imageMessage: "",
      imageStatusMessage: TASK_IMAGE_PROCESSING_MESSAGE,
      processingImages: true,
    }));

    const { files: optimizedFiles, optimizedCount } = await optimizeTaskImages(
      limitedFiles
    );

    if (imageSelectionTokenRef.current !== selectionToken) {
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      newImages: optimizedFiles,
      imageMessage,
      imageStatusMessage:
        optimizedCount > 0 ? TASK_IMAGE_READY_MESSAGE : "",
      processingImages: false,
    }));
  };

  const handleImageDelete = async (imageId) => {
    if (!task?.id || deletingImageIds.includes(imageId)) {
      return;
    }

    setDeletingImageIds((currentIds) => [...currentIds, imageId]);
    setError("");

    try {
      await apiRequest(`/task-images/${imageId}`, {
        method: "DELETE",
        authenticated: true,
        stopOnStatuses: [401, 404],
      });

      setFormData((currentData) => ({
        ...currentData,
        existingImages: currentData.existingImages.filter(
          (image) => image.id !== imageId
        ),
      }));

      onImageDeleted?.(task.id, imageId);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setDeletingImageIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== imageId)
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!task?.id) {
      return;
    }

    if (formData.processingImages) {
      setError(TASK_IMAGE_WAIT_MESSAGE);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = new FormData();
      payload.append("_method", "PUT");
      payload.append("direction_id", formData.direction_id);
      payload.append("date", formData.date);
      payload.append("text", formData.text.trim());

      formData.newImages.forEach((image) => {
        payload.append("images[]", image);
      });

      const response = await apiRequest(`/tasks/${task.id}`, {
        method: "POST",
        body: payload,
        authenticated: true,
        stopOnStatuses: [401, 422],
      });

      onSuccess?.(response.data);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Taskni tahrirlash</ModalHeader>

      <Form onSubmit={handleSubmit}>
        <ModalBody>
          {error && <Alert color="danger">{error}</Alert>}

          <Row>
            <Col md="6">
              <FormGroup>
                <Label for="task-edit-direction">Yo'nalish</Label>
                <Input
                  id="task-edit-direction"
                  type="select"
                  value={formData.direction_id}
                  onChange={(event) => updateField("direction_id", event.target.value)}
                  disabled={submitting}
                  required
                >
                  <option value="">Tanlang</option>
                  {directionOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Input>
              </FormGroup>
            </Col>

            <Col md="6">
              <FormGroup>
                <Label for="task-edit-date">Sana</Label>
                <Input
                  id="task-edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  disabled={submitting}
                  required
                />
              </FormGroup>
            </Col>
          </Row>

          <FormGroup>
            <Label for="task-edit-text">Qilingan ish</Label>
            <Input
              id="task-edit-text"
              type="textarea"
              rows="4"
              value={formData.text}
              onChange={(event) => updateField("text", event.target.value)}
              disabled={submitting}
              required
            />
          </FormGroup>

          {formData.existingImages.length > 0 && (
            <FormGroup>
              <Label>Mavjud rasmlar</Label>
              <div className="task-edit-images">
                {formData.existingImages.map((image) => (
                  <div className="task-edit-image-card" key={image.id}>
                    <button
                      type="button"
                      className="task-edit-image-preview"
                      onClick={() =>
                        setPreviewImage({
                          imageUrl: image.image_url,
                          alt: formData.text,
                        })
                      }
                    >
                      <img
                        src={image.image_url}
                        alt={formData.text}
                        className="task-edit-image"
                      />
                    </button>

                    <button
                      type="button"
                      className="task-edit-image-delete"
                      onClick={() => handleImageDelete(image.id)}
                      disabled={submitting || deletingImageIds.includes(image.id)}
                      aria-label="Rasmni o'chirish"
                      title="Rasmni o'chirish"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                ))}
              </div>
            </FormGroup>
          )}

          <FormGroup>
            <Label for="task-edit-images">Yangi rasmlar</Label>
            <Input
              id="task-edit-images"
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => handleNewImagesChange(event.target.files)}
              disabled={
                submitting ||
                formData.processingImages ||
                formData.existingImages.length >= MAX_IMAGES_PER_TASK
              }
            />

            <div className="task-edit-upload-note mt-2">
              {TASK_IMAGE_AUTO_OPTIMIZE_NOTE}
            </div>

            {formData.imageStatusMessage && (
              <div className="task-edit-upload-note">
                {formData.imageStatusMessage}
              </div>
            )}

            <div className="task-edit-upload-note mt-2">
              {formData.existingImages.length + formData.newImages.length} /{" "}
              {MAX_IMAGES_PER_TASK} rasm
            </div>

            {formData.newImages.length > 0 && (
              <div className="task-edit-upload-note">
                {formData.newImages.map((image) => image.name).join(", ")}
              </div>
            )}

            {formData.imageMessage && (
              <div className="small text-danger mt-1">{formData.imageMessage}</div>
            )}
          </FormGroup>
        </ModalBody>

        <ModalFooter>
          <Button color="secondary" onClick={toggle} disabled={submitting}>
            Bekor qilish
          </Button>

          <Button
            color="primary"
            type="submit"
            disabled={submitting || formData.processingImages}
          >
            {submitting
              ? "Saqlanmoqda..."
              : formData.processingImages
              ? "Rasm tayyorlanmoqda..."
              : "Saqlash"}
          </Button>
        </ModalFooter>
      </Form>

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        toggle={() => setPreviewImage(null)}
        imageUrl={previewImage?.imageUrl}
        alt={previewImage?.alt}
      />
    </Modal>
  );
}

export default TaskEditModal;
