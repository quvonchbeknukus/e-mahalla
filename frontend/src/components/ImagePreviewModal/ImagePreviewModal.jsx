import { Modal, ModalBody, ModalHeader } from "reactstrap";
import "./ImagePreviewModal.css";

function ImagePreviewModal({ isOpen, toggle, imageUrl, alt = "Rasm" }) {
  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      size="xl"
      centered
      contentClassName="image-preview-modal"
    >
      <ModalHeader toggle={toggle} />

      <ModalBody>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={alt}
            className="image-preview-modal__image"
          />
        )}
      </ModalBody>
    </Modal>
  );
}

export default ImagePreviewModal;
